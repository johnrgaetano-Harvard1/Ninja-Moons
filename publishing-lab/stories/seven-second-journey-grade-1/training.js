
/* NINJA MOONS / Grade 1: full 4-stage bilingual training.
   This module intentionally reuses the story's EN_LINES, ES_LINES, vocabulary,
   noun-picture dialogs, language controls, page state, and device voices. */
(() => {
"use strict";
const $ = id => document.getElementById(id);
const root = $("ninja-training");
if (!root) return;
const key = "ninja-moons-grade1-training-v2";
const labels = {
 en:["Hear","Pronounce","Definitions","Understand"],
 es:["Escuchar","Pronunciar","Definiciones","Comprender"]
};
const hints = {
 en:[
  "Listen to the sentence. Hear Spanish too in bilingual mode.",
  "Tap any word to start reading there. Practice one to eight words at a time.",
  "Touch vocabulary for its meaning and sound. Concrete nouns also show real pictures.",
  "Read the sentence, then answer two short questions about this picture."
 ],
 es:[
  "Escucha la oración. En modo bilingüe también se escucha en inglés.",
  "Toca cualquier palabra para comenzar allí. Practica de una a ocho palabras.",
  "Toca las palabras para ver su significado y escuchar su sonido. Los sustantivos tienen fotos.",
  "Lee la oración y responde dos preguntas cortas sobre esta imagen."
 ]
};
const questions = [
 [
  ["Who got a new mission?","¿Quiénes recibieron una nueva misión?",["Kai, Mira, and Leo","Pip alone","Nobody"],["Kai, Mira y Leo","Pip solo","Nadie"],0],
  ["What will they find?","¿Qué van a buscar?",["A faraway moon","A lost hat","A big dog"],["Una luna lejana","Un sombrero perdido","Un perro grande"],0]
 ],
 [
  ["What floated above the table?","¿Qué flotaba sobre la mesa?",["Two stars","Three books","A flower"],["Dos estrellas","Tres libros","Una flor"],0],
  ["What did Mira think might exist?","¿Qué pensó Mira que podía existir?",["A secret way","A new cake","A song"],["Un camino secreto","Un pastel nuevo","Una canción"],0]
 ],
 [
  ["What was the ship called?","¿Cómo se llamaba la nave?",["Horizon","Rainbow","Turtle"],["Horizon","Arcoíris","Tortuga"],0],
  ["What did Leo buckle?","¿Qué se abrochó Leo?",["His belt","His shoes","His coat"],["Su cinturón","Sus zapatos","Su abrigo"],0]
 ],
 [
  ["What opened in space?","¿Qué se abrió en el espacio?",["A blue ring","A door in a tree","A white box"],["Un anillo azul","Una puerta en un árbol","Una caja blanca"],0],
  ["What did Pip count?","¿Qué contó Pip?",["Seven to one","Ten to twenty","Only two"],["De siete a uno","De diez a veinte","Solo dos"],0]
 ],
 [
  ["What color were the rocks?","¿De qué color eran las rocas?",["Blue","Red","Green"],["Azules","Rojas","Verdes"],0],
  ["What hung in the sky?","¿Qué había en el cielo?",["A purple planet","A bird","A kite"],["Un planeta morado","Un pájaro","Una cometa"],0]
 ],
 [
  ["What did Mira find?","¿Qué encontró Mira?",["A blue stone","A red balloon","A shoe"],["Una piedra azul","Un globo rojo","Un zapato"],0],
  ["Where did the friends run?","¿A dónde corrieron los amigos?",["A shining cave","A school hall","A pond"],["A una cueva brillante","A un pasillo de escuela","A un estanque"],0]
 ],
 [
  ["What did they find on the hill?","¿Qué encontraron en la colina?",["A glass room","A tall tree","A train"],["Una sala de vidrio","Un árbol alto","Un tren"],0],
  ["What curled across the map?","¿Qué se curvaba en el mapa?",["A bright line","A long worm","A rope"],["Una línea brillante","Un gusano largo","Una cuerda"],0]
 ],
 [
  ["What came back in the sky?","¿Qué volvió a aparecer en el cielo?",["A blue path","A snowstorm","A rainbow cake"],["Un camino azul","Una tormenta de nieve","Un pastel arcoíris"],0],
  ["Where did the team run?","¿A dónde corrió el equipo?",["Back to their ship","Into the ocean","To a shop"],["A su nave","Al océano","A una tienda"],0]
 ],
 [
  ["What world was ahead?","¿Qué mundo estaba adelante?",["Earth","The blue moon","The Sun"],["La Tierra","La luna azul","El Sol"],0],
  ["How did Pip feel?","¿Cómo se sentía Pip?",["Happy","Angry","Sleepy"],["Feliz","Enojado","Dormido"],0]
 ],
 [
  ["What did Kai hold?","¿Qué sostenía Kai?",["A blue stone","A guitar","A glass cup"],["Una piedra azul","Una guitarra","Un vaso"],0],
  ["What did Leo ask?","¿Qué preguntó Leo?",["Where will we go next?","Where is my lunch?","What is two plus two?"],["¿A dónde iremos después?","¿Dónde está mi almuerzo?","¿Cuánto es dos más dos?"],0]
 ]
];
let state={page:-1,sentence:0,stage:0,word:0,group:2,phonetics:100,definitions:100,answers:{}};
try { const saved=JSON.parse(sessionStorage.getItem(key)||"null"); if(saved&&typeof saved==="object")state={...state,...saved,answers:saved.answers||{}}; } catch {}
let lastLanguage="", ticket=0, speaking=false, paused=false, rememberedParts=[];
const lang=()=>typeof currentLanguage==="function"?currentLanguage():"en";
const spanishOnly=()=>lang()==="es";
const isDual=()=>lang()==="both";
const linesFor=(which)=>which==="es"?ES_LINES[page]:EN_LINES[page];
const selectedLines=()=>spanishOnly()?linesFor("es"):linesFor("en");
const vocabFor=(which)=>which==="es"?ES_VOCAB:EN_VOCAB;
const save=()=>{try{sessionStorage.setItem(key,JSON.stringify(state));}catch{}};
const lex=s=>String(s||"").toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/^[^a-z]+|[^a-z]+$/g,"");
const words=s=>String(s||"").match(/[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu)||[];
const voice=(locale)=>{const list=speechSynthesis.getVoices();return list.find(v=>v.lang&&v.lang.toLowerCase()===locale.toLowerCase())||list.find(v=>v.lang&&v.lang.toLowerCase().startsWith(locale.slice(0,2)))||null;};
function stopAudio(){
 ticket++;speaking=false;paused=false;
 if("speechSynthesis" in window)speechSynthesis.cancel();
 const b=$("nt-pause");if(b)b.textContent="Ⅱ Pause";
}
function speakParts(parts){
 if(!("speechSynthesis" in window)){setStatus("Speech is unavailable on this device.");return;}
 if(typeof stop==="function")stop();
 stopAudio(); rememberedParts=parts.filter(p=>p&&p.text&&p.text.trim());
 const my=++ticket;let idx=0;speaking=true;
 const next=()=>{
  if(my!==ticket)return;
  const p=rememberedParts[idx++];
  if(!p){speaking=false;setStatus(spanishOnly()?"Lectura terminada.":"Reading finished.");return;}
  const u=new SpeechSynthesisUtterance(p.text);
  u.lang=p.lang||"en-US";u.rate=Number($("speed")?.value||1);
  u.voice=voice(u.lang);u.onend=next;
  u.onerror=()=>{if(my===ticket){speaking=false;setStatus("Audio is not available right now.");}};
  speechSynthesis.speak(u);
 };
 next();
}
function sentenceParts(en,es){
 if(spanishOnly())return [{text:es,lang:"es-ES"}];
 if(isDual())return [{text:en,lang:"en-US"},{text:es,lang:"es-ES"}];
 return [{text:en,lang:"en-US"}];
}
function setStatus(message){const e=$("nt-status");if(e)e.textContent=message;}
function node(tag,className,content){const n=document.createElement(tag);if(className)n.className=className;if(content!=null)n.textContent=content;return n;}
function activeSentence(){
 const index=Math.max(0,Math.min(state.sentence,EN_LINES[page].length-1));
 state.sentence=index;
 return {en:EN_LINES[page][index],es:ES_LINES[page][index]};
}
function vocabularyMatches(which,line){
 const wset=new Set(words(line).map(lex));
 return vocabFor(which).filter(v=>v.page===page+1&&wset.has(lex(v.word)));
}
function popup(v,which){
 if(!v)return;
 if(typeof showPhoto==="function")showPhoto(v.word);
 $("word").textContent=v.word;$("phonetic").textContent=v.say||"";
 $("meaning").textContent=v.meaning;
 $("hearword").onclick=()=>speakParts([{text:v.word,lang:which==="es"?"es-ES":"en-US"}]);
 if(!$("dictionary").open)$("dictionary").showModal();
}
function nounPopup(word,which){
 if(typeof nounInfo==="function"&&nounInfo(word)){
   $("word").textContent=word;
   $("phonetic").textContent="";
   $("meaning").textContent=which==="es"?"Una foto real de esta palabra.":"A real photo of this word.";
   if(typeof showPhoto==="function")showPhoto(word);
   $("hearword").onclick=()=>speakParts([{text:word,lang:which==="es"?"es-ES":"en-US"}]);
   if(!$("dictionary").open)$("dictionary").showModal();
 }else speakParts([{text:word,lang:which==="es"?"es-ES":"en-US"}]);
}
function oneLine(box,title,text,css){
 if(title)box.append(node("p","nt-meta",title));
 box.append(node("p",css||"nt-sentence",text));
}
function addWordButtons(container,which,text){
 const all=words(text),count=Number(state.group)||2;
 if(!all.length)return;
 state.word=Math.max(0,Math.min(state.word,all.length-1));
 const wrap=node("div","nt-words");
 for(let i=0;i<all.length;i++){
  const w=all[i],active=i>=state.word&&i<state.word+count;
  const b=node("button","nt-word",w);b.type="button";b.dataset.active=String(active);
  if(typeof nounInfo==="function"&&nounInfo(w)){b.dataset.noun="true";b.title=spanishOnly()?"Toca para ver una foto real":"Tap for a real photo";}
  const vocab=vocabFor(which).find(v=>lex(v.word)===lex(w));
  if(vocab&&state.phonetics>0&&(i*37)%100<state.phonetics){
   b.append(node("span","nt-phonetic",vocab.say));
  }
  b.onclick=()=>{state.word=i;render();const phrase=all.slice(i).join(" ");if(typeof nounInfo==="function"&&nounInfo(w))nounPopup(w,which);else speakParts([{text:phrase,lang:which==="es"?"es-ES":"en-US"}]);};
  if(vocab)b.ondblclick=()=>popup(vocab,which);
  if(typeof nounInfo==="function"&&nounInfo(w)){
   b.onpointerenter=()=>{if(typeof showPreview==="function")showPreview(w)};
   b.onpointerleave=()=>{if(typeof hidePreview==="function")hidePreview()};
  }
  wrap.append(b);
 }
 container.append(wrap);
 return all;
}
function addVocab(container,which,vocab){
 const wrap=node("div","nt-vocab");
 const items=vocabFor(which).filter(v=>v.page===page+1);
 for(const v of items){
  const b=node("button");b.type="button";
  const en=vocabFor("en").find(x=>x.page===page+1&&items.indexOf(v)===vocabFor(which).filter(x=>x.page===page+1).indexOf(v));
  b.append(node("strong","",v.word+" "),node("small","",v.say));
  if(state.definitions>0&&((items.indexOf(v)*53)%100)<state.definitions){
   b.append(node("div","",v.meaning));
   if(isDual()&&which==="en"){
    const counterpart=ES_VOCAB.filter(x=>x.page===page+1)[items.indexOf(v)];
    if(counterpart)b.append(node("small","",counterpart.word+" — "+counterpart.meaning));
   }
  }
  if(typeof nounInfo==="function"&&nounInfo(v.word))b.append(node("small","","📷 "+(which==="es"?"Ver foto real":"See a real photo")));
  b.onclick=()=>popup(v,which);wrap.append(b);
 }
 if(wrap.children.length)container.append(wrap);
}
function tapEveryWord(container,which,text){
 const bar=node("div","nt-words");
 for(const w of words(text)){
  const b=node("button","nt-word",w);b.type="button";
  const v=vocabFor(which).find(x=>lex(x.word)===lex(w));
  if(typeof nounInfo==="function"&&nounInfo(w))b.dataset.noun="true";
  b.onclick=()=>{if(v)popup(v,which);else nounPopup(w,which);};
  if(typeof nounInfo==="function"&&nounInfo(w)){
   b.onpointerenter=()=>{if(typeof showPreview==="function")showPreview(w)};
   b.onpointerleave=()=>{if(typeof hidePreview==="function")hidePreview()};
  }
  bar.append(b);
 }
 container.append(node("p","nt-tip",which==="es"?"Toca cada palabra: significado, sonido o foto.":"Tap a word for its meaning, sound, or photo."));
 container.append(bar);
}
function checks(container){
 const loc=spanishOnly()?"es":"en",dual=isDual();
 const title=dual?"Check what you understood / Comprueba lo que entendiste":loc==="es"?"Comprueba lo que entendiste":"Check what you understood";
 container.append(node("p","nt-meta",title));
 questions[page].forEach((q,i)=>{
  const card=node("div","nt-check"),question=node("h4","",dual?q[0]+" / "+q[1]:loc==="es"?q[1]:q[0]);
  const options=node("div","nt-options"),feedback=node("p","nt-feedback");
  const selected=state.answers[page+"-"+i];
  const arr=loc==="es"?q[3]:q[2];
  arr.forEach((o,j)=>{
   const b=node("button","",String.fromCharCode(65+j)+". "+(dual?q[2][j]+" / "+q[3][j]:o));
   b.type="button";b.setAttribute("aria-pressed",String(selected===j));
   b.onclick=()=>{state.answers[page+"-"+i]=j;save();render();};
   options.append(b);
  });
  if(selected!==undefined)feedback.textContent=selected===q[4]?(dual?"Correct! / ¡Correcto!":loc==="es"?"¡Correcto!":"Correct!"):(dual?"Try again. / Inténtalo otra vez.":loc==="es"?"Inténtalo otra vez.":"Try again.");
  card.append(question,options,feedback);container.append(card);
 });
}
function render(){
 if(typeof story==="undefined"||!story||!EN_LINES[page]||!ES_LINES[page])return;
 const es=spanishOnly(),dual=isDual(),which=es?"es":"en",S=activeSentence();
 const activeTitles=labels[es?"es":"en"],card=$("nt-card"),steps=$("nt-steps");
 steps.replaceChildren();for(let i=0;i<4;i++){
  const b=node("button","nt-step",String(i+1)+". "+activeTitles[i]);b.type="button";
  if(i===state.stage)b.setAttribute("aria-current","step");
  b.onclick=()=>{stopAudio();state.stage=i;save();render();};
  steps.append(b);
 }
 card.replaceChildren();
 const count=EN_LINES[page].length;
 const seq=EN_LINES.slice(0,page).reduce((s,p)=>s+p.length,0)+state.sentence+1;
 card.append(node("p","nt-meta","PAGE "+(page+1)+"/10 · SENTENCE "+(state.sentence+1)+"/"+count+" · #"+seq));
 const title=activeTitles[state.stage];
 card.append(node("h3","nt-stage-title",title));
 const tip=hints[es?"es":"en"][state.stage];card.append(node("p","nt-tip",tip));
 if(state.stage===0){
  oneLine(card,dual?"ENGLISH":"",S.en,es?"nt-trans":"nt-sentence");
  if(es)card.lastChild.textContent=S.es;
  if(dual)oneLine(card,"ESPAÑOL",S.es,"nt-trans");
 }else if(state.stage===1){
  if(dual){oneLine(card,"ENGLISH",S.en,"nt-sentence");addWordButtons(card,"en",S.en);oneLine(card,"ESPAÑOL",S.es,"nt-trans");addWordButtons(card,"es",S.es);}
  else{oneLine(card,"",es?S.es:S.en,es?"nt-trans":"nt-sentence");addWordButtons(card,which,es?S.es:S.en);}
  const all=words(es?S.es:S.en),start=Math.min(state.word,Math.max(0,all.length-1));
  card.append(node("p","nt-tip",(es?"Grupo de palabras: ":"Word group: ")+all.slice(start,start+Number(state.group)).join(" ")));
 }else if(state.stage===2){
  if(dual){oneLine(card,"ENGLISH",S.en,"nt-sentence");tapEveryWord(card,"en",S.en);oneLine(card,"ESPAÑOL",S.es,"nt-trans");tapEveryWord(card,"es",S.es);addVocab(card,"en");}
  else{oneLine(card,"",es?S.es:S.en,es?"nt-trans":"nt-sentence");tapEveryWord(card,which,es?S.es:S.en);addVocab(card,which);}
 }else{
  if(dual){oneLine(card,"ENGLISH",S.en,"nt-sentence");oneLine(card,"ESPAÑOL",S.es,"nt-trans");}
  else oneLine(card,"",es?S.es:S.en,es?"nt-trans":"nt-sentence");
  checks(card);
 }
 $("nt-prev").disabled=state.stage===0&&state.sentence===0;
 $("nt-next").textContent=state.stage===3&&(state.sentence===count-1)?(es?"Repetir página ↻":"Practice page again ↻"):(es?"Siguiente →":"Next →");
 $("nt-count").textContent=title+" · "+(state.stage+1)+"/4";
 $("nt-status").textContent=(es?"Elige tus pasos.":"Your pace. Choose when to move on.");
 $("nt-group").value=String(state.group);
 $("nt-phon").value=String(state.phonetics);
 $("nt-def").value=String(state.definitions);
 save();
}
function trainParts(){
 const S=activeSentence();
 if(state.stage===1){
  const n=Number(state.group)||2,i=Math.max(0,state.word);
  const en=words(S.en).slice(i,i+n).join(" "),es=words(S.es).slice(i,i+n).join(" ");
  return sentenceParts(en,es);
 }
 if(state.stage===2){
  const enV=EN_VOCAB.filter(v=>v.page===page+1),esV=ES_VOCAB.filter(v=>v.page===page+1);
  const en=enV.map(v=>v.word+". "+v.meaning).join(" "),es=esV.map(v=>v.word+". "+v.meaning).join(" ");
  return sentenceParts(en,es);
 }
 return sentenceParts(S.en,S.es);
}
function changeStage(direction){
 stopAudio();
 const n=EN_LINES[page]?.length||0;if(!n)return;
 if(direction>0){
  if(state.stage<3)state.stage++;
  else if(state.sentence<n-1){state.sentence++;state.stage=0;state.word=0;}
  else{state.sentence=0;state.stage=0;state.word=0;}
 }else{
  if(state.stage>0)state.stage--;
  else if(state.sentence>0){state.sentence--;state.stage=3;state.word=0;}
 }
 render();
}
function sync(){
 if(typeof story==="undefined"||!story)return;
 if(state.page!==page){state.page=page;state.sentence=0;state.stage=0;state.word=0;stopAudio();}
 if(lastLanguage!==lang()){lastLanguage=lang();stopAudio();}
 render();
}
$("nt-play").onclick=()=>speakParts(trainParts());
$("nt-repeat").onclick=()=>speakParts(trainParts());
$("nt-stop").onclick=()=>{stopAudio();setStatus(spanishOnly()?"Detenido.":"Stopped.");};
$("nt-pause").onclick=()=>{
 if(!speaking||!("speechSynthesis" in window))return;
 if(!paused){speechSynthesis.pause();paused=true;$("nt-pause").textContent="▶ Resume";}
 else{speechSynthesis.resume();paused=false;$("nt-pause").textContent="Ⅱ Pause";}
};
$("nt-prev").onclick=()=>changeStage(-1);
$("nt-next").onclick=()=>changeStage(1);
$("nt-group").onchange=e=>{state.group=Number(e.target.value);render();};
$("nt-phon").onchange=e=>{state.phonetics=Number(e.target.value);render();};
$("nt-def").onchange=e=>{state.definitions=Number(e.target.value);render();};
$("nt-prevgroup").onclick=()=>{state.word=Math.max(0,state.word-Number(state.group));render();};
$("nt-nextgroup").onclick=()=>{const total=words(spanishOnly()?ES_LINES[page][state.sentence]:EN_LINES[page][state.sentence]).length;state.word=Math.min(Math.max(0,total-1),state.word+Number(state.group));render();};
$("language").addEventListener("change",()=>queueMicrotask(sync));
$("back").addEventListener("click",()=>queueMicrotask(sync));
$("next").addEventListener("click",()=>queueMicrotask(sync));
// The existing page asynchronously loads its manifest. This event is fired by
// the verified page integration after the page has been drawn.
window.NM_TRAINER={sync,stopAudio};
})();
