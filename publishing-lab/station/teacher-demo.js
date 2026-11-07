"use strict";
// No student information is fetched from a server on this preview page.
// All sample conversations exist only in the browser session.
const STORE="nm-teacher-demo-v1";
const $=id=>document.getElementById(id);
const node=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el};
const now=()=>new Date().toISOString();
const examples=()=>[
 {id:"sample-garden",title:"Sample Reader A",story:"The Secret Garden",page:4,messages:[
  {sender:"student",body:"Why do the plants need different colored lights?",created_at:now()}
 ]},
 {id:"sample-journey",title:"Sample Reader B",story:"The Seven-Second Journey",page:3,messages:[
  {sender:"student",body:"What does buckled mean in the story?",created_at:now()}
 ]},
 {id:"sample-ocean",title:"Sample Reader C",story:"The Ocean That Glows",page:2,messages:[
  {sender:"student",body:"Could a submarine really travel under an icy ocean?",created_at:now()}
 ]}
];
function load(){
 try{
  const raw=sessionStorage.getItem(STORE);
  if(!raw)return examples();
  const parsed=JSON.parse(raw);
  if(!Array.isArray(parsed)||parsed.length<1||parsed.length>20)return examples();
  for(const t of parsed){
   if(typeof t.id!=="string"||typeof t.title!=="string"||!Array.isArray(t.messages)||t.messages.length>100)throw Error();
   if(t.messages.some(m=>!["student","teacher"].includes(m.sender)||typeof m.body!=="string"||m.body.length>1000))throw Error();
  }
  return parsed;
 }catch{return examples()}
}
let threads=load(),selected=threads[0]?.id||null,privateLoaded=false;
function save(){try{sessionStorage.setItem(STORE,JSON.stringify(threads))}catch{}}
function appendMessages(container,messages){
 container.replaceChildren();
 for(const m of messages){
  const b=node("div","demo-message"+(m.sender==="teacher"?" teacher":""),m.body);
  b.append(node("small","",m.sender==="teacher"?"Teacher replied":"Student asked"));
  container.append(b);
 }
 container.scrollTop=container.scrollHeight;
}
function render(){
 const list=$("demoThreadList");list.replaceChildren();
 const pending=threads.filter(t=>t.messages.at(-1)?.sender==="student").length;
 $("demoCount").textContent=pending?"("+pending+" awaiting reply)":"(all answered)";
 for(const t of threads){
  const button=node("button","demo-thread"+(selected===t.id?" active":""));
  button.type="button";button.append(node("strong","",t.title+" · "+t.story));
  const line=(t.messages.at(-1)?.sender==="student"?"New question":"Replied")+" · Picture "+t.page;
  button.append(node("span",t.messages.at(-1)?.sender==="student"?"new":"",line));
  button.onclick=()=>{selected=t.id;render()};
  list.append(button);
 }
 const t=threads.find(x=>x.id===selected);
 $("demoThreadTitle").textContent=t?t.title+" · "+t.story:"Choose a conversation";
 appendMessages($("demoTeacherMessages"),t?.messages||[]);
 appendMessages($("demoStudentMessages"),t?.messages||[]);
 $("demoReply").disabled=!t;$("demoStudentQuestion").disabled=!t;
 $("demoReplyStatus").textContent=t?"Reply to this sample student, then look at the Student view below.":"Choose a sample student.";
}
$("demoReplyForm").addEventListener("submit",event=>{
 event.preventDefault();
 const t=threads.find(x=>x.id===selected),body=$("demoReply").value.trim();
 if(!t||!body)return;
 t.messages.push({sender:"teacher",body:body.slice(0,1000),created_at:now()});
 $("demoReply").value="";save();render();
 $("demoReplyStatus").textContent="Demo reply delivered. The Student view below shows the same answer.";
 $("demoStudentStatus").textContent="Teacher reply received in this simulated student conversation.";
});
$("demoStudentForm").addEventListener("submit",event=>{
 event.preventDefault();
 const t=threads.find(x=>x.id===selected),body=$("demoStudentQuestion").value.trim();
 if(!t||!body)return;
 t.messages.push({sender:"student",body:body.slice(0,1000),created_at:now()});
 $("demoStudentQuestion").value="";save();render();
 $("demoStudentStatus").textContent="Demo student question appears in the teacher inbox above.";
 $("demoReplyStatus").textContent="New simulated student question received — type your reply.";
});
$("resetDemo").onclick=()=>{threads=examples();selected=threads[0].id;save();render();$("demoReplyStatus").textContent="Sample questions restored."};
$("openRealInbox").onclick=async()=>{
 $("demoInbox").hidden=true;$("privateInbox").hidden=false;
 $("showDemo").hidden=false;$("openRealInbox").hidden=true;$("resetDemo").hidden=true;
 $("demoIndicator").textContent="PRIVATE INBOX · SIGN-IN REQUIRED";
 if(privateLoaded)return;
 privateLoaded=true;
 try{
  const {init}=await import("/station/quickchat.js");
  await init();
 }catch(error){
  $("accountBox").textContent="Private inbox could not load: "+error.message;
 }
};
$("showDemo").onclick=()=>{
 $("privateInbox").hidden=true;$("demoInbox").hidden=false;
 $("showDemo").hidden=true;$("openRealInbox").hidden=false;$("resetDemo").hidden=false;
 $("demoIndicator").textContent="INTERACTIVE DEMO · NO LOGIN";
};
render();
