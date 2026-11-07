"use strict";
// NINJA MOONS — no-login student questions; only verified teachers may read the shared inbox.
// A cryptographically random device key never leaves this browser except as an HTTPS RPC argument.
// The database stores only a SHA-256 hash of it. Clearing site storage loses reply access.
const $=id=>document.getElementById(id);
const node=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const ctx=()=>window.NM_STATION?.getContext?.()||{};
const ownerPortal=/\/teacher\.html$/.test(location.pathname);
let db=null,token="",mode="student",threads=[],selected=null,creating=false,ready=null,timer=null,loadInProgress=false;
const status=msg=>{const n=$("chatStatus");if(n)n.textContent=msg};
const when=date=>{try{return new Date(date).toLocaleString()}catch{return""}};
function deviceKey(){
 const key="nm-quickchat-device-v1";
 let stored=localStorage.getItem(key);
 if(!/^[0-9a-f]{64}$/.test(stored||"")){
  const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
  stored=Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");
  localStorage.setItem(key,stored);
 }
 if(localStorage.getItem(key)!==stored)throw Error("Your browser cannot save private replies. Enable site storage to use messages.");
 return stored;
}
async function client(){
 if(db)return db;
 const response=await fetch("/station/config.json",{cache:"no-store"});
 if(!response.ok)throw Error("The messaging service configuration is not available.");
 const cfg=await response.json();
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.projectUrl)||!String(cfg.publishableKey||"").startsWith("sb_publishable_"))
  throw Error("The messaging service configuration is invalid.");
 const sdk=await import("https://esm.sh/@supabase/supabase-js@2.57.0");
 db=sdk.createClient(cfg.projectUrl,cfg.publishableKey,{auth:{detectSessionInUrl:true,flowType:"pkce"}});
 return db;
}
function notice(){
 const box=$("accountBox");box.replaceChildren();
 const text=node("p","quiet",mode==="teacher"
  ?"Teacher inbox · Only verified teachers can see and answer student questions."
  :"Just type and send. No student account, name, or number. Your teacher's reply will appear on this device.");
 const button=node("button","btn subtle",mode==="teacher"?"Sign out of teacher inbox":"Teacher sign in");
 button.type="button";
 button.onclick=mode==="teacher"?teacherSignout:showTeacherLogin;
 box.append(text,button);
 if(mode==="teacher"){
  const label=node("span","quiet"," · Verified teacher access");
  box.append(label);
 }
 $("chatApp").hidden=false;
 $("newThread").hidden=mode==="teacher";
 $("inboxTitle").textContent=mode==="teacher"?"Teacher inbox":"My questions";
 $("chatText").placeholder=mode==="teacher"?"Type your reply…":"Type a question for your teacher…";
}
function showTeacherLogin(){
 const box=$("accountBox");box.replaceChildren();
 const title=node("h3","","Private teacher sign-in");
 const intro=node("p","quiet","Only the approved owner can open this inbox. Students do not enter passwords.");
 const form=node("form","login-box");
 const email=node("input"),pass=node("input");
 email.type="email";email.autocomplete="username";email.placeholder="Your verified account email";email.required=true;
 pass.type="password";pass.autocomplete="current-password";pass.placeholder="Password (optional if using email link)";
 const login=node("button","btn primary","Sign in with password");
 login.type="submit";
 const link=node("button","btn secondary","Email me a secure sign-in link");
 link.type="button";
 const back=node("button","btn subtle","Return to reading");
 back.type="button";back.onclick=()=>{if(ownerPortal)location.assign("/station/");else notice()};
 const info=node("p","quiet","A sign-in link will go to your verified email. Open it on this device.");
 form.append(title,intro,email,pass,login,link,info,back);box.append(form);
 if(ownerPortal)$("chatApp").hidden=true;
 form.onsubmit=async event=>{
  event.preventDefault();login.disabled=true;status("Checking teacher access…");info.textContent="Checking your account…";
  try{
   const s=await db.auth.signInWithPassword({email:email.value.trim(),password:pass.value});
   pass.value="";
   if(s.error)throw s.error;
   const r=await db.rpc("nm_q_teacher_read");
   if(r.error)throw Error("This account does not have teacher inbox permission.");
   mode="teacher";selected=null;creating=false;notice();await refresh();status("Teacher inbox is ready.");
  }catch(err){await db.auth.signOut().catch(()=>{});info.textContent="Unable to sign in: "+err.message}
  finally{login.disabled=false}
 };
 link.onclick=async()=>{
  const address=email.value.trim();if(!email.checkValidity()){email.reportValidity();return}
  link.disabled=true;info.textContent="Sending your secure link…";
  try{
   const r=await db.auth.signInWithOtp({email:address,options:{shouldCreateUser:false,emailRedirectTo:location.origin+"/station/teacher.html"}});
   if(r.error)throw r.error;
   info.textContent="If this email is approved, a sign-in link has been sent. Open it on this device to access the inbox.";
  }catch(err){info.textContent="Could not send sign-in link: "+err.message}
  finally{link.disabled=false}
 };
}
async function teacherSignout(){
 await db.auth.signOut();mode="student";selected=null;creating=false;if(ownerPortal){$("chatApp").hidden=true;showTeacherLogin()}else{notice();await refresh()}status("Signed out of teacher inbox.");
}
function updateBadge(){
 const tab=document.querySelector('[data-tool="teacher"]');
 if(!tab)return;
 const count=threads.filter(t=>{
  const last=t.messages?.[t.messages.length-1];
  return last&&last.sender===(mode==="teacher"?"student":"teacher");
 }).length;
 let badge=tab.querySelector(".message-count");
 if(count&&!badge){badge=node("span","message-count");tab.append(badge)}
 if(badge){badge.textContent=String(count);badge.hidden=!count}
}
function chooseThread(id){creating=false;selected=id;render();$("chatText").focus();}
function render(){
 const list=$("threadList");list.replaceChildren();
 if(!threads.length)list.append(node("p","quiet",mode==="teacher"?"No questions received yet.":"No questions yet. Type below and press Send."));
 for(const t of threads){
  const last=t.messages?.[t.messages.length-1];
  const b=node("button","thread-button"+(selected===t.id?" active":""));
  b.type="button";
  const story=String(t.story_slug||"story").replace(/-/g," ");
  b.append(node("strong","",(mode==="teacher"?"Reader question · ":"")+story));
  b.append(node("span","","Picture "+t.page_number+" · "+(last?.sender===(mode==="teacher"?"student":"teacher")?"NEW MESSAGE":last?"Conversation":"New")+" · "+when(last?.created_at||t.updated_at)));
  b.onclick=()=>chooseThread(t.id);
  list.append(b);
 }
 const t=threads.find(t=>t.id===selected);
 const box=$("chatMessages");box.replaceChildren();
 if(!t){
  const c=ctx();
  $("chatHead").textContent=mode==="teacher"?"Select a student's question."
   :"Ask a new question · "+(c.title||"Your story")+" · Picture "+(c.page||1);
 }else{
  $("chatHead").textContent=String(t.story_slug||"Story").replace(/-/g," ")+" · Picture "+t.page_number;
  for(const m of t.messages||[]){
   const mine=m.sender===(mode==="teacher"?"teacher":"student");
   const bubble=node("div","msg"+(mine?" mine":""),m.body);
   bubble.append(node("small","",(mine?"You":m.sender==="teacher"?"Teacher":"Student")+" · "+when(m.created_at)));
   box.append(bubble);
  }
 }
 box.scrollTop=box.scrollHeight;
 updateBadge();
}
async function refresh(){
 if(!db||loadInProgress)return;
 loadInProgress=true;
 try{
  const result=mode==="teacher"
   ?await db.rpc("nm_q_teacher_read")
   :await db.rpc("nm_q_read",{p_token:token});
  if(result.error)throw result.error;
  threads=Array.isArray(result.data)?result.data:[];
  if(selected&&!threads.some(t=>t.id===selected))selected=null;
  if(!selected&&!creating&&threads.length)selected=threads[0].id;
  render();
 }catch(err){status("Messages could not be loaded: "+err.message)}
 finally{loadInProgress=false}
}
function newQuestion(){
 if(mode==="teacher")return;
 selected=null;creating=true;render();$("chatText").focus();
 status("Ask anything about this story. Your reply stays private to this browser.");
}
async function send(event){
 event.preventDefault();
 const content=$("chatText").value.trim();
 if(!content)return;
 if(content.length>1000)return status("Please keep messages under 1,000 characters.");
 const button=$("sendChat");button.disabled=true;status("Sending…");
 try{
  if(mode==="teacher"){
   if(!selected)throw Error("Choose a student's question to reply to.");
   const r=await db.rpc("nm_q_teacher_reply",{p_thread:selected,p_body:content});
   if(r.error)throw r.error;
  }else{
   const c=ctx();
   if(!selected&&!c.slug)throw Error("Choose a story first.");
   const r=await db.rpc("nm_q_send",{p_token:token,p_thread:selected,p_body:content,p_story:c.slug||"zoom-trip",p_page:c.page||1});
   if(r.error)throw r.error;
   selected=r.data;creating=false;
  }
  $("chatText").value="";
  await refresh();
  status(mode==="teacher"?"Reply sent to the student's private conversation.":"Sent! Your teacher's reply will appear here automatically.");
 }catch(err){status("Not sent: "+err.message)}
 finally{button.disabled=false}
}
function init(){
 if(ready)return ready;
 ready=(async()=>{
  try{
   token=deviceKey();await client();
   $("newThread").onclick=newQuestion;
   $("chatForm").addEventListener("submit",send);
   // The owner portal automatically restores an existing verified session.
   const restoreTeacher=async()=>{
    const auth=await db.auth.getUser();
    if(!auth?.data?.user)return false;
    const allowed=await db.rpc("nm_q_teacher_read");
    if(allowed.error)return false;
    mode="teacher";selected=null;creating=false;notice();await refresh();status("Teacher inbox is ready.");return true;
   };
   const teacherReady=ownerPortal?await restoreTeacher():false;
   if(!teacherReady){
    if(ownerPortal){$("chatApp").hidden=true;showTeacherLogin()}
    else {notice();await refresh()}
   }
   db.auth.onAuthStateChange((_event,session)=>{
    if(ownerPortal&&session?.user&&mode!=="teacher")
     setTimeout(()=>restoreTeacher().catch(()=>{}),0);
   });
   timer=setInterval(()=>{if(document.visibilityState!=="hidden"&&(mode==="teacher"||!ownerPortal))refresh().catch(()=>{})},7000);
   document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&(mode==="teacher"||!ownerPortal))refresh().catch(()=>{})});
  }catch(err){$("chatApp").hidden=true;status("Messages are unavailable: "+err.message);$("accountBox").textContent="Messaging is unavailable: "+err.message}
 })();
 return ready;
}
export {init,refresh};
