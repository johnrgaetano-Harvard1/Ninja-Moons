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

 new vm.Script(classroomJs.replace('export {init,refresh,renderMonitor};',''),{filename:'NINJA_READER/classroom.js'});
 const quickChatJs=fs.readFileSync(path.join(stationDir,'quickchat.js'),'utf8');
 new vm.Script(quickChatJs.replace('export {init,refresh};',''),{filename:'NINJA_READER/quickchat.js'});
 ensure(quickChatJs.includes('nm_q_send')&&quickChatJs.includes('nm_q_read')&&quickChatJs.includes('nm_q_teacher_reply'),'quick teacher chat is missing required private database functions');
 const teacherDemoJs=fs.readFileSync(path.join(stationDir,'teacher-demo.js'),'utf8');
 new vm.Script(teacherDemoJs,{filename:'NINJA_READER/teacher-demo.js'});
 const liveTestApi=fs.readFileSync(path.resolve(__dirname,"../../api/live-chat.mjs"),"utf8");
 ensure(liveTestApi.includes("nm_live_demo_read")&&liveTestApi.includes("nm_live_demo_add")
   &&liveTestApi.includes("Cache-Control"),"same-origin live messaging API missing");
 const liveTestJs=fs.readFileSync(path.join(stationDir,'live-test.js'),'utf8');
 new vm.Script(liveTestJs,{filename:'NINJA_READER/live-test.js'});
 ensure(liveTestJs.includes('nm_live_demo_create')&&liveTestJs.includes('nm_live_demo_read')
  &&liveTestJs.includes('nm_live_demo_add'),'cross-device live teacher RPCs missing');
 ensure(quickChatJs.includes('nm_live_demo_read')&&quickChatJs.includes('nm_live_demo_add'),
  'student Ask Teacher must connect to live test room');
 const teacherDemoHtml=fs.readFileSync(path.join(stationDir,'teacher.html'),'utf8');
 ensure(teacherDemoHtml.includes('id="demoInbox"')&&teacherDemoHtml.includes('id="privateInbox"')
  &&teacherDemoHtml.includes('id="liveTestInbox"')&&teacherDemoHtml.includes('id="studentLiveLink"')&&teacherDemoJs.includes('sessionStorage'),
  'no-login demonstration and protected teacher inbox must both be present');
 const liveStudentJs=fs.readFileSync(path.join(stationDir,'live-student-test.js'),'utf8');
 new vm.Script(liveStudentJs,{filename:'NINJA_READER/live-student-test.js'});
 ensure(liveStudentJs.includes('/api/live-chat')&&liveStudentJs.includes('role:"student"'),
  'direct student-to-teacher test messaging is required');
 const stationHtml=fs.readFileSync(path.join(stationDir,'index.html'),'utf8');
 ensure(stationHtml.includes('id="liveStudentTester"')&&stationHtml.includes('id="liveStudentForm"')
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
 const homepagePath=path.join(out,"index.html"),homepage=fs.readFileSync(homepagePath,"utf8");
 const insert=String.raw`<script>
 (async function(){
  try{
   const response=await fetch('/catalog.json',{cache:'no-store'});
   if(!response.ok)throw Error('catalog missing');
   const catalog=await response.json();
   const extra=(catalog.stories||[]).filter(story=>story.slug!=='zoom-trip');
   if(!extra.length)return;
   const main=document.querySelector('main');if(!main)return;
   const heading=document.createElement('h2');heading.textContent='More NINJA MOONS Stories';heading.style.marginTop='36px';main.append(heading);
   for(const story of extra){
    const card=document.createElement('section');card.className='book';
    const img=document.createElement('img');img.className='cover';img.src=story.cover;img.alt='Illustration from '+story.title;
    const info=document.createElement('div');info.className='details';
    const title=document.createElement('h2');title.textContent=story.title;
    const level=document.createElement('p');level.className='small';level.textContent=(story.readingLevel||'Reader')+' · '+story.pages+' pages';
    const link=document.createElement('a');link.className='link';link.href='/station/?story='+encodeURIComponent(story.slug);link.textContent='📖 Open All Story Tools';
    info.append(title,level,link);card.append(img,info);main.append(card);
   }
  }catch(e){console.warn('Story catalog unavailable',e)}
 })();
 </script>`;
 ensure(homepage.includes("</body>"),"library homepage missing closing body");
 fs.writeFileSync(homepagePath,addNavigation(homepage.replace("</body>",insert+"</body>")));

 fs.writeFileSync(path.join(out,"health.json"),JSON.stringify({service:"ninja-moons-publishing-lab",status:"ok",mode:"isolated",validatedStories:library.length,validatedPages:library.reduce((v,s)=>v+s.pages,0),illustrations:"complete"},null,2));
 console.log("PUBLISH VALIDATION PASSED:",library.length,"stories,",library.reduce((v,s)=>v+s.pages,0),"pages; illustration checksums match");
}
main().catch(e=>{console.error(e.message);process.exit(1)})
