"use strict";
// Live student test is intentionally independent of the normal teacher chat,
// Supabase client and any external module imports. It uses the same-origin API.
(function(){
 const qs=new URLSearchParams(location.search);
 if(qs.get("test")!=="live")return;
 document.documentElement.classList.add("live-student-mode");
 const $=id=>document.getElementById(id);
 const wrap=$("liveStudentTester");
 if(!wrap)return;
 wrap.hidden=false;
 const status=$("liveStudentStatus"),connection=$("liveStudentConnection"),list=$("liveStudentMessages");
 const button=$("liveStudentSend"),field=$("liveStudentText");
 let reading=false,lastCount=-1;
 const speak=(value)=>{status.textContent=value};
 function showMessages(messages){
  list.replaceChildren();
  if(!messages.length){
   const hint=document.createElement("p");
   hint.textContent="No questions yet. Send one above to begin.";
   list.append(hint);
  }
  for(const msg of messages){
   const bubble=document.createElement("div");
   bubble.className="live-student-bubble"+(msg.sender==="teacher"?" teacher":"");
   bubble.textContent=String(msg.body||"");
   const label=document.createElement("small");
   label.textContent=msg.sender==="teacher"?"Teacher's reply":"Your question";
   bubble.append(label);list.append(bubble);
  }
  if(messages.length>lastCount){list.scrollTop=list.scrollHeight;lastCount=messages.length}
 }
 async function refresh(){
  if(reading)return;
  reading=true;
  try{
   const res=await fetch("/api/live-chat?role=student",{cache:"no-store",credentials:"same-origin"});
   const data=await res.json().catch(()=>({}));
   if(!res.ok||!data.connected)throw Error(data.message||"Cannot reach teacher test.");
   connection.textContent="CONNECTED TO TEACHER";
   const messages=Array.isArray(data.messages)?data.messages:[];
   showMessages(messages);
   // Do not hide a useful send-confirmation underneath a frequent poll.
   if(!status.textContent.includes("Delivered"))speak("Connected. Type a question and press Send Question to Teacher.");
  }catch(err){
   connection.textContent="NOT CONNECTED";
   speak("Connection problem: "+err.message);
  }finally{reading=false}
 }
 $("liveStudentForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const message=field.value.trim();
  if(!message)return;
  button.disabled=true;button.textContent="Sending…";speak("Sending your question to the teacher…");
  try{
   // The active story context comes directly from the same page as the question.
   const context=window.NM_STATION?.getContext?.()||{};
   const res=await fetch("/api/live-chat",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({role:"student",message,story:context.slug||"seven-second-journey-grade-1",page:Number(context.page)||1})
   });
   const data=await res.json().catch(()=>({}));
   if(!res.ok||data.sent!==true)throw Error(data.message||"The server did not accept your question.");
   field.value="";
   await refresh();
   speak("Delivered to the Teacher Inbox! Look at Step 2 on the teacher screen.");
  }catch(err){
   speak("NOT SENT: "+err.message+" Your question is still in the text box. Try again.");
  }finally{
   button.disabled=false;button.textContent="Send Question to Teacher";
  }
 });
 refresh().catch(()=>{});
 setInterval(()=>{if(document.visibilityState!=="hidden")refresh().catch(()=>{})},3000);
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh().catch(()=>{})});
})();
