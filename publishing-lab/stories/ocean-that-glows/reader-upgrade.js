/* NINJA MOONS — The Ocean That Glows. Shared interactive reader for this exact 1201-word story. */
(function(){
"use strict";
const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
const sentences=qa("article section > p .sentence");
if(sentences.length!==105){console.error("NINJA Reader: unexpected sentence count",sentences.length);return;}
const hasVoice="speechSynthesis" in window&&"SpeechSynthesisUtterance" in window;
const rate=q("#rate"),status=q("#status");
const voices=()=>speechSynthesis.getVoices();
const chooseVoice=()=>{
 const en=voices().filter(v=>/^en([-_]|$)/i.test(v.lang));
 return en.find(v=>/andrew.*(online|natural)/i.test(v.name))||en.find(v=>/jenny|ava|samantha|natural|enhanced|premium/i.test(v.name))||en.find(v=>/^en-US/i.test(v.lang))||en[0]||null;
};
const items=sentences.map((el,index)=>{
 const clone=el.cloneNode(true);clone.querySelector("sup")?.remove();
 const text=clone.textContent.trim();
 const wordEls=[...el.querySelectorAll(".nw-tappable")];
 const words=[];let cursor=0;
 for(const w of wordEls){
  const value=w.textContent;const start=text.toLocaleLowerCase().indexOf(value.toLocaleLowerCase(),cursor);
  if(start<0)continue;
  words.push({el:w,start,end:start+value.length});cursor=start+value.length;
 }
 el.dataset.ninjaIndex=String(index);
 return {el,text,words};
});
let run=0,position=0,reading=false,paused=false,active=null;
const isSupported=()=>{if(!hasVoice){status.textContent="Your browser cannot speak the text. You can still touch words for definitions.";return false;}return true;};
function unpaint(){
 if(active){active.classList.remove("ninja-speaking");active=null;}
 for(const obj of items)obj.el.classList.remove("ninja-reading");
}
function stop(){
 run++;reading=false;paused=false;
 if(hasVoice){try{speechSynthesis.cancel();}catch(e){}}
 unpaint();
}
function mark(index,charIndex=-1){
 const item=items[index];if(!item)return;
 if(active){active.classList.remove("ninja-speaking");active=null;}
 for(const other of items)other.el.classList.remove("ninja-reading");
 item.el.classList.add("ninja-reading");
 if(charIndex>=0&&item.words.length){
  const w=item.words.find(w=>charIndex>=w.start&&charIndex<w.end)||[...item.words].reverse().find(w=>w.start<=charIndex)||item.words[0];
  if(w){w.el.classList.add("ninja-speaking");active=w.el;}
 }
}
function speakAt(start,{single=false}={}){
 if(!isSupported())return;
 stop();const myRun=run;position=start;reading=true;
 const next=()=>{
  if(!reading||run!==myRun)return;
  if(position>=items.length){reading=false;unpaint();status.textContent="Story complete.";return;}
  const idx=position,item=items[idx];
  mark(idx);
  status.textContent="Reading sentence "+(idx+1)+" of "+items.length;
  const utterance=new SpeechSynthesisUtterance(item.text);
  utterance.lang="en-US";utterance.rate=Number(rate?.value||1);utterance.voice=chooseVoice();
  let hadBoundary=false;
  utterance.onboundary=e=>{if(run!==myRun)return;hadBoundary=true;mark(idx,e.charIndex);};
  utterance.onend=()=>{
   if(run!==myRun)return;
   if(single){reading=false;status.textContent="Sentence "+(idx+1)+" finished.";unpaint();return;}
   position++;setTimeout(next,30);
  };
  utterance.onerror=e=>{if(run!==myRun)return;reading=false;unpaint();status.textContent="Audio could not continue. Tap Read story to try again.";};
  try{speechSynthesis.speak(utterance);}catch(e){reading=false;status.textContent="Audio unavailable on this device.";}
 };
 next();
}
const play=q("#play"),pause=q("#pause"),stopButton=q("#stop");
if(play){play.onclick=()=>speakAt(0);}
if(pause){pause.onclick=()=>{
 if(!hasVoice)return;
 if(!reading){speakAt(position);return;}
 if(speechSynthesis.paused){speechSynthesis.resume();paused=false;status.textContent="Reading resumed.";}
 else{speechSynthesis.pause();paused=true;status.textContent="Reading paused.";}
};}
if(stopButton){stopButton.onclick=()=>{stop();status.textContent="Reading stopped.";};}
qa(".read-section").forEach(button=>{
 const copy=button.cloneNode(true);button.replaceWith(copy);
 copy.addEventListener("click",()=>{const first=items.findIndex(s=>s.el.closest("section")===copy.closest("section"));if(first>=0)speakAt(first,{single:false});});
});
for(const [idx,item] of items.entries()){
 item.el.addEventListener("click",e=>{if(e.target.closest(".nw-tappable"))return;speakAt(idx,{single:true});});
 item.el.querySelectorAll(".nw-tappable").forEach(word=>word.addEventListener("click",()=>{if(reading)stop();},{capture:true}));
}
document.addEventListener("visibilitychange",()=>{if(document.hidden&&reading){stop();status.textContent="Audio stopped when this page was hidden.";}});

// Four-stage reading trainer is integrated rather than sending students to a login-required page.
const nav=q("nav"),button=document.createElement("button");
button.type="button";button.className="ninja-study-button";button.textContent="🥷 NINJA Reading Helper";button.setAttribute("aria-label","Open four-stage reading helper");
nav.insertBefore(button,nav.querySelector("#status"));
const dialog=document.createElement("div");dialog.id="ninja-study";dialog.hidden=true;dialog.setAttribute("role","dialog");
dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-label","NINJA Reading Helper");
dialog.innerHTML='<div class="study-card"><div class="study-top"><strong>🥷 NINJA READING HELPER</strong><button id="study-close" type="button" aria-label="Close reading helper">Close ✕</button></div><p id="study-progress" class="study-step"></p><h2 id="study-title"></h2><div id="study-content" class="study-content" aria-live="polite"></div><p id="study-hint"></p><div class="study-actions"><button id="study-back-sentence">◀ Sentence</button><button id="study-prev">← Back step</button><button id="study-hear">▶ Hear</button><button id="study-stop">■ Stop</button><button id="study-next">Next step →</button><button id="study-next-sentence">Next sentence ▶</button></div></div>';
document.body.append(dialog);
const inside=id=>dialog.querySelector("#"+id),stages=["Hear","Pronounce","Definitions","Understand"];
let si=0,stage=0;
const lex=()=>{
 const map=window.NinjaOceanWord?.known||new Map();
 return {map, get:w=>map.get(w.toLowerCase().replace(/’/g,"'"))};
};
function makeButton(word){
 const b=document.createElement("button");b.type="button";b.className="study-word";b.textContent=word;
 b.addEventListener("click",()=>{stop();window.NinjaOceanWord?.open(word);});
 return b;
}
function draw(){
 const item=items[si],words=item.words.map(x=>x.el.textContent);
 const {get}=lex(),content=inside("study-content");content.replaceChildren();
 inside("study-progress").textContent="Sentence "+(si+1)+" of "+items.length+" • Stage "+(stage+1)+" of 4";
 inside("study-title").textContent=stages[stage];
 if(stage===0){
  content.textContent=item.text;
  inside("study-hint").textContent="Hear it, then try saying it aloud yourself.";
 }else if(stage===1){
  for(const w of words){const b=makeButton(w),entry=get(w);if(entry?.phonetic){const p=document.createElement("span");p.className="study-phon";p.textContent="("+entry.phonetic+")";b.append(p);}content.append(b,document.createTextNode(" "));}
  inside("study-hint").textContent="Touch any word to hear it. Pronunciation guides appear for our vocabulary words.";
 }else if(stage===2){
  const chosen=new Set();let found=0;
  for(const w of words){
   const val=get(w);if(!val?.meaning||chosen.has(w.toLowerCase()))continue;
   chosen.add(w.toLowerCase());found++;
   const row=document.createElement("p"),b=makeButton(w),meaning=document.createElement("span");meaning.className="study-def";meaning.textContent=" — "+val.meaning;row.append(b,meaning);content.append(row);
  }
  if(!found)content.textContent="Touch a word in the story to learn its meaning.";
  inside("study-hint").textContent="Read the simple meanings. Touch other words in the story for more definitions.";
 }else{
  const p=document.createElement("p");p.textContent=item.text;
  const p2=document.createElement("p");p2.className="study-def";p2.textContent="What does this sentence mean? Explain it in your own words.";
  content.append(p,p2);
  inside("study-hint").textContent="Look at the two comprehension questions at the end of this story section when you're ready.";
 }
 inside("study-back-sentence").disabled=si===0;
 inside("study-prev").disabled=stage===0;
 inside("study-next").disabled=stage===3;
 inside("study-next-sentence").disabled=si===items.length-1;
}
function show(start=0){stop();si=Math.min(Math.max(start,0),items.length-1);stage=0;dialog.hidden=false;document.body.style.overflow="hidden";draw();inside("study-close").focus();}
function hide(){stop();dialog.hidden=true;document.body.style.overflow="";button.focus();}
button.onclick=()=>show(0);
inside("study-close").onclick=hide;
inside("study-hear").onclick=()=>speakAt(si,{single:true});
inside("study-stop").onclick=()=>{stop();status.textContent="Stopped.";};
inside("study-prev").onclick=()=>{stage=Math.max(0,stage-1);draw();};
inside("study-next").onclick=()=>{stage=Math.min(3,stage+1);draw();};
inside("study-back-sentence").onclick=()=>{si=Math.max(0,si-1);stage=0;draw();};
inside("study-next-sentence").onclick=()=>{si=Math.min(items.length-1,si+1);stage=0;draw();};
dialog.addEventListener("click",e=>{if(e.target===dialog)hide();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!dialog.hidden)hide();});
status.textContent="Ready. Tap any story word for pronunciation and meaning; Read story highlights as it speaks.";
})();