
"use strict";
// NINJA MOONS — authenticated classroom inbox and teacher progress monitor.
// School authorization and consent are enforced again by Supabase RLS.
let client=null,user=null,profile=null,studentId=null,classroomId=null,threads=[],activeThread=null,poll=null,initializing=null,studentAliases=new Map(),messageList=[];
const $=id=>document.getElementById(id);
const el=(tag,cl,txt)=>{const e=document.createElement(tag);if(cl)e.className=cl;if(txt!==undefined)e.textContent=txt;return e};
const readText=(id,value)=>{const e=$(id);if(e)e.textContent=value};
const isTeacher=()=>profile?.is_active&&profile?.role==="teacher";
const isStudent=()=>profile?.is_active&&profile?.role==="student"&&!!studentId&&!!classroomId;
const safeTime=t=>{try{return new Date(t).toLocaleString()}catch{return""}};
const currentContext=()=>window.NM_STATION?.getContext?.()||{};
function showMessage(t){readText("chatStatus",t)}
async function getClient(){
 if(client)return client;
 const cfg=await fetch("/station/config.json",{cache:"no-store"}).then(r=>r.json());
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.projectUrl)||!String(cfg.publishableKey).startsWith("sb_publishable_"))throw Error("The learning database configuration is not valid.");
 const sdk=await import("https://esm.sh/@supabase/supabase-js@2.57.0");
 client=sdk.createClient(cfg.projectUrl,cfg.publishableKey,{auth:{detectSessionInUrl:false}});
 return client;
}
function loginUI(message){
 const root=$("accountBox");root.replaceChildren();$("chatApp").hidden=true;
 const box=el("div","login-box"),title=el("h4","","Sign in to your school account");
 box.append(title,el("p","quiet","Only activated classroom accounts can send private messages. Student questions are not public."));
 const form=el("form");form.autocomplete="on";
 const emailLabel=el("label","","School account email"),email=el("input"),passLabel=el("label","","Password"),password=el("input");
 email.type="email";email.required=true;email.autocomplete="username";
 password.type="password";password.required=true;password.autocomplete="current-password";
 emailLabel.append(email);passLabel.append(password);
 const btn=el("button","btn primary","Sign in");btn.type="submit";
 const status=el("p","quiet",message||"");
 form.append(emailLabel,passLabel,btn,status);
 form.onsubmit=async event=>{
  event.preventDefault();btn.disabled=true;status.textContent="Checking your school account…";
  try{const r=await client.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(r.error)throw r.error;password.value="";await refresh();}
  catch(err){status.textContent="Sign-in unavailable: "+err.message}finally{btn.disabled=false}
 };
 box.append(form);root.append(box);
}
async function identities(){
 const r=await client.auth.getUser();user=r?.data?.user||null;profile=null;studentId=null;classroomId=null;
 if(!user)return;
 const pr=await client.from("profiles").select("id,display_name,role,is_active").eq("id",user.id).maybeSingle();
 if(pr.error)throw pr.error;profile=pr.data;
 if(!profile?.is_active)return;
 if(profile.role==="student"){
  const l=await client.from("student_user_links").select("student_id").eq("user_id",user.id).eq("is_active",true).limit(1);
  if(l.error)throw l.error;studentId=l.data?.[0]?.student_id||null;
  if(studentId){
   const st=await client.from("student_profiles").select("id,is_active,consent_status,is_synthetic_test").eq("id",studentId).maybeSingle();
   if(st.error)throw st.error;
   if(!st.data?.is_active||(!st.data?.is_synthetic_test&&st.data?.consent_status!=="approved")){studentId=null;return}
   const e=await client.from("classroom_enrollments").select("classroom_id").eq("student_id",studentId).eq("is_active",true).limit(1);
   if(e.error)throw e.error;classroomId=e.data?.[0]?.classroom_id||null;
  }
 }
}
function loggedInUI(){
 const root=$("accountBox");root.replaceChildren();
 const header=el("div","context-strip", "Signed in: "+(profile?.display_name||user.email||"School account")+" · "+(profile?.role||"unassigned"));
 const signout=el("button","btn subtle","Sign out");signout.onclick=async()=>{await client.auth.signOut();await refresh()};
 root.append(header,signout);
 if(!profile?.is_active)root.append(el("p","quiet","This school account is not activated. Ask the school administrator to verify the account."));
 else if(profile.role==="student"&&!isStudent())root.append(el("p","quiet","Your student profile, required consent, or classroom enrollment is not approved yet. Questions cannot be sent."));
 else if(!isStudent()&&!isTeacher())root.append(el("p","quiet","This account has no student or teacher messaging permission."));
 $("chatApp").hidden=!(isStudent()||isTeacher());
 $("newThread").hidden=!isStudent();
 readText("inboxTitle",isTeacher()?"Classroom inbox":"My questions");
 if(isTeacher())$("chatText").placeholder="Type your reply to the student…";
 else $("chatText").placeholder="Type a question to your teacher…";
}
async function aliases(){
 studentAliases=new Map();
 const ids=[...new Set(threads.map(t=>t.student_id))];if(!ids.length)return;
 const q=await client.from("student_profiles").select("id,display_alias").in("id",ids);
 if(!q.error)for(const p of q.data||[])studentAliases.set(p.id,p.display_alias);
}
async function loadThreads(){
 if(!client||!(isStudent()||isTeacher()))return;
 const q=await client.from("nm_teacher_threads").select("id,student_id,classroom_id,story_slug,page_number,created_at,created_by,status").order("created_at",{ascending:false}).limit(100);
 if(q.error)throw q.error;threads=q.data||[];
 await aliases();renderThreads();
 if(activeThread&&!threads.some(t=>t.id===activeThread))activeThread=null;
 if(!activeThread&&threads.length)activeThread=threads[0].id;
 await loadMessages();
}
function renderThreads(){
 const box=$("threadList");box.replaceChildren();
 if(!threads.length){box.append(el("p","quiet",isTeacher()?"No student questions yet.":"No questions yet. Tap Ask a new question."));return;}
 for(const t of threads){
  const label=(studentAliases.get(t.student_id)||"Student")+" · "+t.story_slug.replace(/-/g," ");
  const b=el("button","thread-button"+(activeThread===t.id?" active":""),""),strong=el("strong","",isTeacher()?label:t.story_slug.replace(/-/g," "));
  b.type="button";b.append(strong,el("span","", "Picture "+t.page_number+" · "+safeTime(t.created_at)));b.onclick=async()=>{activeThread=t.id;renderThreads();await loadMessages()};
  box.append(b);
 }
}
async function loadMessages(){
 const box=$("chatMessages");box.replaceChildren();messageList=[];
 const t=threads.find(x=>x.id===activeThread);
 if(!t){readText("chatHead","Choose a question, or start a new one.");return;}
 readText("chatHead",(studentAliases.get(t.student_id)||"Student")+" · "+t.story_slug.replace(/-/g," ")+" · Picture "+t.page_number);
 const r=await client.from("nm_teacher_messages").select("id,thread_id,sender_user_id,body,created_at").eq("thread_id",t.id).order("created_at",{ascending:true}).limit(200);
 if(r.error){showMessage("Messages could not be loaded: "+r.error.message);return}
 messageList=r.data||[];
 for(const msg of messageList){
  const mine=msg.sender_user_id===user.id;
  const bubble=el("div","msg"+(mine?" mine":""),msg.body),meta=el("small","",(mine?"You":isTeacher()?"Student":"Teacher")+" · "+safeTime(msg.created_at));
  bubble.append(meta);box.append(bubble);
 }
 box.scrollTop=box.scrollHeight;
}
async function newQuestion(){
 const c=window.NM_STATION?.getContext?.()||{};
 if(!c.slug||!isStudent())return showMessage("Choose a story and sign in with an approved student account.");
 const q=await client.from("nm_teacher_threads").insert({
  classroom_id:classroomId,student_id:studentId,created_by:user.id,
  story_slug:c.slug,page_number:c.page||1
 }).select("id").single();
 if(q.error)return showMessage("Could not create the question: "+q.error.message);
 activeThread=q.data.id;await loadThreads();$("chatText").focus();
}
async function sendMessage(event){
 event.preventDefault();
 const content=$("chatText").value.trim();
 if(!content)return;
 if(content.length>1000)return showMessage("Please limit the message to 1,000 characters.");
 if(!activeThread){if(!isStudent())return showMessage("Select a student's question first.");await newQuestion();if(!activeThread)return;}
 const button=$("sendChat");button.disabled=true;showMessage("Sending…");
 try{
  const r=await client.from("nm_teacher_messages").insert({thread_id:activeThread,sender_user_id:user.id,body:content});
  if(r.error)throw r.error;
  $("chatText").value="";showMessage("Sent privately to the classroom.");
  await loadMessages();
 }catch(e){showMessage("Not sent: "+e.message)}finally{button.disabled=false}
}
async function renderMonitor(){
 const card=$("teacherMonitor");card.hidden=!isTeacher();
 const box=$("teacherEvents");box.replaceChildren();
 if(!isTeacher())return;
 const q=await client.from("reading_events").select("student_id,story_slug,event_type,sentence_number,helper_stage,created_at").order("created_at",{ascending:false}).limit(60);
 if(q.error){box.append(el("p","quiet","Activity unavailable: "+q.error.message));return;}
 const events=q.data||[];
 if(!events.length){box.append(el("p","quiet","No classroom reading activity yet."));return;}
 const ids=[...new Set(events.map(e=>e.student_id))],p=await client.from("student_profiles").select("id,display_alias").in("id",ids);
 const map=new Map((p.data||[]).map(x=>[x.id,x.display_alias]));
 for(const item of events){
  const name=map.get(item.student_id)||"Student";
  const row=el("div","event-row");row.append(el("strong","",name+" · "+item.story_slug.replace(/-/g," ")));
  row.append(el("p","",item.event_type.replace(/_/g," ")+" · Sentence "+(item.sentence_number||"—")+" · Stage "+(item.helper_stage||"—")+" · "+safeTime(item.created_at)));
  box.append(row);
 }
}
let lastEvent=0;
async function recordReading(data){
 if(!isStudent()||!studentId||!client)return;
 const eventType=String(data?.event_type||"");
 if(!["story_open","sentence_read","word_tap","helper_step","question_view"].includes(eventType))return;
 const now=Date.now();if(now-lastEvent<1200&&eventType!=="question_view")return;lastEvent=now;
 const c=window.NM_STATION?.getContext?.()||{},story=window.NM_STATION?.getStory?.(),pg=window.NM_STATION?.getPage?.()||0;
 if(!story||!c.slug)return;
 const abs=story.pages.slice(0,pg).reduce((s,p)=>s+p.lines.length,0)+(c.sentence||1);
 const row={client_event_id:crypto.randomUUID(),student_id:studentId,actor_user_id:user.id,story_slug:c.slug,event_type:eventType,sentence_number:abs,helper_stage:c.stage||1};
 const result=await client.from("reading_events").insert(row);
 if(result.error)console.warn("Progress event was not saved",result.error.message);
 if(eventType==="question_view"&&data.question_id){
  await client.from("quiz_attempts").insert({client_event_id:crypto.randomUUID(),student_id:studentId,actor_user_id:user.id,story_slug:c.slug,question_id:data.question_id,answer_choice:data.answer_choice||"A"});
 }
}
function startPolling(){
 if(poll)clearInterval(poll);
 poll=setInterval(async()=>{
  if(!user||!profile?.is_active)return;
  if(!$("chatApp").hidden&&!document.querySelector('[data-panel="teacher"]').hidden)await loadThreads().catch(()=>{});
  if(isTeacher()&&!document.querySelector('[data-panel="progress"]').hidden)await renderMonitor().catch(()=>{});
 },8000);
}
async function refresh(){
 if(!client)return;
 try{
  await identities();
  if(!user){loginUI();return}
  loggedInUI();
  if(isStudent()||isTeacher())await loadThreads();
  if(isTeacher())await renderMonitor();
  startPolling();
 }catch(e){readText("accountBox","Classroom tools are unavailable: "+e.message);$("chatApp").hidden=true}
}
async function init(){
 if(initializing)return initializing;
 initializing=(async()=>{
  await getClient();
  $("newThread").onclick=newQuestion;
  $("chatForm").addEventListener("submit",sendMessage);
  window.addEventListener("nm:reading-event",e=>{recordReading(e.detail).catch(()=>{})});
  client.auth.onAuthStateChange(()=>{setTimeout(()=>refresh().catch(()=>{}),100)});
  await refresh();
 })();
 return initializing;
}
export {init,refresh,renderMonitor};
