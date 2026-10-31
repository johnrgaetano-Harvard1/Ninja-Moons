/* Shared NINJA MOONS Reader: tap a story word for its meaning and spoken pronunciation.
   Author-defined vocabulary: <strong class="term">word</strong> <span class="definition">(phonetic)—definition</span>.
   Other words use dictionaryapi.dev (internet needed), but can always be spoken offline. */
(function(){
"use strict";
if(window.__ninjaWordReader)return;
window.__ninjaWordReader=true;
function start(){
  const root=document.querySelector("main");
  if(!root)return;
  const paragraphs=Array.from(root.querySelectorAll("article section > p"));
  if(!paragraphs.length)return;
  const known=new Map(), canSpeak=("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
  const badTags=new Set(["A","BUTTON","SCRIPT","STYLE","CODE","INPUT","TEXTAREA","SELECT"]);
  let selected=null,revision=0,previous=null;
  function key(s){return s.toLowerCase().replace(/’/g,"'").trim();}
  function parse(s){
    const t=(s||"").trim();
    const m=t.match(/^\(([^)]+)\)\s*[—–-]?\s*(.*)$/s);
    return m?{phonetic:m[1].trim(),meaning:m[2].trim()}:{phonetic:"",meaning:t.replace(/^[—–-]\s*/,"")};
  }
  function make(tag,className,txt){
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(txt!==undefined)el.textContent=txt;
    return el;
  }
  const shade=make("div","nw-shade");shade.hidden=true;
  const pop=make("section","nw-pop");pop.hidden=true;
  pop.setAttribute("role","dialog");pop.setAttribute("aria-modal","true");
  pop.setAttribute("aria-label","Word meaning and pronunciation");
  const inner=make("div","nw-inner");
  const head=make("div","nw-head");
  const kicker=make("strong","nw-kicker","🥷 NINJA WORD EXPLORER");
  const closeBtn=make("button","nw-x","×");closeBtn.type="button";closeBtn.setAttribute("aria-label","Close dictionary");
  head.append(kicker,closeBtn);
  const wordHeading=make("h2","nw-word");
  const phonetic=make("div","nw-phonetic");
  const meaning=make("p","nw-meaning");
  const actions=make("div","nw-actions");
  const play=make("button","nw-play","🔊 Listen again");play.type="button";
  const stop=make("button","nw-stop","Stop audio");stop.type="button";
  actions.append(play,stop);
  const status=make("div","nw-status");status.setAttribute("aria-live","polite");
  inner.append(head,wordHeading,phonetic,meaning,actions,status);
  pop.append(inner);document.body.append(shade,pop);
  if(!canSpeak){play.hidden=true;stop.hidden=true;}
  function cancelVoice(){if(canSpeak){try{speechSynthesis.cancel();}catch(e){}}}
  function say(text){
    if(!canSpeak){status.textContent="This browser does not support spoken audio.";return;}
    cancelVoice();
    const u=new SpeechSynthesisUtterance(text);
    u.lang="en-US";u.rate=.88;u.pitch=1;
    const english=speechSynthesis.getVoices().filter(v=>/^en([-_]|$)/i.test(v.lang));
    u.voice=english.find(v=>/enhanced|premium|samantha|ava|jenny|aria/i.test(v.name))||english.find(v=>/^en-US/i.test(v.lang))||english[0]||null;
    u.onerror=()=>{status.textContent="Audio could not play. Try again or check your volume.";};
    try{speechSynthesis.speak(u);}catch(e){status.textContent="Audio is unavailable right now.";}
  }
  function utterance(){return selected?selected.word+(selected.meaning?". "+selected.meaning:""):"";}
  function paint(){
    wordHeading.textContent=selected.word;
    phonetic.textContent=selected.phonetic?"Say it: "+selected.phonetic:"";
    meaning.textContent=selected.meaning||"Searching for the definition…";
  }
  function dismiss(){
    revision++;cancelVoice();shade.hidden=true;pop.hidden=true;
    document.body.classList.remove("nw-open");
    if(previous&&previous.isConnected&&previous.focus)previous.focus();
  }
  async function lookup(word,at){
    const k=key(word);
    if(known.has(k)){
      if(at!==revision)return;
      selected={word,...known.get(k)};paint();
      status.textContent="Tap Listen again to hear the meaning.";
      return;
    }
    try{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),6500);
      let response;
      try{response=await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/"+encodeURIComponent(k),{signal:controller.signal});}
      finally{clearTimeout(timeout);}
      if(!response.ok)throw Error("No definition");
      const data=await response.json();
      const entry=Array.isArray(data)?data[0]:null;
      const defs=(entry?.meanings||[]).flatMap(m=>m.definitions||[]);
      const first=defs.find(d=>d.definition&&typeof d.definition==="string");
      if(!first)throw Error("No definition");
      const found={meaning:first.definition,phonetic:entry.phonetic||""};
      known.set(k,found);
      if(at!==revision)return;
      selected={word,...found};paint();
      status.textContent="Definition found. Tap Listen again to hear it.";
    }catch(e){
      if(at!==revision)return;
      meaning.textContent="A definition isn't available right now. Tap Listen again to hear the word.";
      status.textContent="Story vocabulary works offline; other words need internet for their meaning.";
    }
  }
  function openWord(word,info){
    if(!word)return;
    const token=++revision;
    previous=document.activeElement;
    selected={word,phonetic:info?.phonetic||"",meaning:info?.meaning||""};
    paint();
    status.textContent=info?"Story vocabulary · approved definition":"Looking up an additional word…";
    shade.hidden=false;pop.hidden=false;
    document.body.classList.add("nw-open");closeBtn.focus({preventScroll:true});
    say(utterance());
    if(!info)lookup(word,token);
  }
  function addActivation(el,word,definition){
    el.classList.add("nw-tappable");el.tabIndex=0;
    el.setAttribute("role","button");
    el.setAttribute("aria-label","Hear and define "+word);
    el.addEventListener("click",()=>openWord(word,definition||known.get(key(word))||null));
    el.addEventListener("keydown",e=>{
      if(e.key==="Enter"||e.key===" "){e.preventDefault();openWord(word,definition||known.get(key(word))||null);}
    });
  }
  // Keep authored vocabulary immediately available even without network access.
  for(const support of root.querySelectorAll("article .support")){
    for(const strong of support.querySelectorAll("strong")){
      const word=strong.textContent.trim(), raw=strong.nextSibling?.textContent||"";
      const phon=raw.match(/\(([^)]+)\)/)?.[1]||"";
      let def=strong.nextElementSibling;
      while(def && !def.classList.contains("definition")) def=def.nextElementSibling;
      const meaning=def?.textContent.trim()||"";
      if(word&&meaning)known.set(key(word),{phonetic:phon,meaning});
    }
  }
  const fictional={
    "lumara":"A fictional, gentle ocean creature with glowing blue spots and long purple fins.",
    "neruma":"The fictional moon covered by oceans where the explorers are visiting.",
    "kai":"One of the student ninja explorers in this story.",
    "maya":"One of the student ninja explorers in this story.",
    "luma":"The team's friendly digital exploration assistant.",
    "coral":"Tiny ocean animals that live together and build hard or flexible structures.",
    "reef":"An underwater area where many corals and other sea creatures live.",
    "submarine":"A vehicle that travels beneath the surface of water.",
    "ocean":"A very large area of salty water.",
    "moon":"A natural world that travels around a planet.",
    "sample":"A small amount collected for careful study.",
    "microscope":"A tool that makes very small things look large.",
    "microorganisms":"Living things so tiny that a microscope is often needed to see them.",
    "organisms":"Living things.",
    "glowing":"Giving off light.",
    "experiment":"A careful test used to investigate an idea.",
    "golden":"Having a yellow color like gold.",
    "silver":"A shiny gray-white color or metal.",
    "threads":"Long, thin strands of material.",
    "scientists":"People who study the world using observations and experiments.",
    "seawater":"Water from the ocean.",
    "biotechnology":"Using living things or their parts to make useful products.",
    "evidence":"Information that helps test an idea.",
    "observations":"Things people notice carefully and record.",
    "transparent":"Clear enough that you can see through it."
  };
  for(const [word,meaning] of Object.entries(fictional))if(!known.has(word))known.set(word,{phonetic:"",meaning});
  for(const el of root.querySelectorAll(".term")){
    const word=el.textContent.trim();
    const def=el.nextElementSibling?.classList.contains("definition")
      ?parse(el.nextElementSibling.textContent):null;
    if(def)known.set(key(word),def);
    addActivation(el,word,def);
  }
  for(const p of paragraphs){
    const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT,{
      acceptNode(node){
        if(!node.nodeValue||!/[A-Za-z]/.test(node.nodeValue))return NodeFilter.FILTER_REJECT;
        for(let n=node.parentElement;n&&n!==p;n=n.parentElement){
          if(badTags.has(n.tagName)||n.classList.contains("term")||
             n.classList.contains("definition")||n.classList.contains("sentence-no")||
             n.classList.contains("nw-tappable"))return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const originals=[];while(walker.nextNode())originals.push(walker.currentNode);
    for(const node of originals){
      const txt=node.nodeValue,rx=/[A-Za-z]+(?:['’][A-Za-z]+)*/g,frag=document.createDocumentFragment();
      let cursor=0,match,count=0;
      while((match=rx.exec(txt))){
        count++;
        if(match.index>cursor)frag.append(document.createTextNode(txt.slice(cursor,match.index)));
        const word=match[0],el=make("span","nw-plain",word);
        addActivation(el,word,null);frag.append(el);cursor=rx.lastIndex;
      }
      if(!count)continue;
      if(cursor<txt.length)frag.append(document.createTextNode(txt.slice(cursor)));
      node.replaceWith(frag);
    }
  }
  window.NinjaOceanWord={open:(word)=>openWord(word,known.get(key(word))||null),known};
  shade.addEventListener("click",dismiss);closeBtn.addEventListener("click",dismiss);
  play.addEventListener("click",()=>{if(selected)say(utterance());});
  stop.addEventListener("click",()=>{cancelVoice();status.textContent="Audio stopped.";});
  document.addEventListener("keydown",e=>{
    if(pop.hidden)return;
    if(e.key==="Escape"){e.preventDefault();dismiss();}
    if(e.key==="Tab"){
      const focus=[closeBtn,play,stop].filter(x=>!x.hidden);
      const pos=focus.indexOf(document.activeElement);
      if(e.shiftKey&&pos<=0){e.preventDefault();focus[focus.length-1].focus();}
      else if(!e.shiftKey&&pos===focus.length-1){e.preventDefault();focus[0].focus();}
    }
  });
  const hero=document.querySelector(".hero,header");
  if(hero){
    const help=make("div","nw-help");
    const label=make("span","","Touch any story word for its definition and pronunciation.");
    const demo=make("button","","Try a word 🔊");demo.type="button";
    demo.addEventListener("click",()=>openWord("Lumara",known.get("lumara")||null));
    help.append(label,demo);hero.append(help);
  }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
else start();
})();