
(()=>{
"use strict";
const path=location.pathname;
const role=/teacher(?:\.html)?\/?$/.test(path)?"teacher":/(student|reader)(?:\.html)?\/?$/.test(path)?"reader":"home";
const page=document.getElementById(role);
if(page)page.classList.remove("hidden");
if(role==="home")return;
const ROOM_PEER_ID="ninja-moons-adult-classroom-demo-f4b1e2c9a76";
const peerConfig={host:"0.peerjs.com",port:443,path:"/",secure:true,config:{iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]}};
const sentences=["The spaceship traveled among the stars.","The explorers saw a beautiful new moon.","A small garden grew inside the space station.","Everyone was excited to learn something new.","The observatory displayed a wonderful view of space."];
const $=id=>document.getElementById(id);
let teacherPeer=null,teacherRunning=false,teacherSession=0,readers=new Map(),readerSequence=0,selectedId=null,activeCall=null,activeSource=null,audioContext=null,outputGain=null,muted=false,staleTimer=null;
let readerPeer=null,readerRunning=false,readerSession=0,microphone=null,teacherLink=null,readerCall=null,connectTimer=null,pingTimer=null,connectPending=false,readerSelected=false,sentenceIndex=0,readerLabel="Reader";
function status(who,title,description,tone=""){
 $(who+"Status").textContent=title;$(who+"Description").textContent=description;$(who+"Light").className="light "+tone;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function setTeacherUI(running){
 $("startTeacher").classList.toggle("hidden",running);
 $("stopTeacher").classList.toggle("hidden",!running);
 $("readerPanel").classList.toggle("hidden",!running);
 $("selectedPanel").classList.toggle("hidden",!running);
}
function renderReaders(){
 $("count").textContent=readers.size;
 const list=$("readerList");list.innerHTML="";
 if(!readers.size){list.innerHTML='<div class="empty">No readers online yet.<p>Have another adult open the Reader page on a second device and tap Start Microphone.</p></div>';return;}
 for(const [id,r] of readers){
   const card=document.createElement("div");card.className="readerCard"+(selectedId===id?" selected":"");
   const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent=selectedId===id?"🎧":"🎤";
   const info=document.createElement("div");info.className="readerInfo";
   const strong=document.createElement("strong");strong.textContent=r.label;
   const position=document.createElement("p");position.textContent=r.sentence||"Mic ready · waiting";info.append(strong,position);
   const button=document.createElement("button");button.type="button";button.textContent=selectedId===id?"Stop":"Listen";
   button.addEventListener("click",()=>selectReader(id));
   card.append(avatar,info,button);list.appendChild(card);
 }
}
function closeSelected(){
 const old=selectedId;selectedId=null;
 if(old&&readers.has(old)){try{readers.get(old).link.send({type:"stop-audio"});}catch(e){}}
 if(activeCall){try{activeCall.close();}catch(e){}activeCall=null;}
 if(activeSource){try{activeSource.disconnect();}catch(e){}activeSource=null;}
 $("listeningTo").textContent="Nobody selected";
 $("selectedSentence").textContent="Tap Listen beside any reader.";
 $("muteBtn").classList.add("hidden");$("resumeSound").classList.add("hidden");
 renderReaders();
}
async function selectReader(id){
 if(!teacherRunning||!readers.has(id))return;
 if(selectedId===id){closeSelected();return;}
 closeSelected();
 selectedId=id;
 const r=readers.get(id);
 $("listeningTo").textContent="Connecting "+r.label+"…";
 $("selectedSentence").textContent=r.sentence||"Waiting for a sentence update.";
 $("muteBtn").classList.remove("hidden");
 try{if(audioContext&&audioContext.state!=="running")await audioContext.resume();}catch(e){}
 try{r.link.send({type:"start-audio"});}catch(e){closeSelected();status("teacher","Reader connection lost","Try another reader.","error");return;}
 renderReaders();
}
function addReader(link){
 if(!teacherRunning){try{link.close()}catch(e){}return;}
 if(readers.has(link.peer)){try{readers.get(link.peer).link.close()}catch(e){}readers.delete(link.peer);}
 if(readers.size>=30){link.send({type:"full"});link.close();return;}
 readerSequence++;
 const label="Reader "+String(readerSequence).padStart(2,"0");
 const reader={link,label,sentence:"Mic ready · not being listened to",lastSeen:Date.now()};
 readers.set(link.peer,reader);renderReaders();
 try{link.send({type:"welcome",label});}catch(e){}
 link.on("data",msg=>{
   if(!teacherRunning||readers.get(link.peer)!==reader)return;
   reader.lastSeen=Date.now();
   if(msg&&msg.type==="sentence"&&typeof msg.text==="string"){
     reader.sentence=msg.text.slice(0,250);
     if(selectedId===link.peer)$("selectedSentence").textContent=reader.sentence;
     renderReaders();
   }
 });
 link.on("close",()=>removeReader(link.peer,reader));
 link.on("error",()=>removeReader(link.peer,reader));
}
function removeReader(id,record){
 if(readers.get(id)!==record)return;
 if(selectedId===id)closeSelected();
 readers.delete(id);renderReaders();
}
function teacherMediaCall(call){
 if(!teacherRunning||!readers.has(call.peer)||selectedId!==call.peer){call.close();return;}
 if(activeCall){try{activeCall.close()}catch(e){}}
 activeCall=call;
 call.on("stream",async stream=>{
   if(call!==activeCall||selectedId!==call.peer){call.close();return;}
   try{
     if(activeSource){try{activeSource.disconnect()}catch(e){}}
     activeSource=audioContext.createMediaStreamSource(stream);
     activeSource.connect(outputGain);
     await audioContext.resume();
     $("listeningTo").textContent="LIVE · "+readers.get(call.peer).label;
     if(audioContext.state!=="running")$("resumeSound").classList.remove("hidden");
   }catch(e){$("resumeSound").classList.remove("hidden");$("listeningTo").textContent="Audio connected · tap Enable Sound";}
 });
 call.on("close",()=>{
   if(call!==activeCall)return;
   activeCall=null;
   if(activeSource){try{activeSource.disconnect()}catch(e){}activeSource=null;}
   if(selectedId&&readers.has(selectedId))$("listeningTo").textContent="Disconnected · tap Stop then Listen";
 });
 call.on("error",()=>{if(call===activeCall)$("listeningTo").textContent="Audio connection failed · try again";});
 call.answer();
}
async function startTeacher(){
 if(teacherRunning)return;
 teacherRunning=true;const token=++teacherSession;setTeacherUI(true);
 status("teacher","Starting classroom monitor…","Connecting to audio signaling.","wait");
 try{
   if(typeof Peer!=="function")throw Error("Audio library did not load; check your connection.");
   audioContext=new (window.AudioContext||window.webkitAudioContext)();
   outputGain=audioContext.createGain();outputGain.gain.value=1;outputGain.connect(audioContext.destination);
   await audioContext.resume();
   if(token!==teacherSession||!teacherRunning)return;
   teacherPeer=new Peer(ROOM_PEER_ID,peerConfig);
   teacherPeer.on("open",()=>{
     if(token!==teacherSession||!teacherRunning)return;
     status("teacher","Ready for readers","Other adults can now tap Start Microphone on their devices.","wait");
   });
   teacherPeer.on("connection",link=>{
     if(!teacherRunning){link.close();return;}
     link.on("open",()=>addReader(link));
   });
   teacherPeer.on("call",teacherMediaCall);
   teacherPeer.on("error",err=>{
     if(!teacherRunning)return;
     const detail=err?.type==="unavailable-id"?"Another teacher dashboard is active in this demo room. Close that teacher tab first.":err?.message||"Check Wi-Fi and restart the monitor.";
     status("teacher","Connection issue",detail,"error");
   });
   teacherPeer.on("disconnected",()=>{if(teacherRunning){status("teacher","Reconnecting…","The signaling connection was interrupted.","wait");try{teacherPeer.reconnect()}catch(e){}}});
   staleTimer=setInterval(()=>{for(const [id,r] of readers){if(Date.now()-r.lastSeen>27000){try{r.link.close()}catch(e){}removeReader(id,r);}}},8000);
 }catch(e){
   stopTeacher(false);status("teacher","Could not start",e?.message||"Check browser compatibility.","error");
 }
}
function stopTeacher(reset=true){
 teacherRunning=false;teacherSession++;
 closeSelected();if(staleTimer)clearInterval(staleTimer);staleTimer=null;
 for(const r of readers.values()){try{r.link.close()}catch(e){}}
 readers.clear();renderReaders();
 try{teacherPeer?.destroy()}catch(e){}teacherPeer=null;
 try{audioContext?.close()}catch(e){}audioContext=null;outputGain=null;
 setTeacherUI(false);
 if(reset)status("teacher","Monitoring stopped","Tap Start Monitoring to reconnect.");
}
$("startTeacher")?.addEventListener("click",startTeacher);
$("stopTeacher")?.addEventListener("click",()=>stopTeacher());
$("muteBtn")?.addEventListener("click",()=>{
 muted=!muted;if(outputGain)outputGain.gain.value=muted?0:1;
 $("muteBtn").textContent=muted?"🔊 Unmute Audio":"🔇 Mute Audio";
});
$("resumeSound")?.addEventListener("click",async()=>{try{await audioContext?.resume();if(audioContext?.state==="running")$("resumeSound").classList.add("hidden");}catch(e){}});
function sendSentence(){if(teacherLink?.open)try{teacherLink.send({type:"sentence",text:sentences[sentenceIndex]});}catch(e){}}
function stopReaderAudio(notify=true){
 readerSelected=false;
 if(readerCall){try{readerCall.close()}catch(e){}readerCall=null;}
 if(notify&&readerRunning){
  status("reader",teacherLink?.open?"Microphone ready":"Waiting for teacher",teacherLink?.open?"Teacher is not currently listening.":"Your microphone is ready. Connecting to teacher.","wait");
 }
}
function connectReader(){
 if(!readerRunning||!readerPeer?.open||connectPending||teacherLink?.open)return;
 connectPending=true;
 let c;
 try{c=readerPeer.connect(ROOM_PEER_ID,{reliable:true});}catch(e){connectPending=false;return;}
 teacherLink=c;
 const deadline=setTimeout(()=>{if(!c.open){try{c.close()}catch(e){}connectPending=false;}},6500);
 c.on("open",()=>{
   clearTimeout(deadline);connectPending=false;
   if(!readerRunning){c.close();return;}
   status("reader","Connected to classroom","Your microphone is ready. The teacher can select you.","wait");
   try{c.send({type:"hello"});}catch(e){}
   sendSentence();
 });
 c.on("data",msg=>{
   if(!readerRunning||!msg||typeof msg!=="object")return;
   if(msg.type==="welcome"){
     readerLabel=String(msg.label||"Reader").slice(0,30);$("readerLabel").textContent=readerLabel;
   }else if(msg.type==="full"){
     status("reader","Room is full","This test accepts up to 30 reader devices.","error");
   }else if(msg.type==="start-audio"){
     if(!microphone||!readerPeer?.open)return;
     stopReaderAudio(false);
     readerSelected=true;
     const current=readerPeer.call(ROOM_PEER_ID,microphone);
     if(!current){readerSelected=false;status("reader","Audio connection failed","Ask the teacher to tap Listen again.","error");return;}
     readerCall=current;
     current.on("close",()=>{if(readerCall===current){readerCall=null;readerSelected=false;if(readerRunning)status("reader","Mic ready · teacher not listening","Your voice is no longer streaming.","wait");}});
     current.on("error",()=>{if(readerCall===current){readerCall=null;readerSelected=false;if(readerRunning)status("reader","Audio issue","Ask the teacher to tap Listen again.","error");}});
     status("reader","Teacher is listening 🎧","Speak naturally. Only the selected reader sends live audio.","live");
   }else if(msg.type==="stop-audio"){stopReaderAudio();}
 });
 c.on("close",()=>{
   clearTimeout(deadline);if(teacherLink!==c)return;
   teacherLink=null;connectPending=false;stopReaderAudio(false);
   if(readerRunning)status("reader","Waiting for teacher","Microphone stays on. Connection retries automatically.","wait");
 });
 c.on("error",()=>{clearTimeout(deadline);connectPending=false;});
}
async function startReader(){
 if(readerRunning)return;
 readerRunning=true;let token=++readerSession;
 $("startReader").classList.add("hidden");$("stopReader").classList.remove("hidden");
 status("reader","Requesting microphone…","Allow microphone permission if prompted.","wait");
 try{
   if(typeof Peer!=="function")throw Error("The audio library is unavailable. Check internet.");
   if(!navigator.mediaDevices?.getUserMedia)throw Error("Microphone unavailable. Use HTTPS with Chrome or Safari.");
   microphone=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(!readerRunning||token!==readerSession){microphone.getTracks().forEach(t=>t.stop());return;}
   status("reader","Microphone is on","Waiting for the teacher to connect.","wait");
   readerPeer=new Peer(undefined,peerConfig);
   readerPeer.on("open",()=>{
     if(!readerRunning)return;
     connectReader();
     connectTimer=setInterval(connectReader,3000);
     pingTimer=setInterval(()=>{if(readerRunning&&teacherLink?.open)try{teacherLink.send({type:"ping"});}catch(e){}},7000);
   });
   readerPeer.on("error",err=>{if(!readerRunning)return;status("reader","Connection issue",err?.message||"Check Wi-Fi connection.","error");});
   readerPeer.on("disconnected",()=>{if(readerRunning){status("reader","Reconnecting…","Your microphone remains on.","wait");try{readerPeer.reconnect()}catch(e){}}});
   microphone.getAudioTracks()[0]?.addEventListener("ended",()=>{if(readerRunning)stopReader();});
 }catch(e){
   stopReader(false);
   status("reader","Could not start microphone",e?.message||"Check microphone permissions.","error");
 }
}
function stopReader(reset=true){
 readerRunning=false;readerSession++;
 if(connectTimer)clearInterval(connectTimer);if(pingTimer)clearInterval(pingTimer);
 connectTimer=null;pingTimer=null;connectPending=false;
 stopReaderAudio(false);
 try{teacherLink?.close()}catch(e){}teacherLink=null;
 try{readerPeer?.destroy()}catch(e){}readerPeer=null;
 if(microphone){microphone.getTracks().forEach(t=>t.stop());microphone=null;}
 $("startReader").classList.remove("hidden");$("stopReader").classList.add("hidden");
 $("readerLabel").textContent="Not assigned";
 if(reset)status("reader","Microphone is off","Tap Start Microphone whenever you're ready.");
}
$("startReader")?.addEventListener("click",startReader);
$("stopReader")?.addEventListener("click",()=>stopReader());
$("nextSentence")?.addEventListener("click",()=>{
 sentenceIndex=(sentenceIndex+1)%sentences.length;
 $("readerSentence").textContent=sentences[sentenceIndex];
 sendSentence();
});
window.addEventListener("pagehide",()=>{if(role==="teacher")stopTeacher(false);else if(role==="reader")stopReader(false);});
})();
