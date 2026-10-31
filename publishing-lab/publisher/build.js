#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
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
async function main(){
 await installOceanArt();
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
  const level=String(m.readingLevel||'');
  const grade=/^(K|Kindergarten)$/i.test(level)?'K':Number(level.match(/^(?:Grade\s+)?(1[0-2]|[1-9])$/i)?.[1]);
  ensure(grade==='K'||(grade>=1&&grade<=12),'readingLevel must identify K or Grade 1–12: '+slug);
  ensure(!m.vocabulary||(Array.isArray(m.vocabulary)&&m.vocabulary.every(v=>v&&['word','meaning'].every(k=>typeof v[k]==='string'&&v[k].trim())&&(!v.say||typeof v.say==='string'))),'invalid vocabulary '+slug);
  library.push({grade,description:typeof m.description==='string'?m.description:'Explore '+m.title+' with illustrations and reading support.',topics:Array.isArray(m.topics)?m.topics.filter(t=>typeof t==='string'):['Adventure'],slug,title:m.title,readingLevel:m.readingLevel||"",pages:m.pages.length,href:"/stories/"+slug+"/",cover:"/stories/"+slug+"/"+(m.coverImage||m.pages[0].image)});
 }
 ensure(json(path.join(root,"health.json")).service==="ninja-moons-publishing-lab","wrong publishing project");
 fs.rmSync(out,{recursive:true,force:true});fs.cpSync(root,out,{recursive:true,filter:p=>!p.includes(path.sep+"publisher"+path.sep)});
 for(const s of library){
  const f=path.join(out,"stories",s.slug,"index.html"),m=json(path.join(root,"stories",s.slug,"manifest.json"));
  if(m.generatedReader===true||!isFile(f))fs.writeFileSync(f,generate(m));
  const sentences=m.pages.flatMap(p=>p.lines.map(text=>({text,page:p.page,simple:''}))).map((line,i)=>({...line,number:i+1}));
  fs.writeFileSync(path.join(out,'stories',s.slug,'reader.json'),JSON.stringify({version:1,slug:s.slug,title:m.title,grade:s.grade,sentences,vocabulary:m.vocabulary||[]},null,2));
  const navigation='<nav aria-label="NINJA MOONS reading links" style="padding:16px;text-align:center;background:#071a32;color:#b4edff"><a style="color:inherit;margin:12px" href="https://ninjamoons.vercel.app/reader?level='+s.grade+'">← Story library</a><a style="color:inherit;margin:12px" href="https://ninjamoons.vercel.app/reading-helper?story='+s.slug+'">Read with NINJA Helper →</a></nav>';
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
    const link=document.createElement('a');link.className='link';link.href=story.href;link.textContent='📖 Open Illustrated Story';
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
