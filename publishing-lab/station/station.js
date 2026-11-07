
"use strict";
const $=id=>document.getElementById(id);
const SCENE_TITLES=["The Big Mission","A Secret Way","Ready to Fly","Seven Seconds!","A New World","The Blue Stones","The Hidden Clue","The Blue Path","Home Again!","The Next Adventure"];
const STAGE_LABELS={en:["Hear","Pronounce","Definitions","Understand"],es:["Escuchar","Pronunciar","Definiciones","Comprender"]};
const STAGE_HELP={
 en:["Listen to the sentence. Replay it as often as you like.","Choose one to eight words. Start at any word, then read aloud.","Tap words to learn meanings. Nouns include real photos.","Understand the sentence, then answer two questions about the picture."],
 es:["Escucha la oración. Repítela cuantas veces quieras.","Elige de una a ocho palabras y practica la pronunciación.","Toca las palabras para ver sus significados y fotos reales.","Comprende la oración y responde dos preguntas sobre la imagen."]
};
const GRADES={K:"Kindergarten",1:"1st grade",2:"2nd grade",3:"3rd grade",4:"4th grade",5:"5th grade",6:"6th grade",7:"7th grade",8:"8th grade",9:"9th grade",10:"10th grade",11:"11th grade",12:"12th grade"};
let catalog=[],story=null,spanish=null,questions=null,photoData={photos:{},aliases:{}},currentSlug="",page=0,sentence=0,stage=0,wordStart=0,tool="trainer",answers={},lastAudio=0,audioPaused=false,recognition=null,selectedStudent=null,classroom=null,quickchat=null;
const clean=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,"");
const tokens=s=>String(s||"").match(/[\p{L}\p{M}\p{N}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*/gu)||[];
const speechLang=()=>language()==="es"&&spanish?"es-ES":"en-US";
const language=()=>$("language").value;
const dual=()=>language()==="both"&&!!spanish;
const nativeEs=()=>language()==="es"&&!!spanish;
const storyPath=()=>"/stories/"+currentSlug+"/";
function persist(){
 if(!story)return;
 try{localStorage.setItem("nm-station-v1-"+currentSlug,JSON.stringify({page,sentence,stage,wordStart,answers,updatedAt:Date.now()}));}catch{}
 const progress=Object.freeze({slug:currentSlug,page:page+1,sentence:sentence+1,stage:stage+1,language:language()});
 window.dispatchEvent(new CustomEvent("nm:context",{detail:progress}));
}
function context(){return{slug:currentSlug,title:story?.title||"",page:page+1,sentence:sentence+1,stage:stage+1,totalPages:story?.pages?.length||0,language:language(),text:story?.pages?.[page]?.lines?.[sentence]||""};}
window.NM_STATION={getContext:context,getStory:()=>story,getPage:()=>page,getLocalProgress:()=>({page:page+1,sentence:sentence+1,stage:stage+1,questionsAnswered:Object.keys(answers).length}),getCatalog:()=>catalog};
function node(tag,cl,txt){const e=document.createElement(tag);if(cl)e.className=cl;if(txt!==undefined)e.textContent=txt;return e;}
function text(el,txt){el.textContent=txt==null?"":String(txt);}
function stopSpeech(){lastAudio++;audioPaused=false;if("speechSynthesis" in window)speechSynthesis.cancel();for(const id of ["pausePage","trainPause"]){const b=$(id);if(b)b.textContent="Ⅱ Pause";}}
function togglePause(){
 if(!("speechSynthesis" in window))return;
 if(!audioPaused){if(!speechSynthesis.speaking)return;speechSynthesis.pause();audioPaused=true;}
 else{speechSynthesis.resume();audioPaused=false;}
 for(const id of ["pausePage","trainPause"]){const b=$(id);if(b)b.textContent=audioPaused?"▶ Resume":"Ⅱ Pause";}
}
function speakSegments(parts,readAll=false){
 // Do not play reading audio into a live student microphone.
 if(recognition){try{recognition.stop()}catch(_error){recognition=null}}
 stopSpeech();if(!("speechSynthesis" in window)){alert("Speech is not available in this browser.");return}
 const serial=++lastAudio;let position=0;
 function next(){
  if(serial!==lastAudio)return;
  if(position>=parts.length){
   if(readAll&&page<story.pages.length-1){page++;sentence=0;wordStart=0;refresh();speakSegments(pageAudioSegments(),true);}
   return;
  }
  const part=parts[position++];if(!part.text||!part.text.trim()){next();return}
  const u=new SpeechSynthesisUtterance(part.text);u.lang=part.lang;
  u.rate=Number($("speechSpeed").value)||0.9;
  const available=speechSynthesis.getVoices();u.voice=available.find(v=>v.lang?.toLowerCase()===part.lang.toLowerCase())||available.find(v=>v.lang?.slice(0,2)===part.lang.slice(0,2))||null;
  u.onend=next;u.onerror=()=>{if(serial===lastAudio)next()};
  speechSynthesis.speak(u);
 }
 next();
}
function makeSegments(en,es){if(nativeEs())return[{lang:"es-ES",text:es||en}];if(dual())return[{lang:"en-US",text:en},{lang:"es-ES",text:es}];return[{lang:"en-US",text:en}]}
function pageAudioSegments(){return story.pages[page].lines.flatMap((en,i)=>makeSegments(en,spanish?.lines?.[page]?.[i]))}
function nounInfo(word){
 const type=photoData.aliases?.[clean(word)];return type?photoData.photos?.[type]:null;
}
function vocabList(){return nativeEs()?spanish?.vocabulary||[]:story.vocabulary||story.glossary||[]}
function vocabOf(word){return vocabList().find(v=>clean(v.word)===clean(word))||null}
function showWord(word,forceLang){
 const v=vocabOf(word),photo=nounInfo(word),lang=forceLang||(nativeEs()?"es-ES":"en-US");
 text($("dialogWord"),v?.word||word);
 text($("dialogPhonetic"),v?.say||"");
 text($("dialogDefinition"),v?.meaning||(photo?(lang==="es-ES"?"Imagen real para aprender esta palabra.":"See a real photograph of this noun."):(lang==="es-ES"?"Escucha la palabra.":"Tap Hear to listen to the word.")));
 const img=$("dialogImage");img.hidden=!photo;
 if(photo){img.src=photo.src;img.alt=photo.name||word;img.onerror=()=>{img.hidden=true};text($("dialogCredit"),"Real photo · "+(photo.credit||""))}else text($("dialogCredit"),"");
 $("dialogHear").onclick=()=>speakSegments([{lang,text:v?.word||word}]);
 if(!$("wordDialog").open)$("wordDialog").showModal();
 window.dispatchEvent(new CustomEvent("nm:reading-event",{detail:{event_type:"word_tap"}}));
}
function currentLines(){return story?.pages?.[page]?.lines||[]}
function pageTitle(){return nativeEs()&&spanish?.titles?.[page]?spanish.titles[page]:currentSlug==="seven-second-journey-grade-1"?SCENE_TITLES[page]:story.pages[page].title||story.pages[page].alt||"Picture "+(page+1)}
function displaySentence(){const en=currentLines()[sentence]||"",es=spanish?.lines?.[page]?.[sentence]||"";return{en,es,shown:nativeEs()?es:en}}
function setPage(index){if(!story)return;stopSpeech();page=Math.max(0,Math.min(story.pages.length-1,index));sentence=0;wordStart=0;refresh();window.dispatchEvent(new CustomEvent("nm:reading-event",{detail:{event_type:"story_open"}}))}
function setSentence(i){sentence=Math.max(0,Math.min(currentLines().length-1,i));wordStart=0;refresh();window.dispatchEvent(new CustomEvent("nm:reading-event",{detail:{event_type:"sentence_read"}}))}
function showHoverNoun(w,trigger){
 const info=nounInfo(w),pop=$("hoverNounPopover");if(!info||!pop||!trigger?.getBoundingClientRect)return;
 $("hoverNounPhoto").src=info.src;$("hoverNounPhoto").alt=info.name||w;
 text($("hoverNounName"),info.name||w);
 const rect=trigger.getBoundingClientRect();
 const left=Math.max(8,Math.min(rect.left,window.innerWidth-220));
 const top=rect.top>225?rect.top-205:rect.bottom+12;
 pop.style.left=left+"px";pop.style.top=Math.max(6,top)+"px";pop.hidden=false;
}
function hideHoverNoun(){const pop=$("hoverNounPopover");if(pop)pop.hidden=true;}
function renderStory(){
 if(!story)return;
 const pg=story.pages[page],img=$("storyArt");
 const priorSprite=document.getElementById("storySprite");if(priorSprite)priorSprite.remove();
 if(currentSlug==="ocean-that-glows"&&pg.image==="images/ocean-sprite.webp"){
  img.hidden=true;
  const NS="http://www.w3.org/2000/svg",svg=document.createElementNS(NS,"svg");
  svg.id="storySprite";svg.setAttribute("viewBox",(page%2*1672)+" "+(Math.floor(page/2)*941)+" 1672 941");
  svg.setAttribute("role","img");svg.setAttribute("aria-label",pg.alt||"Ocean story illustration");
  const image=document.createElementNS(NS,"image");image.setAttribute("href",storyPath()+pg.image);
  image.setAttribute("width","3344");image.setAttribute("height","4705");image.setAttribute("x","0");image.setAttribute("y","0");
  svg.append(image);document.querySelector(".story-image").append(svg);
 }else{img.hidden=false;img.src=storyPath()+pg.image;img.alt=pg.alt||"Illustration for picture "+(page+1);}
 text($("storyGrade"),"NINJA MOONS · "+(GRADES[catalog.find(x=>x.slug===currentSlug)?.grade]||story.readingLevel||"STORY"));
 text($("storyTitle"),story.title);
 text($("pageBadge"),"Picture "+(page+1)+" of "+story.pages.length);
 text($("pageTitle"),pageTitle());
 const e=$("storyLines");e.replaceChildren();
 const displayed=nativeEs()&&spanish?.lines?.[page]?spanish.lines[page]:pg.lines;
 for(let i=0;i<displayed.length;i++){
  const line=displayed[i],row=node("p","sentence-line"+(i===sentence?" active":""));
  const number=node("button","sentence-select",String(i+1)+".");number.type="button";
  number.setAttribute("aria-label","Read sentence "+(i+1));
  number.onclick=()=>{setSentence(i);speakSegments(makeSegments(pg.lines[i],spanish?.lines?.[page]?.[i]))};row.append(number);
  for(const fragment of line.match(/\s+|\S+/g)||[]){
   if(/^\s+$/.test(fragment)){row.append(document.createTextNode(fragment));continue;}
   const w=fragment,v=vocabOf(w),photo=nounInfo(w),btn=node("button","word-tap"+(v?" vocab-tap":"")+(photo?" noun-tap":""),w);
   btn.type="button";btn.title=photo?"View a real photograph of "+clean(w):v?"Hear and define "+clean(w):"Hear "+clean(w);
   btn.onclick=()=>{
    if(sentence!==i){sentence=i;wordStart=0;refresh();}
    if(photo||v)showWord(w);
    else speakSegments([{lang:speechLang(),text:w}]);
   };
   if(photo){btn.onpointerenter=()=>showHoverNoun(w,btn);btn.onpointerleave=hideHoverNoun;btn.onfocus=()=>showHoverNoun(w,btn);btn.onblur=hideHoverNoun;}
   row.append(btn);
  }
  if(dual()&&spanish?.lines?.[page]?.[i])row.append(node("div","spanish-caption",spanish.lines[page][i]));
  e.append(row);
 }
 $("backPage").disabled=page===0;$("nextPage").textContent=page===story.pages.length-1?"Start again ↻":"Next →";
 $("pageProgress").style.width=(100*(page+1)/story.pages.length)+"%";
}
function renderStages(){
 if(!story)return;const es=nativeEs(),lbl=STAGE_LABELS[es?"es":"en"],bar=$("stageTabs");bar.replaceChildren();
 for(let i=0;i<4;i++){const b=node("button",i===stage?"active":"",String(i+1)+". "+lbl[i]);b.type="button";b.onclick=()=>{stage=i;wordStart=0;refresh();window.dispatchEvent(new CustomEvent("nm:reading-event",{detail:{event_type:"helper_step"}}))};bar.append(b);}
 const s=displaySentence(),card=$("trainerCard");card.replaceChildren();card.append(node("p","train-meta","PICTURE "+(page+1)+" / "+story.pages.length+" · SENTENCE "+(sentence+1)+" / "+currentLines().length+" · STAGE "+(stage+1)+" / 4"));
 card.append(node("h3","",lbl[stage]));card.append(node("p","help",STAGE_HELP[es?"es":"en"][stage]));
 const line=node("p","sentence",s.shown);card.append(line);
 if(dual()&&s.es)card.append(node("p","translation","ES: "+s.es));
 if(stage===1){
  const ww=tokens(s.shown),div=node("div","word-bits"),group=Number($("wordCount").value)||2,percent=Number($("phoneticPercent").value);
  for(let i=0;i<ww.length;i++){
   const w=ww[i],v=vocabOf(w),n=nounInfo(w);
   const b=node("button",(i>=wordStart&&i<wordStart+group?"active ":"")+(v?"vocab-word ":"")+(n?"noun-word":""),w);
   b.type="button";
   if(v&&percent>=100||v&&percent>=50&&i%2===0)b.append(node("small","",v.say||""));
   b.onclick=()=>{wordStart=i;renderStages();if(n)showWord(w);else{speakSegments([{lang:speechLang(),text:ww.slice(i,i+group).join(" ")}])}};
   b.title=n?"Tap for a real noun photograph":v?"Tap to practice pronunciation":"Tap to start reading here";
   div.append(b);
  }
  card.append(div);
  card.append(node("p","help",(es?"Palabras seleccionadas: ":"Selected words: ")+ww.slice(wordStart,wordStart+group).join(" ")));
 }else if(stage===2){
  const wrap=node("div","definition-grid"),all=tokens(s.shown),pc=Number($("definitionPercent").value);
  const unique=[...new Map(all.map(w=>[clean(w),w])).values()];
  for(const [i,w]of unique.entries()){
   const v=vocabOf(w),n=nounInfo(w),b=node("button","definition-card");b.type="button";
   b.append(node("strong","",w));
   if(v&&((i*43)%100)<pc)b.append(node("p","",v.meaning));
   if(n)b.append(node("small","", "📷 "+(es?"Ver foto":"Real photo")));
   if(!v&&!n)b.append(node("small","",es?"Toca para escuchar":"Tap to hear"));
   b.onclick=()=>showWord(w);wrap.append(b);
  }
  card.append(wrap);
 }else if(stage===3){
  card.append(node("p","help",es?"¿Qué pasó en esta oración? Busca pistas en la imagen.":"What happened in this sentence? Use the picture for clues."));
  const b=node("button","btn primary",es?"Responder las preguntas →":"Answer picture questions →");b.type="button";b.onclick=()=>showTool("questions");card.append(b);
 }
 $("trainBack").disabled=stage===0&&sentence===0;
 text($("trainIndex"),"Stage "+(stage+1)+" / 4 · Sentence "+(sentence+1));
}
function trainMove(delta){
 if(delta>0){if(stage<3)stage++;else if(sentence<currentLines().length-1){stage=0;sentence++;wordStart=0}else{stage=0;sentence=0;wordStart=0}}
 else {if(stage>0)stage--;else if(sentence>0){stage=3;sentence--;wordStart=0}}
 refresh();
 window.dispatchEvent(new CustomEvent("nm:reading-event",{detail:{event_type:"helper_step"}}));
}
function renderTranslation(){
 const box=$("translationCard");box.replaceChildren();
 const lines=story.pages[page].lines;
 if(!spanish){box.append(node("p","help","A Spanish translation has not been published for this story. English reading and narration remain available. The first-grade Seven-Second Journey has complete bilingual text."));return;}
 for(let i=0;i<lines.length;i++){
  const p=node("div","translation-pair");p.append(node("p","sentence","EN: "+lines[i]),node("p","translation","ES: "+spanish.lines[page][i]));box.append(p);
 }
}
function renderPictures(){
 const e=$("pictureWords");e.replaceChildren();
 if(!story)return;
 const combined=currentLines().join(" ")+" "+(spanish?.lines?.[page]?.join(" ")||"");
 const items=[...new Set(tokens(combined).map(clean))].filter(k=>!!nounInfo(k));
 if(!items.length){e.append(node("p","help","No mapped real-noun photographs on this picture yet. Tap the vocabulary in the Reader for definitions and sounds."));return;}
 for(const w of items){const item=nounInfo(w),b=node("button","noun-card");b.type="button";const img=node("img");img.loading="lazy";img.src=item.src;img.alt=item.name||w;img.onerror=()=>{img.style.display="none"};b.append(img,node("strong","",w),node("small","",item.name||"Real photo"));b.onclick=()=>showWord(w);e.append(b)}
}
function renderQuiz(){
 const container=$("questionCard");container.replaceChildren();
 const set=questions?.[page];
 if(!set||!set.length){const a=node("p","help","This story does not yet have authored comprehension questions in the unified library. We will not invent or auto-grade unverified answers.");const p=node("a","text-link","Open the original story’s comprehension activities");p.href=storyPath();p.target="_blank";p.rel="noopener";container.append(a,p);return;}
 for(let i=0;i<set.length;i++){
  const q=set[i],es=nativeEs(),both=dual(),w=node("div","quiz-item"),h=node("h4","",both?q[0]+" / "+q[1]:es?q[1]:q[0]);
  w.append(h);
  const opts=node("div","quiz-options");const saved=answers[page+"-"+i],vals=es?q[3]:q[2];
  for(let j=0;j<vals.length;j++){
   const b=node("button",saved===j?"chosen":"",String.fromCharCode(65+j)+". "+(both?q[2][j]+" / "+q[3][j]:vals[j]));b.type="button";
   b.onclick=()=>{answers[page+"-"+i]=j;persist();renderQuiz();window.dispatchEvent(new CustomEvent("nm:reading-event",{detail:{event_type:"question_view",answer_choice:String.fromCharCode(65+j),question_id:currentSlug+"-p"+(page+1)+"q"+(i+1)}}))};opts.append(b)
  }
  w.append(opts);
  const feedback=node("p","quiz-feedback",saved===undefined?"":saved===q[4]?(both?"Correct! / ¡Correcto!":es?"¡Correcto!":"Correct!"):(both?"Try again / Inténtalo otra vez":es?"Inténtalo otra vez":"Try again"));
  w.append(feedback);container.append(w)
 }
}
function renderProgress(){
 if(!story)return;
 const box=$("progressCard");box.replaceChildren();
 box.append(node("h3","",story.title),node("p","", "Picture "+(page+1)+" of "+story.pages.length+" · Sentence "+(sentence+1)+" · Stage "+(stage+1)+" of 4"));
 box.append(node("p","",Object.keys(answers).length+" comprehension answers saved on this device."));
 box.append(node("p","help","Reading location and answers are saved in this browser. Verified school accounts can also record selected reading events for teacher monitoring."));
}
function refresh(){
 if(!story)return;
 if(sentence>=currentLines().length)sentence=0;
 renderStory();renderStages();renderTranslation();renderPictures();renderQuiz();renderProgress();
 const c=context();
 text($("ninjaContext"),c.title+" · Picture "+c.page+" · Sentence "+c.sentence+" · "+c.text);
 persist();
}
function showTool(name){
 // A microphone must not stay open unnoticed after leaving the transcription toolbox.
 if(name!=="transcribe"&&recognition){try{recognition.stop()}catch(_error){recognition=null}}
 tool=name;for(const e of document.querySelectorAll("[data-panel]"))e.hidden=e.dataset.panel!==name;
 for(const b of document.querySelectorAll("[data-tool]")){const is=b.dataset.tool===name;b.classList.toggle("selected",is);if(is)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")}
 // The adult AI testing iframe is loaded only on deliberate user expansion, not on student page load.
 // Live Reading loads only on an explicit click; the experimental music player never autoplays for students.
 if(name==="teacher"&&new URLSearchParams(location.search).get("test")!=="live"&&!quickchat)import("./quickchat.js").then(m=>{quickchat=m;return m.init()}).catch(e=>{text($("accountBox"),"Messaging is temporarily unavailable: "+e.message)});
  if(name==="teacher"&&quickchat?.refresh)quickchat.refresh();
  if(name==="progress"&&!classroom)import("./classroom.js").then(m=>{classroom=m;return m.init()}).catch(e=>{text($("progressCard"),"Protected classroom progress is unavailable: "+e.message)});
  if(name==="progress"&&classroom?.renderMonitor)classroom.renderMonitor();
}

const WORD_STOP=new Set(["a","an","the","what","does","do","mean","is","are","in","on","for","this","that","where","who","why","how","can","i","you","me","please","tell","about","of","and","it","to","my","story","picture","sentence","explain","word","with","have","has","we","did","get","them","they"]);
function quickNinjaAnswer(question){
 if(!story)return "Open a story first.";
 const q=String(question||"").trim(),words=tokens(q).map(clean).filter(w=>w&&!WORD_STOP.has(w));
 const current=displaySentence(),all=currentLines();
 if(/spanish|español|traduc|translate|en español/i.test(q)){
  return spanish
   ?"English: "+current.en+"\nEspañol: "+current.es
   :"The Spanish version has not yet been published for this story.";
 }
 if(/what happened|explain|summarize|summary|main idea|what is going on|qué pasó|qué ocurre/i.test(q)){
  const scene=pageTitle();return "Picture "+(page+1)+" — "+scene+".\n"+all.slice(0,Math.min(3,all.length)).join(" ")+"\nWhat clue do you notice in the picture?";
 }
 const candidates=[...(nativeEs()?spanish?.vocabulary||[]:story.vocabulary||[]),...(story.vocabulary||[])];
 const selected=candidates.find(v=>words.some(w=>clean(v.word)===w||clean(v.word).split(" ").includes(w)));
 if(selected){
  if(/pronounc|sound|say|speak|decir|pronuncia/i.test(q)){
   return selected.word+": "+(selected.say||"Press the Listen control to hear this word.")+".";
  }
  const photo=nounInfo(selected.word);
  return selected.word+": "+selected.meaning+(photo?" Tap the underlined word in the story for a real picture.":"");
 }
 if(/pronounc|sound|say|speak|decir|pronuncia/i.test(q)&&words.length){
  const word=words.find(w=>all.join(" ").toLowerCase().includes(w))||words[0];
  return "Tap '"+word+"' in the story to hear it aloud. Choose a word in NINJA Reader Stage 2 to practise from that point.";
 }
 const keyWords=words.filter(w=>w.length>2);
 const scored=all.map(line=>({line,score:keyWords.reduce((n,w)=>n+(tokens(line).map(clean).includes(w)?1:0),0)})).sort((a,b)=>b.score-a.score);
 if(scored[0]?.score>0)return "Here's a clue from this picture:\n“"+scored[0].line+"”\nTry explaining what this tells you in your own words. You can ask your teacher for more help.";
 return "I can help explain the current page, give a published word definition, show the Spanish translation, or practise pronunciation. For a question that needs a new answer, choose Ask Teacher or open the supervised Ask Ninja AI test.";
}
let ninjaBusy=false;
async function askLocal(input){
 const q=String(input||"").trim();
 const output=$("ninjaAnswer");
 if(!q){text(output,"Type a question first.");return}
 if(ninjaBusy)return;
 const form=$("ninjaLocalForm");
 const submit=form.querySelector('button[type="submit"]');
 ninjaBusy=true;submit.disabled=true;output.setAttribute("aria-busy","true");
 text(output,"Ninja is getting a direct answer…");
 try{
  const c=context();
  const optionalLines=story?currentLines().join(" ").slice(0,320):"";
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  let response;
  try{
   response=await fetch("/api/ask-ninja",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
     question:q,
     context:{title:c.title||"",page:c.page||1,text:optionalLines}
    }),
    signal:controller.signal
   });
  }finally{clearTimeout(timer)}
  const result=await response.json().catch(()=>({}));
  if(!response.ok||typeof result.answer!=="string"||!result.answer.trim())
   throw Error(result.message||"Ninja could not find an answer. Please try again.");
  text(output,result.answer.trim());
 }catch(err){
  text(output,err?.name==="AbortError"
   ?"Ninja took too long to answer. Try again."
   :"Ninja could not answer right now: "+(err.message||"Please try again."));
 }finally{
  ninjaBusy=false;submit.disabled=false;output.removeAttribute("aria-busy");
 }
}
function initAskNinja(){
 $("ninjaLocalForm").onsubmit=e=>{e.preventDefault();askLocal($("ninjaQuestion").value)};
 $("ninjaExplain").onclick=()=>{
  $("ninjaQuestion").value="Explain what is happening on this story page.";
  askLocal($("ninjaQuestion").value);
 };
 $("ninjaSpanish").onclick=()=>{
  const line=displaySentence().en||"";
  $("ninjaQuestion").value="Translate this story sentence into Spanish: "+line.slice(0,210);
  askLocal($("ninjaQuestion").value);
 };
 $("ninjaWord").onclick=()=>{
  const sent=displaySentence().shown||"";
  const matching=tokens(sent).find(w=>vocabOf(w)||nounInfo(w))||tokens(sent).find(w=>w.length>4)||"this";
  $("ninjaQuestion").value="What does "+matching+" mean?";
  askLocal($("ninjaQuestion").value);
 };
 $("ninjaAskTeacher").onclick=()=>{
  const question=$("ninjaQuestion").value.trim();
  showTool("teacher");
  const field=$("chatText");
  field.value=(question?question+"\\n":"")+"Story: "+(story?.title||"")+" · picture "+(page+1)+", sentence "+(sentence+1)+".";
  field.focus();
 };
 const details=document.querySelector(".external-ai");
 details?.addEventListener("toggle",()=>{
  if(details.open&&!$("ninjaFrame").getAttribute("src"))$("ninjaFrame").src="https://ninja-moons-ask-ninja-lab.vercel.app/";
 });
}

function questionContext(){
 const c=context();return "I am reading the NINJA MOONS story '"+c.title+"', picture "+c.page+", sentence "+c.sentence+": "+c.text+". Please explain this at my grade level in simple words, with no spoilers.";
}
async function copyContext(){
 try{await navigator.clipboard.writeText(questionContext());text($("copyContext"),"Copied! Paste into Ask Ninja");setTimeout(()=>text($("copyContext"),"Copy story context for Ask Ninja"),2600)}
 catch{prompt("Copy this question:",questionContext())}
}
async function loadStory(slug){
 if(!catalog.some(s=>s.slug===slug))return;
 stopSpeech();recognition?.stop();$("micStatus").textContent="Microphone off.";
 let m;
 try{
  const res=await fetch("/stories/"+encodeURIComponent(slug)+"/manifest.json",{cache:"no-store"});if(!res.ok)throw Error("Story data missing");m=await res.json();
  if(!Array.isArray(m.pages)||!m.pages.length)throw Error("Story pages missing");
 }catch(e){text($("storyLines"),"Could not load this story: "+e.message);return}
 currentSlug=slug;story=m;spanish=null;questions=null;
 if($("ninjaAnswer"))text($("ninjaAnswer"),"Ask Ninja a question about anything school-safe. You can also ask about this story.");
 const packBase=slug==="seven-second-journey-grade-1"?"grade1":slug;
 const optionalJSON=async(url)=>{try{const r=await fetch(url,{cache:"no-store"});return r.ok?await r.json():null}catch{return null}};
 const [translated,quizData]=await Promise.all([optionalJSON("/station/"+packBase+"-es.json"),optionalJSON("/station/"+packBase+"-questions.json")]);
 // A translation must cover every original sentence; never show a partial pack as complete.
 if(translated?.spanish?.lines?.length===m.pages.length&&m.pages.every((p,i)=>translated.spanish.lines[i]?.length===p.lines.length))spanish=translated.spanish;
 if(quizData?.questions?.length===m.pages.length&&quizData.questions.every(q=>Array.isArray(q)&&q.length===2))questions=quizData.questions;
 const esOption=$("language").querySelector('option[value="es"]'),dualOption=$("language").querySelector('option[value="both"]');
 if(esOption)esOption.disabled=!spanish;
 if(dualOption)dualOption.disabled=!spanish;
 if(!spanish&&language()!=="en")$("language").value="en";
 const optionsNote=$("translationNotice");if(optionsNote)optionsNote.textContent=spanish?"Spanish story and vocabulary are available.":"Spanish translation is not yet available for this story; English remains active.";
 let saved={};try{saved=JSON.parse(localStorage.getItem("nm-station-v1-"+slug)||"{}")}catch{}
 page=Math.max(0,Math.min(story.pages.length-1,Number(saved.page)||0));
 sentence=Math.max(0,Math.min(story.pages[page].lines.length-1,Number(saved.sentence)||0));
 stage=[0,1,2,3].includes(saved.stage)?saved.stage:0;wordStart=Number(saved.wordStart)||0;answers=saved.answers||{};
 $("storyPick").value=slug;
 history.replaceState(null,"","/station/?story="+encodeURIComponent(slug));
 refresh();window.dispatchEvent(new CustomEvent("nm:reading-event",{detail:{event_type:"story_open"}}))
}
// The selected language is the language the student is actually speaking.
// Only finalized speech segments are translated; interim recognition remains visible.
const STT_LANGUAGES={
 "en-US":{code:"en",label:"English"},
 "es-ES":{code:"es",label:"Español"},
 "zh-CN":{code:"zh",label:"中文（普通话）"},
 "hi-IN":{code:"hi",label:"हिन्दी"},
 "ar-SA":{code:"ar",label:"العربية"}
};
let transcriptRun=0,lastTranscriptionLanguage="",transcriptTranslationQueue=Promise.resolve();
let nativeTranslator=null,nativeTranslatorLanguage="";
async function englishTranslation(utterance,languageCode){
 const input=String(utterance||"").trim();
 if(!input)return"";
 if(languageCode==="en")return input;
 // Chrome desktop may offer private on-device translation. Other browsers use
 // the site's server-side service, which receives text only, never microphone audio.
 if(globalThis.Translator&&nativeTranslatorLanguage===languageCode&&nativeTranslator){
  try{return String(await nativeTranslator.translate(input)).trim()}catch(_e){nativeTranslator=null}
 }
 const response=await fetch("/api/translate",{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({text:input,sourceLanguage:languageCode}),
  cache:"no-store",credentials:"same-origin"
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok||typeof data.english!=="string")
  throw Error(data.message||"Automatic English translation is unavailable.");
 return data.english.trim();
}
async function prepareNativeTranslator(lang){
 nativeTranslator=null;nativeTranslatorLanguage="";
 if(lang==="en"||!globalThis.Translator)return;
 try{
  const info=await globalThis.Translator.availability({sourceLanguage:lang,targetLanguage:"en"});
  // Do not silently trigger model downloads on a school computer.
  if(info!=="available")return;
  nativeTranslator=await globalThis.Translator.create({sourceLanguage:lang,targetLanguage:"en"});
  nativeTranslatorLanguage=lang;
 }catch(_e){nativeTranslator=null;nativeTranslatorLanguage=""}
}
function initTranscription(){
 const original=$("transcript"),english=$("translatedTranscript"),statusBox=$("translationStatus");
 const choose=$("sttLanguage");
 const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;
 let committedText="",englishText="";
 const setStatus=message=>text(statusBox,message);
 const reportFailure=err=>setStatus("English translation unavailable: "+(err.message||"Please try again.")+" Original transcript is preserved.");
 const translatePiece=(piece,lang,run)=>{
  transcriptTranslationQueue=transcriptTranslationQueue.then(async()=>{
   try{
    const output=await englishTranslation(piece,lang);
    if(run!==transcriptRun)return;
    englishText+=(englishText?" ":"")+output;
    english.value=englishText;
    setStatus(lang==="en"?"English transcription ready.":"English translation updated · "+STT_LANGUAGES[choose.value].label+" → English");
   }catch(err){if(run===transcriptRun)reportFailure(err)}
  });
 };
 const start=async()=>{
  if(!Rec){text($("micStatus"),"Speech recognition is not supported by this browser. You can type text and use Translate to English.");return}
  const selected=choose.value,lang=STT_LANGUAGES[selected];
  if(!lang)return;
  if(recognition){recognition.onend=null;recognition.stop();recognition=null}
  const run=++transcriptRun;
  if(lastTranscriptionLanguage&&lastTranscriptionLanguage!==selected){original.value="";english.value="";}
  lastTranscriptionLanguage=selected;
  committedText=original.value.trim();englishText=english.value.trim();
  transcriptTranslationQueue=Promise.resolve();
  setStatus(selected==="en-US"?"English speech will appear in both boxes.":"Finalized "+lang.label+" phrases are translated to English automatically.");
  // Start the microphone immediately in this user gesture; translation setup
  // happens afterward so it does not block the browser's permission prompt.
  recognition=new Rec();const active=recognition;
  active.lang=selected;active.continuous=true;active.interimResults=true;
  const seen=new Set();
  let micError="",heardSpeech=false,stoppedByUser=false;
  active.onstart=()=>{
   if(run===transcriptRun)text($("micStatus"),"Microphone active · Listening for "+lang.label+" speech.");
  };
  active.onaudiostart=()=>{
   if(run===transcriptRun)text($("micStatus"),"Microphone connected · Speak a sentence in "+lang.label+".");
  };
  active.onspeechstart=()=>{
   if(run===transcriptRun)text($("micStatus"),"Speech detected · Recognizing "+lang.label+" words…");
  };
  active.onresult=event=>{
   if(run!==transcriptRun)return;
   let interim="";
   for(let i=0;i<event.results.length;i++){
    const result=event.results[i],t=result?.[0]?.transcript?.trim()||"";
    if(t)heardSpeech=true;
    if(result.isFinal&&!seen.has(i)&&t){
     seen.add(i);
     committedText+=(committedText?" ":"")+t;
     // English recognition already writes directly to the English box.
     // Queuing an English "translation" here duplicated every finalized phrase.
     if(lang.code!=="en")translatePiece(t,lang.code,run);
    }else if(!result.isFinal&&t){interim+=(interim?" ":"")+t}
   }
   original.value=committedText+(interim?(committedText?" ":"")+interim:"");
   original.scrollTop=original.scrollHeight;
   if(lang.code==="en"){
    englishText=committedText;
    english.value=original.value;
   }
  };
  active.onerror=event=>{
   if(run!==transcriptRun)return;
   const code=String(event.error||"unknown");
   // Do not bury useful recognition or permission errors beneath a generic onend notice.
   const causes={
    "not-allowed":"Microphone access was denied. Allow microphone permission in your browser and retry.",
    "service-not-allowed":"Speech recognition service is blocked by this browser or device.",
    "no-speech":"No speech detected. Speak clearly, check the input device and tap Start Mic again.",
    "audio-capture":"No microphone input available. Check your device microphone settings.",
    "network":"Speech-recognition network error. Check your connection and try again.",
    "language-not-supported":"This device does not support speech recognition in "+lang.label+".",
    "aborted":"Microphone session was interrupted. Tap Start Mic again."
   };
   micError=causes[code]||"Microphone error: "+code+". Tap Start Mic again.";
   if(stoppedByUser&&code==="aborted")micError="";
   if(micError)text($("micStatus"),micError);
  };
  active.onend=()=>{
   if(run!==transcriptRun||recognition!==active)return;
   recognition=null;
   if(micError)return;
   text($("micStatus"),stoppedByUser
    ?"Microphone stopped. Your transcript remains on this device."
    :heardSpeech
      ?"Microphone paused by your browser. Tap Start Mic to continue reading."
      :"Microphone stopped without recognizing speech. Check mic permissions and try again.");
  };
  active.requestStop=()=>{stoppedByUser=true;active.stop()};
  try{active.start();text($("micStatus"),"Listening in "+lang.label+"…");}
  catch(err){text($("micStatus"),"Could not start microphone: "+err.message);recognition=null;return}
  prepareNativeTranslator(lang.code).catch(()=>{});
 };
 $("micStart").onclick=()=>{start().catch(err=>text($("micStatus"),"Microphone unavailable: "+err.message))};
 $("micStop").onclick=()=>{
  if(recognition){if(typeof recognition.requestStop==="function")recognition.requestStop();else recognition.stop()}
  else text($("micStatus"),"Microphone is already off.");
 };
 choose.onchange=()=>{
  // Prevent late results in the previous language from entering the new transcript.
  ++transcriptRun;
  if(recognition){const previous=recognition;recognition=null;try{previous.stop()}catch(_error){}}
  setStatus("Reading language selected: "+STT_LANGUAGES[choose.value].label+". Start the mic to recognize that language.");
 };
 $("clearTranscript").onclick=()=>{
  ++transcriptRun;
  if(recognition){const previous=recognition;recognition=null;try{previous.stop()}catch(_error){}}
  original.value="";english.value="";
  committedText="";englishText="";transcriptTranslationQueue=Promise.resolve();
  text($("micStatus"),"Both transcript boxes cleared on this device.");
  setStatus("Choose a language and read aloud. Original speech and English will appear together.");
 };
 $("translateNow").onclick=async()=>{
  const selected=choose.value,lang=STT_LANGUAGES[selected];
  const input=original.value.trim();
  if(!input){setStatus("Speak or type text in the original box first.");return}
  if(input.length>800){setStatus("To translate typed text, select up to 800 characters.");return}
  // Translating manually should also end any live recognition session.
  if(recognition){const previous=recognition;recognition=null;try{previous.stop()}catch(_error){}}
  const run=++transcriptRun,button=$("translateNow");
  button.disabled=true;setStatus("Translating to English…");
  try{
   let translated=[];
   // Server limits each piece to protect shared school resources.
   for(const part of input.match(/[\s\S]{1,240}/g)||[]){
    const value=await englishTranslation(part,lang.code);
    if(run!==transcriptRun)return;
    translated.push(value);
   }
   englishText=translated.join(" ");
   english.value=englishText;
   setStatus("English translation ready.");
  }catch(err){if(run===transcriptRun)reportFailure(err)}
  finally{button.disabled=false}
 };
 document.addEventListener("visibilitychange",()=>{
  if(document.hidden&&recognition){
   try{if(typeof recognition.requestStop==="function")recognition.requestStop();
   else recognition.stop()}catch(_error){recognition=null}
  }
 });
 if(!Rec)text($("micStatus"),"Speech recognition is unavailable in this browser. Try Safari on an iPhone or Chrome/Edge on a computer, or type and translate.");
}

async function init(){
 for(let i=1;i<=8;i++){const o=node("option","",String(i));o.value=String(i);$("wordCount").append(o)}$("wordCount").value="2";
 $("dialogClose").onclick=()=>$("wordDialog").close();
 $("backPage").onclick=()=>setPage(page-1);$("nextPage").onclick=()=>setPage((page+1)%story.pages.length);
 $("readPage").onclick=()=>speakSegments(pageAudioSegments());
 $("readAll").onclick=()=>speakSegments(pageAudioSegments(),true);
 $("pausePage").onclick=togglePause;
 $("stopPage").onclick=stopSpeech;
 $("trainBack").onclick=()=>trainMove(-1);$("trainNext").onclick=()=>trainMove(1);
 $("trainPlay").onclick=()=>{const s=displaySentence();if(stage===1){const group=Number($("wordCount").value),en=tokens(s.en).slice(wordStart,wordStart+group).join(" "),es=tokens(s.es).slice(wordStart,wordStart+group).join(" ");speakSegments(makeSegments(en,es))}
 else if(stage===2){const vs=vocabList().filter(v=>v.page==null||v.page===page+1);speakSegments(vs.flatMap(v=>[{lang:speechLang(),text:v.word+". "+v.meaning}]))}
 else speakSegments(makeSegments(s.en,s.es))};
 $("trainRepeat").onclick=()=>$("trainPlay").click();$("trainPause").onclick=togglePause;$("trainStop").onclick=stopSpeech;
 for(const id of ["wordCount","phoneticPercent","definitionPercent"])$(id).onchange=()=>{wordStart=0;refresh()};
 $("language").onchange=()=>{stopSpeech();refresh()};
 $("speakEnglish").onclick=()=>speakSegments(story.pages[page].lines.map(x=>({lang:"en-US",text:x})));
 $("speakSpanish").onclick=()=>{if(!spanish){alert("Spanish text has not been published for this story.");return}speakSegments(spanish.lines[page].map(x=>({lang:"es-ES",text:x})))};
 $("copyContext").onclick=copyContext;
 $("enableLive").onclick=()=>{
  const frame=$("liveFrame");frame.src="https://ninjamoons.vercel.app/live-reading/";
  text($("liveStatus"),"The separate live-classroom app is open below. Microphone permission is controlled by its own Start Mic button and your device.");
 };
 initAskNinja();
 for(const b of document.querySelectorAll("[data-tool]"))b.onclick=()=>showTool(b.dataset.tool);
 $("storyPick").onchange=()=>loadStory($("storyPick").value);
 initTranscription();
 try{
  const [cat,photos]=await Promise.all([fetch("/catalog.json",{cache:"no-store"}).then(r=>r.json()),fetch("/station/noun-photos.json").then(r=>r.json())]);
  if(!Array.isArray(cat.stories)||!cat.stories.length)throw Error("No stories in catalog");
  catalog=cat.stories;photoData=photos||photoData;
  $("storyPick").replaceChildren();
  for(const st of catalog){const opt=node("option","",String(GRADES[st.grade]||st.readingLevel||"Story")+" · "+st.title);opt.value=st.slug;$("storyPick").append(opt)}
  const query=new URLSearchParams(location.search).get("story"),desired=query&&catalog.some(x=>x.slug===query)?query:catalog.some(x=>x.slug==="seven-second-journey-grade-1")?"seven-second-journey-grade-1":catalog[0].slug;
  await loadStory(desired);
   const requestedTool=new URLSearchParams(location.search).get("tool");
   const validTools=["trainer","language","pictures","questions","ninja","teacher","live","transcribe","progress","music"];
   showTool(validTools.includes(requestedTool)?requestedTool:"trainer");
 }catch(e){text($("storyLines"),"Story library unavailable: "+e.message);text($("storyPick"),"Story library unavailable");}
}
init();
