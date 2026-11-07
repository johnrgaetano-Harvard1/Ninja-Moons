"use strict";
// Real cross-device TEST room only. Real student messages are never read here.
const el=id=>document.getElementById(id);
const make=(tag,cls,body)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(body!==undefined)e.textContent=body;return e};
const STORAGE="nm-live-test-owner-v1";
const params=new URLSearchParams(location.search);
// The dedicated teacher test defaults to the same published test channel as ?test=live.
const fixedLive=params.get("test")==="live"||(!params.has("testroom")&&!params.has("teacherkey"));
const FIXED_ROOM="197d9609-c01a-46b7-af7a-ecb6efd14bed";
// A paired teacher link always takes priority over an unrelated room saved in this browser.
const linkParams=new URLSearchParams(location.search);
function pairedRoom(){
 const id=linkParams.get("testroom")||"";
 const teacherKey=linkParams.get("teacherkey")||"";
 const studentKey=linkParams.get("studentkey")||"";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id) ||
  !/^[0-9a-f]{64}$/.test(teacherKey)||!/^[0-9a-f]{64}$/.test(studentKey))return null;
 return {id,teacherKey,studentKey,created:Date.now(),paired:true};
}
let db=null,room=null,busy=false,refreshTimer=null,privateLoaded=false;
const setStatus=value=>{el("liveStatus").textContent=value};
function key(){
 const a=new Uint8Array(32);crypto.getRandomValues(a);
 return Array.from(a,b=>b.toString(16).padStart(2,"0")).join("");
}
function recover(){
 try{
  const p=JSON.parse(localStorage.getItem(STORAGE)||"null");
  if(p&&/^[0-9a-f-]{36}$/.test(p.id||"")&&/^[0-9a-f]{64}$/.test(p.teacherKey||"")
    &&/^[0-9a-f]{64}$/.test(p.studentKey||"")&&Date.now()-p.created<13600000)return p;
 }catch(_error){}
 return null;
}
async function client(){
 if(fixedLive){
  // Same-origin test API avoids remote SDK loading on television and school browsers.
  db={rpc:async(name,args)=>{
   try{
    if(name!=="nm_live_demo_add"&&name!=="nm_live_demo_read")
     throw Error("Unknown test request.");
    const isRead=name==="nm_live_demo_read";
    const res=await fetch("/api/live-chat"+(isRead?"?role=teacher":""),isRead?{cache:"no-store"}:{
     method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({role:"teacher",message:args.p_body,story:args.p_story,page:args.p_page})
    });
    const body=await res.json().catch(()=>({}));
    if(!res.ok)return{data:null,error:{message:body.message||"Could not reach the classroom test."}};
    return{data:isRead?{messages:body.messages||[]}:body.sent,error:null};
   }catch(err){return{data:null,error:{message:err.message||"Test connection error."}}}
  }};
  return;
 }
 const r=await fetch("/station/config.json",{cache:"no-store"});
 if(!r.ok)throw Error("Classroom database settings are unavailable.");
 const cfg=await r.json();
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.projectUrl)||!String(cfg.publishableKey||"").startsWith("sb_publishable_"))
  throw Error("Classroom settings are invalid.");
 const sdk=await import("https://esm.sh/@supabase/supabase-js@2.57.0");
 db=sdk.createClient(cfg.projectUrl,cfg.publishableKey,{auth:{detectSessionInUrl:false}});
}
function storyLink(){
 if(fixedLive)return new URL("/station/?story=seven-second-journey-grade-1&tool=teacher&test=live",location.origin).href;
 const url=new URL("/station/",location.origin);
 for(const [k,v] of Object.entries({story:"seven-second-journey-grade-1",tool:"teacher",testroom:room.id,studentkey:room.studentKey}))
  url.searchParams.set(k,v);
 return url.href;
}
function showLink(){
 const url=storyLink();el("studentLiveLink").href=url;el("liveLinkText").value=url;
 el("liveBadge").textContent="LIVE TEST · CONNECTED";
}
async function ensureRoom(force=false){
 if(!db)throw Error("Test connection is not initialized.");
 if(fixedLive){
  room={id:FIXED_ROOM,teacherKey:"",studentKey:"",created:Date.now()};
  showLink();
  el("newLiveRoom").hidden=true;
  return;
 }
 const fixed=force?null:pairedRoom();
 if(fixed){
  room=fixed;
  // Do not cache access tokens from a one-time teacher URL.
  showLink();return;
 }
 const old=force?null:recover();
 if(old){room=old;showLink();return}
 setStatus("Creating your private test room…");
 const teacherKey=key(),studentKey=key();
 const r=await db.rpc("nm_live_demo_create",{p_teacher_key:teacherKey,p_student_key:studentKey});
 if(r.error)throw r.error;
 if(typeof r.data!=="string"||!r.data.includes("-"))throw Error("Could not create test room.");
 room={id:r.data,teacherKey,studentKey,created:Date.now()};
 try{localStorage.setItem(STORAGE,JSON.stringify(room))}catch(_error){}
 showLink();
}
function render(messages){
 const box=el("liveMessages");box.replaceChildren();
 if(!messages.length)box.append(make("p","quiet","No student questions yet. Open the paired story link, choose Ask Teacher, and send a question."));
 for(const m of messages){
  const bubble=make("div","live-bubble"+(m.sender==="teacher"?" teacher":""),
   String(m.body||""));
  bubble.append(make("small","",
   m.sender==="teacher"?"Teacher · Your reply":
   "Student · "+String(m.story_slug||"story").replace(/-/g," ")+" · Page "+(m.page_number||1)));
  box.append(bubble);
 }
 box.scrollTop=box.scrollHeight;
 el("liveReplyBtn").disabled=messages.length===0;
}
async function refresh(){
 if(!db||!room||busy)return;
 busy=true;
 try{
  const r=await db.rpc("nm_live_demo_read",{p_room:room.id,p_key:room.teacherKey,p_role:"teacher"});
  if(r.error)throw r.error;
  const messages=Array.isArray(r.data?.messages)?r.data.messages:[];
  render(messages);
  setStatus(messages.length
   ?"Live and connected · "+messages.length+" message"+(messages.length===1?"":"s")+" · Checking every 3 seconds."
   :"Live and connected · No questions yet. Send one from the student story and it will appear here.");
 }catch(err){setStatus("Live test error: "+err.message)}
 finally{busy=false}
}
el("liveReplyForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const value=el("liveReplyText").value.trim();
 if(!value||!room||!db)return;
 el("liveReplyBtn").disabled=true;el("liveReplyStatus").textContent="Sending reply…";
 try{
  const r=await db.rpc("nm_live_demo_add",{
   p_room:room.id,p_key:room.teacherKey,p_role:"teacher",
   p_body:value,p_story:"seven-second-journey-grade-1",p_page:1
  });
  if(r.error)throw r.error;
  el("liveReplyText").value="";
  el("liveReplyStatus").textContent="Reply sent. The student's story screen will show it automatically.";
  await refresh();
 }catch(err){el("liveReplyStatus").textContent="Reply failed: "+err.message}
 finally{el("liveReplyBtn").disabled=false}
});
el("copyLiveLink").onclick=async()=>{
 if(!room)return;
 try{
  await navigator.clipboard.writeText(storyLink());
  setStatus("Student link copied. Open it on the second screen.");
 }catch(_err){
  el("liveLinkText").focus();el("liveLinkText").select();
  setStatus("Select and copy the highlighted student link.");
 }
};
el("newLiveRoom").onclick=async()=>{
 el("newLiveRoom").disabled=true;
 // A freshly generated room must not silently revert to the URL-paired test on reload.
 if(pairedRoom())history.replaceState(null,"",location.pathname);
 try{await ensureRoom(true);render([]);await refresh();el("liveReplyStatus").textContent="New session ready. Use the new student story link."}
 catch(err){setStatus("Could not start new test: "+err.message)}
 finally{el("newLiveRoom").disabled=false}
};
el("openRealInbox").addEventListener("click",()=>{el("liveTestInbox").hidden=true});
el("showDemo").addEventListener("click",()=>{
 el("liveTestInbox").hidden=false;
 el("demoInbox").hidden=true;
 el("resetDemo").hidden=true;
 refresh().catch(()=>{});
});
async function init(){
 el("demoInbox").hidden=true;
 el("resetDemo").hidden=true;
 try{await client();await ensureRoom();await refresh()}
 catch(err){el("liveBadge").textContent="TEST CONNECTION ERROR";setStatus("Unable to connect: "+err.message)}
 refreshTimer=setInterval(()=>{if(document.visibilityState!=="hidden")refresh().catch(()=>{})},3000);
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh().catch(()=>{})});
}
init();
