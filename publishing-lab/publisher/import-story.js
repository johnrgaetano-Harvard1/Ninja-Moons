#!/usr/bin/env node
"use strict";
/**
 * NINJA MOONS import step. No external dependencies or credentials.
 *
 * Usage:
 *   node publishing-lab/publisher/import-story.js --source /path/to/story --slug my-story --check
 *   node publishing-lab/publisher/import-story.js --source /path/to/story --slug my-story
 *
 * Input story folder:
 *   story.json with {title,readingLevel,pages:[{lines:["..."],image:"images/01.webp"},...]}
 *   images/ containing the named files
 * Optional: index.html to preserve a custom reader; otherwise the generic reader is generated during build.
 *
 * Important: Existing stories can never be overwritten with this command.
 */
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const args=process.argv.slice(2);
const flag=(name)=>{const i=args.indexOf(name);return i<0?null:(args[i+1]||null)};
const isFile=p=>fs.statSync(p,{throwIfNoEntry:false})?.isFile()===true;
const validText=s=>typeof s==="string"&&s.trim().length>0&&s.length<=2000;
function fail(s){throw Error("STORY IMPORT BLOCKED: "+s)}
function importStory(){
 const sourceArg=flag("--source"),slug=flag("--slug"),check=args.includes("--check");
 if(!sourceArg||!slug)fail("usage: --source <story folder> --slug <lowercase-hyphenated-slug> [--check]");
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))fail("invalid slug");
 const source=path.resolve(sourceArg),input=path.join(source,"story.json");
 if(!isFile(input))fail("story.json missing");
 const story=JSON.parse(fs.readFileSync(input,"utf8"));
 if(!validText(story.title)||story.title.length>200)fail("invalid story title");
 if(!Array.isArray(story.pages)||!story.pages.length||story.pages.length>200)fail("page count must be 1..200");
 if(!/^(K|Kindergarten|(?:Grade\s+)?(?:1[0-2]|[1-9]))$/i.test(story.readingLevel||''))fail('readingLevel must be K, Kindergarten, or Grade 1–12');
 if(story.vocabulary&&(!Array.isArray(story.vocabulary)||!story.vocabulary.every(v=>v&&validText(v.word)&&validText(v.meaning)&&(!v.say||validText(v.say)))))fail('invalid vocabulary');
 const destination=path.resolve(__dirname,"..","stories",slug);
 if(fs.existsSync(destination))fail("destination already exists: "+slug+"; existing stories are protected");
 const outPages=[],images=[];
 for(const [idx,p] of story.pages.entries()){
   if(!Array.isArray(p.lines)||p.lines.length===0||!p.lines.every(validText))fail("invalid text on page "+(idx+1));
   if(typeof p.image!=="string"||!/^images\/[a-zA-Z0-9_.-]+\.(webp|png|jpg|jpeg|avif)$/.test(p.image))fail("unsafe image path on page "+(idx+1));
   const f=path.resolve(source,p.image);
   if(!f.startsWith(path.join(source,"images")+path.sep))fail("image escaped source folder");
   if(!isFile(f)||fs.lstatSync(f).isSymbolicLink())fail("image missing or is symlink: "+p.image);
   const suffix=path.extname(p.image).toLowerCase(),basename="page-"+String(idx+1).padStart(2,"0")+suffix;
   const dst="images/"+basename;
   const buf=fs.readFileSync(f);
   if(buf.length<1000||buf.length>30*1024*1024)fail("image must be 1 KB to 30 MB: page "+(idx+1));
   const hash=crypto.createHash("sha256").update(buf).digest("hex");
   outPages.push({page:idx+1,lines:p.lines,image:dst,imageBytes:buf.length,sha256:hash});
   images.push({source:f,target:dst});
 }
 const manifest={title:story.title,readingLevel:story.readingLevel||"Reader",status:"ready",imageStatus:"complete",generatedReader:story.generatedReader!==false,pages:outPages,vocabulary:story.vocabulary||[],description:typeof story.description==="string"?story.description:"",topics:Array.isArray(story.topics)?story.topics.filter(t=>typeof t==="string"):[]};
 if(check){console.log(JSON.stringify({result:"PASS",slug,pages:outPages.length,totalImageBytes:outPages.reduce((v,p)=>v+p.imageBytes,0),mode:"check-only"},null,2));return}
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"nm-import-"));
 try{
   fs.mkdirSync(path.join(tmp,"images"),{recursive:true});
   for(const p of images)fs.copyFileSync(p.source,path.join(tmp,p.target));
   fs.writeFileSync(path.join(tmp,"manifest.json"),JSON.stringify(manifest,null,2));
   const custom=path.join(source,"index.html");
   if(isFile(custom)&&story.generatedReader===false)fs.copyFileSync(custom,path.join(tmp,"index.html"));
   fs.mkdirSync(path.dirname(destination),{recursive:true});
   fs.cpSync(tmp,destination,{recursive:true,errorOnExist:true,force:false});
   console.log(JSON.stringify({result:"IMPORTED",slug,pages:outPages.length,folder:destination},null,2));
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
}
try{importStory()}catch(e){console.error(e.message);process.exit(1)}
