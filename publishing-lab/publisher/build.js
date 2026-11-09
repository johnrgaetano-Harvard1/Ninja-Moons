#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),out=path.resolve(process.cwd(),"dist");
// Approved original ocean illustrations: immutable Vercel source, SHA-256 verified on every clean build.
const oceanAssetSources=[{"file":"ocean-sprite.webp","sha256":"5f3ab49bee36ade8f15f7f567ca8b4d88cc010c3060920e2352f8477499347a9","url":"https://ninja-moons-publishing-glw3bj329-ninja-fitt.vercel.app/stories/ocean-that-glows/images/ocean-sprite.webp"},{"file":"cover.webp","sha256":"c68ee4c5fb6b39f4fb2f00bef5e37b964b90500f01eab42dd0b7c3b030e34513","url":"https://ninja-moons-publishing-glw3bj329-ninja-fitt.vercel.app/stories/ocean-that-glows/images/cover.webp"}];
async function installOceanArt(){
 const folder=path.join(root,"stories","ocean-that-glows","images");
 if(!fs.existsSync(path.join(root,"stories","ocean-that-glows","manifest.json")))return;
 fs.mkdirSync(folder,{recursive:true});
 for(const asset of oceanAssetSources){
  const target=path.join(folder,asset.file);
  if(isFile(target)&&digest(target)===asset.sha256)continue;
  const response=await fetch(asset.url,{redirect:"follow"});
  ensure(response.ok,"approved ocean artwork unavailable: "+asset.file);
  const buffer=Buffer.from(await response.arrayBuffer());
  ensure(crypto.createHash("sha256").update(buffer).digest("hex")===asset.sha256,"ocean art integrity failure: "+asset.file);
  fs.writeFileSync(target,buffer);
 }
}

function ensure(cond,why){if(!cond)throw Error("PUBLISH BLOCKED: "+why)}
function json(file){return JSON.parse(fs.readFileSync(file,"utf8"))}
function isFile(file){return fs.statSync(file,{throwIfNoEntry:false})?.isFile()}
function digest(file){return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function generate(story){
 const p=JSON.stringify(story.pages.map(p=>({page:p.page,lines:p.lines,image:p.image}))).replace(/</g,"\\u003c");
 const header='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(story.title)+' — NINJA MOONS</title><style>body{background:#0a1830;color:white;font-family:system-ui;margin:auto;max-width:1000px;padding:20px}a{color:#8ee9ff}img{width:100%;aspect-ratio:16/9;object-fit:contain;background:#06112a}p{font-size:clamp(23px,3vw,34px);line-height:1.5}button{border:0;border-radius:10px;background:#9ee8ff;color:#07142b;padding:12px 18px;font-weight:800;margin:5px}button:disabled{opacity:.4}</style></head><body><a href="https://ninjamoons.vercel.app/reader?level=All">← All stories</a><h1>'+esc(story.title)+'</h1><div id="number"></div><img id="art" alt="Story illustration"><div id="lines"></div><nav><button id="back">← Back</button><button id="hear">🔊 Hear</button><button id="stop">Stop</button><button id="next">Next →</button></nav>';
 const script="const pages="+p+";let n=0;const el=id=>document.getElementById(id);function say(t){if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='en-US';window.speechSynthesis.speak(u)}function draw(){const p=pages[n];el('number').textContent='Page '+(n+1)+' of '+pages.length;el('art').src=p.image;el('art').alt='Illustration for page '+p.page;el('lines').replaceChildren(...p.lines.map(x=>{let e=document.createElement('p');e.textContent=x;e.onclick=()=>say(x);return e}));el('back').disabled=n===0;el('next').textContent=n===pages.length-1?'Start again ↻':'Next →'}el('back').onclick=()=>{n=Math.max(0,n-1);draw()};el('next').onclick=()=>{n=(n+1)%pages.length;draw()};el('hear').onclick=()=>say(pages[n].lines.join(' '));el('stop').onclick=()=>window.speechSynthesis?.cancel();draw()";
 return header+"<script>"+script+"</script></body></html>";
}
function addNavigation(html){
 const nav=fs.readFileSync(path.resolve(__dirname,'../../integrations/navigation/site-nav.html'),'utf8');
 const mascot='<img class="nm-mascot" src="https://ninjamoons.vercel.app/brand/mascot.webp" alt="" aria-hidden="true" width="28" height="28">';
 const branded=html.split(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>)/i).map(part=>/^<(script|style)\b/i.test(part)?part:part.replace(/>([^<]*)</g,(_,text)=>'>'+text.replace(/🥷/g,mascot)+'<')).join('');
 return branded.replace(/<body[^>]*>/i,match=>match+nav);
}

async function installFirstGradeArt(){
 const slug="seven-second-journey-grade-1",dir=path.join(root,"stories",slug),manifestFile=path.join(dir,"manifest.json");
 if(!isFile(manifestFile))return;
 const manifest=json(manifestFile),sources=json(path.join(dir,"image-sources.json"));
 fs.mkdirSync(path.join(dir,"images"),{recursive:true});
 for(const page of manifest.pages){
  const source=sources.find(x=>x.page===page.page);
  ensure(source&&typeof source.url==="string","first-grade source missing "+page.page);
  const target=path.join(dir,page.image);
  if(isFile(target)&&(!page.sha256||digest(target)===page.sha256))continue;
  const stable="https://ninja-moons-publisher.vercel.app/stories/"+slug+"/"+page.image;
  let stored=false;
  for(const url of [stable,source.url]){
   try{
    const response=await fetch(url,{redirect:"follow",signal:AbortSignal.timeout(45000)});
    if(!response.ok)continue;
    const data=Buffer.from(await response.arrayBuffer());
    if(data.length<1000||data.length>30*1024*1024)continue;
    if(data.subarray(1,4).toString()!=="PNG")continue;
    const width=data.readUInt32BE(16),height=data.readUInt32BE(20);
    if(width<3500||height<1900||Math.abs(width/height-16/9)>.03)continue;
    const sha=crypto.createHash("sha256").update(data).digest("hex");
    if(page.sha256&&page.sha256!==sha)continue;
    if(page.imageBytes&&page.imageBytes!==data.length)continue;
    fs.writeFileSync(target,data);
    page.sha256=sha;page.imageBytes=data.length;stored=true;break;
   }catch(_e){/* try the next authorized image source */}
  }
  ensure(stored,"first-grade 4K illustration unavailable or failed integrity check: page "+page.page);
 }
 for(const p of manifest.pages){
  ensure(isFile(path.join(dir,p.image)),"first-grade picture missing "+p.page);
  p.sha256=digest(path.join(dir,p.image));
  p.imageBytes=fs.statSync(path.join(dir,p.image)).size;
 }
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2));
}


async function installGardenArt(){
 const dir=path.join(root,"stories","secret-garden"),manifestFile=path.join(dir,"manifest.json");
 if(!isFile(manifestFile))return;
 const manifest=json(manifestFile);
 fs.mkdirSync(path.join(dir,"images"),{recursive:true});
 for(const p of manifest.pages){
  const name="picture_"+String(p.page).padStart(2,"0")+".png";
  const target=path.join(dir,"images",name);
  if(isFile(target)&&p.sha256&&p.imageBytes&&digest(target)===p.sha256
     &&fs.statSync(target).size===p.imageBytes)continue;
  const urls=["https://ninja-moons-secret-garden.vercel.app/"+name,
   "https://ninja-moons-secret-garden-ninja-fitt.vercel.app/"+name];
  let found=false;
  for(const url of urls){
   try{
    const response=await fetch(url,{redirect:"follow",signal:AbortSignal.timeout(45000)});
    if(!response.ok)continue;
    const bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length<10000||bytes.length>15*1024*1024)continue;
    if(bytes.subarray(1,4).toString()!=="PNG")continue;
    const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
    if(w<1400||h<700||Math.abs(w/h-16/9)>.06)continue;
    const sha=crypto.createHash("sha256").update(bytes).digest("hex");
    if(p.sha256&&p.sha256!==sha)continue;
    fs.writeFileSync(target,bytes);
    p.sha256=sha;p.imageBytes=bytes.length;found=true;break;
   }catch(_error){/* Retry the approved original image origin */ }
  }
  ensure(found,"Original Secret Garden illustration could not be verified: "+name);
 }
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2));
}

// Cross-browser cryptographic integration test: two independent browser contexts,
// real Node WebCrypto AES-256-GCM, encrypted messages, key handoff, and tamper rejection.
async function verifyLiveEndToEndEncryption(source){
 const browser=(hash,store)=>{
  const location={hash,origin:'https://ninja-moons-publisher.vercel.app',
   pathname:'/station/',search:'?test=live'};
  const history={replaceState(_state,_title,next){
   const url=new URL(next,location.origin);
   location.hash=url.hash;
  }};
  const storage={
   getItem:key=>store.get(key)||null,
   setItem:(key,value)=>store.set(key,value)
  };
  const sandbox={
   window:{},location,history,localStorage:storage,
   crypto:crypto.webcrypto,URL,URLSearchParams,TextEncoder,TextDecoder,
   Uint8Array,Uint16Array,ArrayBuffer,
   btoa:str=>Buffer.from(str,'binary').toString('base64'),
   atob:str=>Buffer.from(str,'base64').toString('binary')
  };
  vm.runInNewContext(source,sandbox,{filename:'live-e2e.js',timeout:3000});
  return sandbox.window.NMLiveE2E;
 };
 const teacher=browser('',new Map());
 const teacherState=await teacher.teacher();
 const link=teacher.studentLink('https://ninja-moons-publisher.vercel.app/station/?test=live');
 const studentURL=new URL(link);
 ensure(studentURL.hash.startsWith('#nmkey=')&&!studentURL.search.includes('nmkey'),
  'encryption key must be in URL fragment only, never sent in HTTP query');
 const student=browser(studentURL.hash,new Map());
 const studentState=await student.student();
 ensure(teacherState.keyId===studentState.keyId,
  'student and teacher must have matching AES-256 keys');
 const question='What does this part of the story mean?';
 const envelope=await student.seal(question,'student');
 ensure(/^nmE2E1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22,690}$/.test(envelope)
  &&!envelope.includes(question)&&envelope.length<750,
  'message text must be a valid ciphertext envelope, never plaintext');
 ensure(await teacher.open(envelope,'student')===question,
  'teacher could not decrypt a student question');
 const reply='Great question! Read line five again.';
 const response=await teacher.seal(reply,'teacher');
 ensure(await student.open(response,'teacher')===reply,
  'student could not decrypt the teacher response');
 let roleTamperingRejected=false;
 try{await teacher.open(envelope,'teacher')}catch(_error){roleTamperingRejected=true}
 ensure(roleTamperingRejected,'AES-GCM role authentication must reject sender impersonation');
 let ciphertextTamperingRejected=false;
 const lastChar=envelope.at(-1);
 const modified=envelope.slice(0,-1)+(lastChar==='A'?'B':'A');
 try{await teacher.open(modified,'student')}catch(_error){ciphertextTamperingRejected=true}
 ensure(ciphertextTamperingRejected,'AES-GCM must reject modified ciphertext');
 // Direct student URL without an invitation must generate a key and matching teacher link.
 const directContext=browser('',new Map());
 const newStudent=await directContext.student();
 ensure(newStudent.generated===true,'direct student URL must create its own encryption key');
 const matchedTeacherURL=new URL(directContext.teacherLink());
 ensure(matchedTeacherURL.hash.startsWith('#nmkey='),'direct student must expose a matching teacher fragment link');
 const invitedTeacher=browser(matchedTeacherURL.hash,new Map());
 const matchedTeacher=await invitedTeacher.teacher();
 ensure(newStudent.keyId===matchedTeacher.keyId,'direct student teacher pairing must use the same AES-256 key');
 const fromDirect=await directContext.seal('Can you read this student question?','student');
 ensure(await invitedTeacher.open(fromDirect,'student')==='Can you read this student question?',
  'fresh paired teacher must decrypt direct student question');
 console.log('ENCRYPTION INTEGRATION PASSED: two browser peers, AES-256-GCM, secret fragment, authenticated ciphertext, tampering rejected');
}


async function testAskNinjaDirectAnswer(source){
 const requests=[];
 let mockAnswer="The sky looks blue because air scatters blue light from the Sun more than red light.";
 const sandbox={
  Response,URL,Map,Date,AbortController,setTimeout,clearTimeout,console,
  process:{env:{AI_GATEWAY_API_KEY:"integration-test-placeholder"}},
  fetch:async(url,options)=>{
   requests.push({url,body:JSON.parse(options.body)});
   return {ok:true,json:async()=>({choices:[{message:{content:mockAnswer}}]})};
  }
 };
 vm.runInNewContext(source,sandbox,{filename:"api/ask-ninja.mjs",timeout:3000});
 const request=(question,context={})=>({
  url:"https://ninja-moons-publisher.vercel.app/api/ask-ninja",
  headers:new Headers({"origin":"https://ninja-moons-publisher.vercel.app",
    "content-type":"application/json","x-forwarded-for":"build-test"}),
  text:async()=>JSON.stringify({question,context})
 });
 const q="Why does the sky look blue?";
 const result=await sandbox.POST(request(q));
 const body=await result.json();
 ensure(result.status===200&&body.answer.includes("scatters blue light"),
   "Ask Ninja must return a clear useful answer, not a Socratic prompt");
 ensure(requests[0].body.messages[1].content.includes(q)&&
  requests[0].body.messages[0].content.includes("Never restrict answers to the story"),
   "Ask Ninja must allow questions unrelated to a story");
 const other="What is the capital of Japan?";
 const answer=await sandbox.POST(request(other,{title:"A space mission",page:4,text:"The stars were shining."}));
 ensure(answer.status===200&&requests.at(-1).body.messages[1].content.includes(other),
   "Story context must not prevent a general question reaching the AI");
 const invalid=await sandbox.POST(request(""));
 ensure(invalid.status===400,"Empty questions must be rejected");
 const refusal="I can't answer that question. Do you have another school-appropriate question?";
 const beforeUnsafe=requests.length;
 const explicit=await sandbox.POST(request("Teach me how to eat ass"));
 const explicitBody=await explicit.json();
 ensure(explicit.status===200&&explicitBody.answer===refusal&&requests.length===beforeUnsafe,
  "Explicit student questions must receive ONLY the fixed refusal without sending the question to AI");
 const prohibited=await sandbox.POST(request("How can I make a bomb?"));
 ensure((await prohibited.json()).answer===refusal,
  "Dangerous how-to requests must receive only the fixed refusal");
 mockAnswer="I can't help with explicit sexual content. I can explain consent, safe sex, and sexual health instead.";
 const unsafeExpansion=await sandbox.POST(request("Tell me about the birds and bees"));
 ensure((await unsafeExpansion.json()).answer===refusal,
  "AI refusals must not contain any added sexual-health education or explanations");
 mockAnswer="Japan's capital city is Tokyo.";
 const safeAgain=await sandbox.POST(request("What is the capital of Japan?"));
 ensure((await safeAgain.json()).answer==="Japan's capital city is Tokyo.",
  "Ordinary questions must continue receiving direct factual answers after blocked questions");
 console.log("ASK NINJA INTEGRATION PASSED: direct general answers, optional story context, short input validation");
}

async function main(){
 await installOceanArt();
 await installGardenArt();
 await installFirstGradeArt();
 // The unified station is required to pass script and control validation before release.
 const stationDir=path.join(root,'station');
 const stationJs=fs.readFileSync(path.join(stationDir,'station.js'),'utf8');
 const classroomJs=fs.readFileSync(path.join(stationDir,'classroom.js'),'utf8');
 new vm.Script(stationJs,{filename:'NINJA_READER/station.js'});
 ensure(fs.readFileSync(path.resolve(__dirname,'../../api/translate.mjs'),'utf8').includes('openai/gpt-5-nano'),'translation gateway handler missing');
 const askNinjaSource=fs.readFileSync(path.resolve(__dirname,'../../api/ask-ninja.mjs'),'utf8');
 const askNinjaExecutable=askNinjaSource.replace('export async function GET','async function GET')
   .replace('export function GET','function GET')
   .replace('export async function POST','async function POST');
 new vm.Script(askNinjaExecutable,{filename:'api/ask-ninja.mjs'});
 ensure(askNinjaSource.includes('openai/gpt-5-nano')&&
   askNinjaSource.includes('ANSWER THE ACTUAL QUESTION FIRST')&&
   askNinjaSource.includes('Never restrict answers to the story')&&
   stationJs.includes('fetch("/api/ask-ninja"')&&
   !stationJs.includes('function quickNinjaAnswer'),
   'Ask Ninja must answer general school-safe questions through the AI Gateway, without the old canned response engine');
 await testAskNinjaDirectAnswer(askNinjaExecutable);


 new vm.Script(classroomJs.replace('export {init,refresh,renderMonitor};',''),{filename:'NINJA_READER/classroom.js'});
 const quickChatJs=fs.readFileSync(path.join(stationDir,'quickchat.js'),'utf8');
 new vm.Script(quickChatJs.replace('export {init,refresh};',''),{filename:'NINJA_READER/quickchat.js'});
 ensure(quickChatJs.includes('nm_q_send')&&quickChatJs.includes('nm_q_read')&&quickChatJs.includes('nm_q_teacher_reply'),'quick teacher chat is missing required private database functions');
 // Universal document reader must preserve all source words while paging content
 // through the existing four-stage story reader (not a second independent reader).
 const docCoreJs=fs.readFileSync(path.join(stationDir,'document-core.js'),'utf8');
 const studentDocsJs=fs.readFileSync(path.join(stationDir,'document-library.js'),'utf8');
 const teacherDocsJs=fs.readFileSync(path.join(stationDir,'teacher-library.js'),'utf8');
 new vm.Script(docCoreJs,{filename:'NINJA_READER/document-core.js'});
 new vm.Script(studentDocsJs,{filename:'NINJA_READER/document-library.js'});
 new vm.Script(teacherDocsJs,{filename:'NINJA_READER/teacher-library.js'});
 ensure(docCoreJs.includes('indexedDB.open')&&docCoreJs.includes('mammoth/1.9.0')&&
  docCoreJs.includes('pdfjs-dist@4.10.38')&&docCoreJs.includes('jszip@3.10.1')&&
  docCoreJs.includes('nm_reader_add_part')&&docCoreJs.includes('nm_reader_finish_doc'),
  'Universal PDF, Word, EPUB and text importer / private classroom publishing is missing');
 ensure(studentDocsJs.includes('nm_reader_status')&&studentDocsJs.includes('nm_reader_read_doc')&&
  teacherDocsJs.includes('nm_reader_room_new')&&teacherDocsJs.includes('nm_reader_set_page')&&
  teacherDocsJs.includes('core.publish'),
  'Teacher-shared documents and follow-teacher session must be connected to both workspaces');
 ensure(stationJs.includes('openImportedDocument')&&stationJs.includes('window.NMDocs.toReader')&&
  stationJs.includes('goToPage:n=>')&&stationJs.includes('showTool,'),
  'Universal imports must use the existing four-stage reader rather than an isolated replacement');
 const container={window:{},crypto:crypto.webcrypto,Uint8Array,TextEncoder,TextDecoder,URL,
  console,document:{},File:class File{}};
 vm.runInNewContext(docCoreJs,container,{timeout:3000,filename:'document-core.js'});
 const content=Array.from({length:2400},(_,i)=>'word'+i).join(' ')+'.';
 const imported=container.window.NMDocs.toReader({id:'test-doc',title:'A full document',text:content});
 ensure(imported.pages.length>2&&imported.isDocument===true&&
  imported.pages.flatMap(p=>p.lines).join(' ').replace(/\\s+/g,' ').trim()===content,
  'Document reading pagination must retain every word and page in its original order');
 ensure(/^[a-f0-9]{64}$/.test(container.window.NMDocs.secret()),
  'Teacher/student classroom secret must be 256-bit random');
 const teacherDashboardJs=fs.readFileSync(path.join(stationDir,'teacher-dashboard.js'),'utf8');
 new vm.Script(teacherDashboardJs,{filename:'NINJA_READER/teacher-dashboard.js'});
 const liveTestApi=fs.readFileSync(path.resolve(__dirname,"../../api/live-chat.mjs"),"utf8");
 ensure(liveTestApi.includes("nm_live_demo_read")&&liveTestApi.includes("nm_live_demo_add")
   &&liveTestApi.includes("Cache-Control"),"same-origin live messaging API missing");
 const liveTestJs=fs.readFileSync(path.join(stationDir,'live-test.js'),'utf8');
 new vm.Script(liveTestJs,{filename:'NINJA_READER/live-test.js'});
 ensure(liveTestJs.includes("nm_live_demo_read")&&liveTestJs.includes("nm_live_demo_add")&&
   liveTestJs.includes("window.NMLiveE2E.seal"),"encrypted teacher test messaging must remain intact");
 ensure(quickChatJs.includes('nm_q_send')&&quickChatJs.includes('nm_q_read')
   &&quickChatJs.includes('nm_q_teacher_reply'),'protected teacher inbox RPCs missing');
 const teacherDemoHtml=fs.readFileSync(path.join(stationDir,'teacher.html'),'utf8');
 ensure(teacherDemoHtml.includes('<h1>Teacher Dashboard</h1>')&&
   teacherDemoHtml.includes('id="liveTestInbox"')&&
   teacherDemoHtml.includes('id="privateInbox"')&&
   teacherDemoHtml.includes('id="teacherWorkspace"')&&
   teacherDemoHtml.includes('id="dashStudentFrame"')&&
   teacherDemoHtml.includes('id="dashStoryCards"')&&
   teacherDemoHtml.includes('id="dashLessonNotes"')&&
   teacherDemoHtml.includes('id="studentLiveLink"')&&
   teacherDemoHtml.includes('/station/teacher-dashboard.js')&&
   teacherDashboardJs.includes('import("/station/quickchat.js")')&&
   teacherDashboardJs.includes('location.origin'),
   'one-page Teacher Dashboard must combine live messaging, protected inbox, student tools, story catalog and lesson notes');
 for(const tool of ['trainer','language','pictures','questions','ninja','live','transcribe','progress','music']){
  ensure(teacherDemoHtml.includes('data-dashboard-tool="'+tool+'"')&&
   teacherDashboardJs.includes('["'+tool+'",'),
   'teacher dashboard missing accessible integrated tool '+tool);
 }
 const e2eJs=fs.readFileSync(path.join(stationDir,'live-e2e.js'),'utf8');
 new vm.Script(e2eJs,{filename:'NINJA_READER/live-e2e.js'});
 await verifyLiveEndToEndEncryption(e2eJs);
 ensure(e2eJs.includes('AES-GCM')&&e2eJs.includes('tagLength:128')&&
  e2eJs.includes('nmkey')&&e2eJs.includes('crypto.subtle.decrypt'),
  'AES-256-GCM client-side encryption library missing');
 const liveStudentJs=fs.readFileSync(path.join(stationDir,'live-student-test.js'),'utf8');
 new vm.Script(liveStudentJs,{filename:'NINJA_READER/live-student-test.js'});
 ensure(liveStudentJs.includes('/api/live-chat')&&liveStudentJs.includes('role:"student"'),
  'direct student-to-teacher test messaging is required');
 const stationHtml=fs.readFileSync(path.join(stationDir,'index.html'),'utf8');
 ensure(stationHtml.includes('id="liveStudentCryptoLabel"')&&stationHtml.includes('/station/live-e2e.js'),
 'Student message encryption status and module are required');
 ensure(teacherDemoHtml.includes('id="liveCryptoLabel"')&&teacherDemoHtml.includes('/station/live-e2e.js'),
 'Teacher message encryption status and module are required');

 ensure(stationHtml.includes('id="studentLibrary"')&&stationHtml.includes('id="studentDocumentFile"')&&
  stationHtml.includes('id="studentClassList"')&&stationHtml.includes('/station/document-core.js')&&
  stationHtml.includes('/station/document-library.js')&&
  teacherDemoHtml.includes('id="teacherLibrarySection"')&&
  teacherDemoHtml.includes('id="teacherDocFile"')&&teacherDemoHtml.includes('id="teacherClassLink"')&&
  teacherDemoHtml.includes('/station/teacher-library.js')&&teacherDemoHtml.includes('/station/document-core.js'),
  'Document library controls must appear in both Teacher and Student workspaces');
 ensure(stationHtml.includes('id="liveStudentTester"')&&stationHtml.includes('id="liveStudentPairing"')&&stationHtml.includes('id="liveStudentForm"')
  &&stationHtml.includes('/station/live-student-test.js'),'student test form is missing');
 for(const id of ['translatedTranscript','sttLanguage','translateNow','translationStatus']){
   ensure(stationHtml.includes('id="'+id+'"'),'five-language transcription is missing '+id);
 }
 for(const tool of ['trainer','language','pictures','questions','ninja','teacher','live','transcribe','progress','music']){
  ensure(stationHtml.includes('data-tool="'+tool+'"')&&stationHtml.includes('data-panel="'+tool+'"'),
    'unified toolbox missing '+tool);
 }
 for(const id of ['readAll','pausePage','trainPlay','trainPause','ninjaLocalForm','chatForm','storyLines']){
  ensure(stationHtml.includes('id="'+id+'"'),'NINJA READER missing control '+id);
 }
 const stationConfig=json(path.join(stationDir,'config.json'));
 const databaseURL=new URL(stationConfig.projectUrl);
 ensure(stationConfig.publishableKey.startsWith('sb_publishable_')
    &&databaseURL.protocol==='https:'&&databaseURL.hostname.endsWith('.supabase.co'),
   'invalid public-only classroom database configuration');

 ensure(isFile(path.join(root,"index.html")),"library home missing");
 const dirs=fs.readdirSync(path.join(root,"stories"),{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name).sort();
 ensure(dirs.length>0,"no stories present");
 let library=[];
 for(const slug of dirs){
  ensure(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug),"invalid slug "+slug);
  const dir=path.join(root,"stories",slug),m=json(path.join(dir,"manifest.json"));
  ensure(typeof m.title==="string"&&m.title.trim()&&m.title.length<200,"missing title "+slug);
  ensure(m.status==="ready"&&m.imageStatus==="complete","incomplete story "+slug);
  ensure(Array.isArray(m.pages)&&m.pages.length>0&&m.pages.length<=200,"invalid page count "+slug);
  for(const [i,p] of m.pages.entries()){
   ensure(p.page===i+1,"pages not consecutive "+slug);
   ensure(Array.isArray(p.lines)&&p.lines.length&&p.lines.every(s=>typeof s==="string"&&s.trim()),"missing text "+slug+" page "+p.page);
   ensure(typeof p.image==="string"&&/^images\/[a-z0-9_.-]+\.(webp|png|jpg|jpeg|avif)$/i.test(p.image),"unsafe image path "+slug);
   const f=path.resolve(dir,p.image);ensure(f.startsWith(path.join(dir,"images")+path.sep)&&isFile(f),"image missing "+slug+" page "+p.page);
   ensure(fs.statSync(f).size===p.imageBytes,"image size mismatch "+slug+" page "+p.page);
   ensure(digest(f)===p.sha256,"image SHA256 mismatch "+slug+" page "+p.page);
  }
  // One shared NINJA READER methodology requires complete bilingual and question packs.
  // Verify all READY stories before they can be published to the unified station.
  const packBase=slug==='seven-second-journey-grade-1'?'grade1':slug;
  const translationPath=path.join(root,'station',packBase+'-es.json');
  const quizPath=path.join(root,'station',packBase+'-questions.json');
  ensure(isFile(translationPath),'missing Spanish learning pack: '+slug);
  ensure(isFile(quizPath),'missing bilingual comprehension pack: '+slug);
  const tr=json(translationPath),quiz=json(quizPath);
  ensure(tr.slug===slug&&Array.isArray(tr.spanish?.lines)&&tr.spanish.lines.length===m.pages.length,
    'Spanish page alignment failed: '+slug);
  ensure(tr.spanish.lines.every((lines,i)=>Array.isArray(lines)&&lines.length===m.pages[i].lines.length
    &&lines.every(s=>typeof s==='string'&&s.trim())), 'Spanish sentence alignment failed: '+slug);
  ensure(Array.isArray(tr.spanish.vocabulary)&&tr.spanish.vocabulary.every(v=>v&&typeof v.word==='string'
    &&v.word.trim()&&typeof v.meaning==='string'&&v.meaning.trim()), 'Spanish vocabulary missing: '+slug);
  ensure(quiz.slug===slug&&Array.isArray(quiz.questions)&&quiz.questions.length===m.pages.length,
    'quiz page alignment failed: '+slug);
  ensure(quiz.questions.every(items=>Array.isArray(items)&&items.length===2&&items.every(q=>Array.isArray(q)
    &&q.length===5&&typeof q[0]==='string'&&q[0].trim()&&typeof q[1]==='string'&&q[1].trim()
    &&Array.isArray(q[2])&&q[2].length===3&&q[2].every(v=>typeof v==='string'&&v.trim())
    &&Array.isArray(q[3])&&q[3].length===3&&q[3].every(v=>typeof v==='string'&&v.trim())
    &&Number.isInteger(q[4])&&q[4]>=0&&q[4]<3)), 'bilingual multiple-choice question validation failed: '+slug);
  const level=String(m.readingLevel||'');
  const grade=/^(K|Kindergarten)$/i.test(level)?'K':Number(level.match(/^(?:Grade\s+)?(1[0-2]|[1-9])$/i)?.[1]);
  ensure(grade==='K'||(grade>=1&&grade<=12),'readingLevel must identify K or Grade 1–12: '+slug);
  ensure(!m.vocabulary||(Array.isArray(m.vocabulary)&&m.vocabulary.every(v=>v&&['word','meaning'].every(k=>typeof v[k]==='string'&&v[k].trim())&&(!v.say||typeof v.say==='string'))),'invalid vocabulary '+slug);
  library.push({languages:['en','es'], bilingualQuestions:m.pages.length*2,grade,description:typeof m.description==='string'?m.description:'Explore '+m.title+' with illustrations and reading support.',topics:Array.isArray(m.topics)?m.topics.filter(t=>typeof t==='string'):['Adventure'],slug,title:m.title,readingLevel:m.readingLevel||"",pages:m.pages.length,href:"/stories/"+slug+"/",cover:"/stories/"+slug+"/"+(m.coverImage||m.pages[0].image)});
 }
 ensure(json(path.join(root,"health.json")).service==="ninja-moons-publishing-lab","wrong publishing project");
 fs.rmSync(out,{recursive:true,force:true});fs.cpSync(root,out,{recursive:true,filter:p=>!p.includes(path.sep+"publisher"+path.sep)&&!p.endsWith("image-sources.json")});
 for(const s of library){
  const f=path.join(out,"stories",s.slug,"index.html"),m=json(path.join(root,"stories",s.slug,"manifest.json"));
  if(m.generatedReader===true||!isFile(f))fs.writeFileSync(f,generate(m));
  const sentences=m.pages.flatMap(p=>p.lines.map(text=>({text,page:p.page,simple:''}))).map((line,i)=>({...line,number:i+1}));
  fs.writeFileSync(path.join(out,'stories',s.slug,'reader.json'),JSON.stringify({version:1,slug:s.slug,title:m.title,grade:s.grade,sentences,vocabulary:m.vocabulary||[]},null,2));
  const navigation='<nav aria-label="NINJA MOONS reading links" style="padding:16px;text-align:center;background:#071a32;color:#b4edff"><a style="color:inherit;margin:12px" href="https://ninjamoons.vercel.app/reader?level='+s.grade+'">← Story library</a><a style="color:inherit;margin:12px" href="/station/?story='+s.slug+'">🥷 All tools · NINJA Toolbox</a><a style="color:inherit;margin:12px" href="https://ninjamoons.vercel.app/reading-helper?story='+s.slug+'">Original Reading Helper</a></nav>';
  fs.writeFileSync(f,addNavigation(fs.readFileSync(f,'utf8').replace('</body>',navigation+'</body>').replace('href="/">← Publishing Lab Library','href="https://ninjamoons.vercel.app/reader?level=All">← Story library')));
 }
 fs.cpSync(path.resolve(__dirname,'../../integrations/brand'),path.join(out,'brand'),{recursive:true});
 // Serve the verified universal NINJA READER through the same stable publishing domain.
 const helperSource=path.resolve(__dirname,"../../integrations/main-library/helper.html");
 ensure(isFile(helperSource),"universal reading helper source missing");
 fs.copyFileSync(helperSource,path.join(out,"reading-helper.html"));
 fs.writeFileSync(path.join(out,"catalog.json"),JSON.stringify({version:1,stories:library},null,2));

 // Add future stories automatically to the test library without changing the existing featured story.
 // DOM construction uses textContent rather than untrusted HTML.
 // The publishing domain is now a simple two-entry portal.
 // All stories are opened from Student Station, and teacher tools stay on Teacher Dashboard.
 const homepagePath=path.join(out,"index.html"),homepage=fs.readFileSync(homepagePath,"utf8");
 ensure(homepage.includes('Open Student Station')&&homepage.includes('Open Teacher Dashboard')&&
   homepage.includes('href="/station/"')&&homepage.includes('href="/station/teacher.html"'),
   'homepage must expose exactly the two classroom stations');
 fs.writeFileSync(homepagePath,homepage);
 
 fs.writeFileSync(path.join(out,"health.json"),JSON.stringify({service:"ninja-moons-publishing-lab",status:"ok",mode:"isolated",validatedStories:library.length,validatedPages:library.reduce((v,s)=>v+s.pages,0),illustrations:"complete"},null,2));
 console.log("PUBLISH VALIDATION PASSED:",library.length,"stories,",library.reduce((v,s)=>v+s.pages,0),"pages; illustration checksums match");
}
main().catch(e=>{console.error(e.message);process.exit(1)})
