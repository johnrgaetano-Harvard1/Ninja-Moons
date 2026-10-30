#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(__dirname,".."),out=path.resolve(process.cwd(),"dist");
function ensure(cond,why){if(!cond)throw Error("PUBLISH BLOCKED: "+why)}
function json(file){return JSON.parse(fs.readFileSync(file,"utf8"))}
function isFile(file){return fs.statSync(file,{throwIfNoEntry:false})?.isFile()}
function digest(file){return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function generate(story){
 const p=JSON.stringify(story.pages.map(p=>({page:p.page,lines:p.lines,image:p.image}))).replace(/</g,"\\u003c");
 const header='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(story.title)+' — NINJA MOONS</title><style>body{background:#0a1830;color:white;font-family:system-ui;margin:auto;max-width:1000px;padding:20px}a{color:#8ee9ff}img{width:100%;aspect-ratio:16/9;object-fit:contain;background:#06112a}p{font-size:clamp(23px,3vw,34px);line-height:1.5}button{border:0;border-radius:10px;background:#9ee8ff;color:#07142b;padding:12px 18px;font-weight:800;margin:5px}button:disabled{opacity:.4}</style></head><body><a href="/">← All stories</a><h1>'+esc(story.title)+'</h1><div id="number"></div><img id="art" alt="Story illustration"><div id="lines"></div><nav><button id="back">← Back</button><button id="hear">🔊 Hear</button><button id="stop">Stop</button><button id="next">Next →</button></nav>';
 const script="const pages="+p+";let n=0;const el=id=>document.getElementById(id);function say(t){if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='en-US';window.speechSynthesis.speak(u)}function draw(){const p=pages[n];el('number').textContent='Page '+(n+1)+' of '+pages.length;el('art').src=p.image;el('art').alt='Illustration for page '+p.page;el('lines').replaceChildren(...p.lines.map(x=>{let e=document.createElement('p');e.textContent=x;e.onclick=()=>say(x);return e}));el('back').disabled=n===0;el('next').textContent=n===pages.length-1?'Start again ↻':'Next →'}el('back').onclick=()=>{n=Math.max(0,n-1);draw()};el('next').onclick=()=>{n=(n+1)%pages.length;draw()};el('hear').onclick=()=>say(pages[n].lines.join(' '));el('stop').onclick=()=>window.speechSynthesis?.cancel();draw()";
 return header+"<script>"+script+"</script></body></html>";
}
function main(){
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
  library.push({slug,title:m.title,readingLevel:m.readingLevel||"",pages:m.pages.length,href:"/stories/"+slug+"/",cover:"/stories/"+slug+"/"+m.pages[0].image});
 }
 ensure(json(path.join(root,"health.json")).service==="ninja-moons-publishing-lab","wrong publishing project");
 fs.rmSync(out,{recursive:true,force:true});fs.cpSync(root,out,{recursive:true,filter:p=>!p.includes(path.sep+"publisher"+path.sep)});
 for(const s of library){
  const f=path.join(out,"stories",s.slug,"index.html"),m=json(path.join(root,"stories",s.slug,"manifest.json"));
  if(m.generatedReader===true||!isFile(f))fs.writeFileSync(f,generate(m));
 }
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
 fs.writeFileSync(homepagePath,homepage.replace("</body>",insert+"</body>"));

 fs.writeFileSync(path.join(out,"health.json"),JSON.stringify({service:"ninja-moons-publishing-lab",status:"ok",mode:"isolated",validatedStories:library.length,validatedPages:library.reduce((v,s)=>v+s.pages,0),illustrations:"complete"},null,2));
 console.log("PUBLISH VALIDATION PASSED:",library.length,"stories,",library.reduce((v,s)=>v+s.pages,0),"pages; illustration checksums match");
}
try{main()}catch(e){console.error(e.message);process.exit(1)}
