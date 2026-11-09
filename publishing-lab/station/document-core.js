"use strict";
// Universal reading import core. Personal text stays inside this browser until
// the teacher explicitly chooses Share to Class. Render imported text as textContent.
(function(){
 const DB_NAME="nm-universal-reading-v1",STORE="documents",memory=new Map();
 const CONFIG="/station/config.json";
 let openPromise=null,configPromise=null;
 const allowed=/\.(txt|md|text|pdf|docx|epub)$/i;
 const count=text=>(String(text||"").trim().match(/\S+/g)||[]).length;
 const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
 function newId(){return typeof crypto.randomUUID==="function"?crypto.randomUUID():[...crypto.getRandomValues(new Uint8Array(16))].map(x=>x.toString(16).padStart(2,"0")).join("")}
 function normalize(text){
  if(typeof text!=="string")throw Error("This document has no readable text.");
  const clean=text.replace(/\r\n?/g,"\n").replace(/\u0000/g,"").replace(/[\t ]{2,}/g," ")
   .replace(/\n{5,}/g,"\n\n\n").trim();
  if(!clean)throw Error("This document has no readable text. Scanned PDFs need OCR first.");
  return clean;
 }
 function loadScript(url,globalName){
  if(globalName&&window[globalName])return Promise.resolve(window[globalName]);
  return new Promise((resolve,reject)=>{
   const tag=document.createElement("script");
   tag.src=url;tag.async=true;tag.crossOrigin="anonymous";
   tag.onload=()=>window[globalName]?resolve(window[globalName]):reject(Error("Reader parser did not start."));
   tag.onerror=()=>reject(Error("The document parser could not load. Check your Internet connection."));
   document.head.append(tag);
  });
 }
 async function extract(file,onProgress=()=>{}){
  if(!(file instanceof File))throw Error("Choose a file to open.");
  if(file.size>35*1024*1024)throw Error("The browser import limit is 35 MB per file. Split a larger book into chapters.");
  if(!allowed.test(file.name))throw Error("Supported files: PDF, DOCX, EPUB, TXT, Markdown.");
  const extension=file.name.split(".").at(-1).toLowerCase();
  onProgress("Reading "+file.name+"…");
  let text="";
  if(["txt","text","md"].includes(extension)){text=await file.text();}
  else if(extension==="docx"){
   const mammoth=await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.9.0/mammoth.browser.min.js","mammoth");
   const data=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
   text=data.value;
  }else if(extension==="pdf"){
   const base="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/";
   const pdfjs=await import(base+"pdf.mjs");
   pdfjs.GlobalWorkerOptions.workerSrc=base+"pdf.worker.min.mjs";
   const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true}).promise;
   const parts=[];
   for(let p=1;p<=pdf.numPages;p++){
    if(p%10===0)onProgress("Extracting PDF page "+p+" of "+pdf.numPages+"…");
    const page=await pdf.getPage(p);
    const tc=await page.getTextContent();
    let line="",prevY=null;const lines=[];
    for(const item of tc.items){
     if(typeof item.str!=="string")continue;
     const y=item.transform?.[5]??prevY;
     if(prevY!==null&&Math.abs(y-prevY)>6){if(line.trim())lines.push(line.trim());line="";}
     line+=item.str+(item.hasEOL?"\n":" ");
     prevY=y;
     if(item.hasEOL){if(line.trim())lines.push(line.trim());line="";prevY=null;}
    }
    if(line.trim())lines.push(line.trim());
    parts.push(lines.join("\n"));
    page.cleanup();
   }
   text=parts.join("\n\n");
   pdf.destroy();
  }else if(extension==="epub"){
   const JSZip=await loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js","JSZip");
   const zip=await JSZip.loadAsync(await file.arrayBuffer());
   const containerFile=zip.file("META-INF/container.xml");
   if(!containerFile)throw Error("The EPUB package is missing its container.");
   const parse=xml=>new DOMParser().parseFromString(xml,"application/xml");
   const root=parse(await containerFile.async("text")).querySelector("rootfile");
   const opfPath=root?.getAttribute("full-path");
   if(!opfPath||!zip.file(opfPath))throw Error("EPUB reading order could not be located.");
   const packageDoc=parse(await zip.file(opfPath).async("text"));
   const items=new Map([...packageDoc.getElementsByTagName("*")].filter(x=>x.localName==="item")
    .map(x=>[x.getAttribute("id"),x.getAttribute("href")]));
   const spine=[...packageDoc.getElementsByTagName("*")].filter(x=>x.localName==="itemref");
   const dir=opfPath.includes("/")?opfPath.slice(0,opfPath.lastIndexOf("/")+1):"";
   const parts=[];
   for(let i=0;i<spine.length;i++){
    const href=items.get(spine[i].getAttribute("idref"));if(!href)continue;
    const folder=(dir+decodeURIComponent(href.split("#")[0])).split("/");
    const resolved=[];for(const bit of folder){if(bit==="..")resolved.pop();else if(bit&&bit!==".")resolved.push(bit)}
    const entry=zip.file(resolved.join("/"));if(!entry)continue;
    if(i%10===0)onProgress("Reading EPUB chapter "+(i+1)+" of "+spine.length+"…");
    const dom=new DOMParser().parseFromString(await entry.async("text"),"application/xhtml+xml");
    const target=dom.querySelector("body")||dom.documentElement;
    [...target.querySelectorAll("script,style,nav")].forEach(node=>node.remove());
    const plain=target.textContent||"";
    if(plain.trim())parts.push(plain.trim());
   }
   text=parts.join("\n\n");
  }
  return {title:file.name.replace(/\.(txt|md|text|pdf|docx|epub)$/i,"").slice(0,130),text:normalize(text),source:extension};
 }
 // Import a publicly accessible direct document URL. Browser fetch respects the
 // source site's CORS and permissions; no arbitrary server-side URL proxy or SSRF.
 async function fromURL(input,onProgress=()=>{}){
  let url;
  try{url=new URL(String(input||"").trim())}catch{throw Error("Enter a complete https:// link.")}
  if(url.protocol!=="https:"||url.username||url.password||url.port||url.href.length>1800)
   throw Error("Use a normal public https:// document link.");
  const host=url.hostname.toLowerCase();
  if(host==="localhost"||host.endsWith(".local")||host.endsWith(".internal")||
     /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)||host.includes(":"))
   throw Error("Only public document websites are supported.");
  // Public-domain Gutenberg book landing pages resolve to its plain text.
  const book=url.pathname.match(/^\/ebooks\/(\d{1,7})\/?$/);
  if((host==="www.gutenberg.org"||host==="gutenberg.org")&&book){
   url=new URL("https://www.gutenberg.org/cache/epub/"+book[1]+"/pg"+book[1]+".txt");
  }
  const ext=(url.pathname.match(/\.(pdf|docx|epub|txt|text|md)$/i)||[])[1];
  if(!ext)throw Error("Use a direct PDF, DOCX, EPUB, or TXT file link, or a Project Gutenberg book page.");
  onProgress("Downloading public reading from "+url.hostname+"…");
  let response;
  try{response=await fetch(url.href,{mode:"cors",credentials:"omit",redirect:"follow",signal:AbortSignal.timeout(25000)})}
  catch{throw Error("The source website blocked direct importing or did not respond. Download the file there, then use Upload Document here.")}
  if(!response.ok)throw Error("The document website returned HTTP "+response.status+". Download the file and upload it instead.");
  const size=Number(response.headers.get("content-length")||0);
  if(size>35*1024*1024)throw Error("This document exceeds the 35 MB import limit.");
  const type=(response.headers.get("content-type")||"").toLowerCase();
  if(type.includes("text/html"))throw Error("That link returned a webpage instead of a document. Use a direct file link.");
  const blob=await response.blob();
  if(blob.size>35*1024*1024)throw Error("This document exceeds the 35 MB import limit.");
  const name=decodeURIComponent(url.pathname.split("/").pop()||"online-reading").replace(/[^a-zA-Z0-9 ._-]/g,"_").slice(0,130);
  const file=new File([blob],name.endsWith("."+ext)?name:name+"."+ext,{type:type||"application/octet-stream"});
  const result=await extract(file,onProgress);
  result.source="web-"+ext;
  result.url=url.href;
  return result;
 }
 function toReader(doc){
  if(!doc||typeof doc.text!=="string")throw Error("Document has no text.");
  const text=normalize(doc.text),lines=[];
  // Segment by sentence when available; long sentences are split by words.
  for(const para of text.split(/\n{1,}/)){
   if(!para.trim())continue;
   const candidates=para.match(/[^.!?]+(?:[.!?]+|$)/g)||[para];
   for(const chunk of candidates){
    const words=chunk.trim().split(/\s+/).filter(Boolean);
    for(let i=0;i<words.length;i+=32)lines.push(words.slice(i,i+32).join(" "));
   }
  }
  if(!lines.length)lines.push(text.slice(0,250));
  const pages=[],maxWords=175,maxLines=9;let group=[],words=0;
  const append=()=>{if(group.length){pages.push({page:pages.length+1,title:"Reading section "+(pages.length+1),image:"",alt:"Imported reading document",lines:group});group=[];words=0;}};
  for(const line of lines){
   const amount=count(line);
   if(group.length&&(group.length>=maxLines||words+amount>maxWords))append();
   group.push(line);words+=amount;
  }append();
  return {title:doc.title||"Untitled document",readingLevel:"Imported document",pages,
    vocabulary:[],isDocument:true,documentId:doc.id,wordCount:doc.words||count(text)};
 }
 function openDB(){
  if(openPromise)return openPromise;
  openPromise=new Promise((resolve,reject)=>{
   if(!window.indexedDB){reject(Error("This browser does not support offline document storage."));return}
   const request=indexedDB.open(DB_NAME,1);
   request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"})};
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error||Error("Document library storage could not open."));
  });
  return openPromise;
 }
 async function transaction(mode,action){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
   const request=action(store);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error||Error("Library operation failed."));
  });
 }
 async function save(input){
  const doc={id:input.id||newId(),title:String(input.title||"Untitled reading").slice(0,150),
   text:normalize(input.text),source:String(input.source||"paste").slice(0,30),
   words:count(input.text),created:input.created||Date.now()};
  try{await transaction("readwrite",store=>store.put(doc))}
  catch(error){if(error?.name==="QuotaExceededError")throw Error("This browser's storage is full. Delete an older personal document.");throw error}
  memory.set(doc.id,doc);
  return doc;
 }
 async function get(id){
  if(memory.has(id))return memory.get(id);
  const doc=await transaction("readonly",store=>store.get(id));
  if(doc)memory.set(id,doc);
  return doc||null;
 }
 async function list(){
  const docs=await transaction("readonly",store=>store.getAll());
  return (docs||[]).sort((a,b)=>b.created-a.created).map(({id,title,words,source,created})=>({id,title,words,source,created}));
 }
 async function remove(id){
  await transaction("readwrite",store=>store.delete(id));
  memory.delete(id);
 }
 async function cfg(){
  if(!configPromise)configPromise=fetch(CONFIG,{cache:"no-store"}).then(async r=>{
   if(!r.ok)throw Error("Classroom connection settings are unavailable.");
   const obj=await r.json();
   if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(obj.projectUrl)||!String(obj.publishableKey).startsWith("sb_publishable_"))
    throw Error("Invalid classroom connection settings.");
   return obj;
  });
  return configPromise;
 }
 async function rpc(name,params){
  if(!/^nm_reader_[a-z_]+$/.test(name))throw Error("Unknown classroom action.");
  const conf=await cfg();
  const response=await fetch(conf.projectUrl+"/rest/v1/rpc/"+name,{
   method:"POST",headers:{"apikey":conf.publishableKey,
    "Authorization":"Bearer "+conf.publishableKey,"Content-Type":"application/json"},
   body:JSON.stringify(params),cache:"no-store"
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw Error(data?.message||"The classroom session is unavailable.");
  return data;
 }
 async function publish(room,doc,onProgress=()=>{}){
  if(!room?.id||!room?.teacherKey)throw Error("Start a teacher session first.");
  const txt=normalize(doc.text);
  if(txt.length>1220000)throw Error("This temporary class session supports about 1.2 million characters. Split longer books into smaller lessons. Your personal reader has no word-count setting.");
  const chunks=[];
  for(let offset=0;offset<txt.length;offset+=18000)chunks.push(txt.slice(offset,offset+18000));
  if(chunks.length>120)throw Error("The classroom session cannot hold this document. Divide it into chapters.");
  const docId=await rpc("nm_reader_start_doc",{p_room:room.id,p_key:room.teacherKey,
   p_title:doc.title,p_parts:chunks.length,p_words:count(txt)});
  for(let i=0;i<chunks.length;i++){
   onProgress("Sharing part "+(i+1)+" of "+chunks.length+"…");
   await rpc("nm_reader_add_part",{p_room:room.id,p_key:room.teacherKey,p_doc:docId,p_part:i,p_content:chunks[i]});
  }
  await rpc("nm_reader_finish_doc",{p_room:room.id,p_key:room.teacherKey,p_doc:docId});
  return docId;
 }
 window.NMDocs=Object.freeze({extract,fromURL,toReader,save,get,list,remove,count,secret,rpc,publish,
  remember:doc=>{if(!doc?.id)throw Error("Document id required.");memory.set(doc.id,doc);return doc}});
})();
