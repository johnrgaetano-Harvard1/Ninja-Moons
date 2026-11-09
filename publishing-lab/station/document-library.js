"use strict";
// Student library. Personal text never leaves the browser unless a teacher
// intentionally publishes a selected lesson to a private class session.
(function(){
 const $=id=>document.getElementById(id);
 const core=window.NMDocs;
 if(!core){const e=$("studentLibraryStatus");if(e)e.textContent="The document importer could not load.";return}
 const status=msg=>{$("studentLibraryStatus").textContent=msg};
 const classStatus=msg=>{$("studentClassStatus").textContent=msg};
 const classList=$("studentClassList"),ownList=$("studentDocumentList");
 const session={id:null,key:null,docs:new Map(),active:null,follow:true,lastPage:0,loading:null,busy:false};
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const secret=/^[a-f0-9]{64}$/;
 const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
 const ready=()=>!!window.NM_STATION?.openDocument;
 const waitReady=()=>new Promise((resolve,reject)=>{
  let tries=0;const t=setInterval(()=>{
   if(ready()){clearInterval(t);resolve();return}
   if(++tries>80){clearInterval(t);reject(Error("Reader has not finished loading."))}
  },100);
 });
 async function openDocument(data){
  await waitReady();
  window.NM_STATION.openDocument(data);
  $("storyDock").scrollIntoView({behavior:"smooth",block:"start"});
  status("Opened "+data.title+" in Ninja Reader. Use Read All, the four stages, or word taps below.");
 }
 async function showOwned(){
  ownList.replaceChildren();
  try{
   const docs=await core.list();
   if(!docs.length){ownList.append(make("p","library-helper","Your personal library is empty. Upload or paste a reading above."));return}
   for(const doc of docs){
    const item=make("div","library-item");
    const info=make("div","library-item-details");
    info.append(make("strong","",doc.title),make("small","",(doc.words||0).toLocaleString()+" words · "+(doc.source||"text")));
    const open=make("button","library-button","Read");open.type="button";
    open.onclick=async()=>{
     try{const d=await core.get(doc.id);if(!d)throw Error("Document not found.");await openDocument(d)}
     catch(err){status("Could not open: "+err.message)}
    };
    const del=make("button","library-button muted","Delete");del.type="button";
    del.onclick=async()=>{
     if(!confirm('Delete "'+doc.title+'" from this browser?'))return;
     try{await core.remove(doc.id);await showOwned();status("Personal document deleted from this device.")}
     catch(err){status("Could not delete: "+err.message)}
    };
    item.append(info,open,del);ownList.append(item);
   }
  }catch(err){ownList.append(make("p","library-error","This browser cannot open the private library: "+err.message))}
 }
 $("studentImportLink").onclick=async()=>{
  const button=$("studentImportLink");button.disabled=true;
  try{
   const data=await core.fromURL($("studentDocumentURL").value,status);
   const doc=await core.save(data);
   $("studentDocumentURL").value="";
   await showOwned();await openDocument(doc);
   status("Imported "+doc.title+" from its public link.");
  }catch(error){status("Link import: "+error.message)}
  finally{button.disabled=false}
 };
 $("studentDocumentFile").addEventListener("change",async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
   const extracted=await core.extract(file,status);
   const doc=await core.save(extracted);
   await showOwned();await openDocument(doc);
  }catch(error){status("Import failed: "+error.message)}
  event.target.value="";
 });
 $("studentSavePaste").onclick=async()=>{
  const text=$("studentDocumentPaste").value;
  if(!text.trim()){status("Paste some readable text first.");return}
  try{
   const data=await core.save({title:$("studentDocumentTitle").value.trim()||"My pasted reading",text,source:"paste"});
   $("studentDocumentTitle").value="";$("studentDocumentPaste").value="";
   await showOwned();await openDocument(data);
  }catch(error){status("Could not save reading: "+error.message)}
 };
 function shareFromURL(input){
  const url=new URL(input,location.origin);
  if(url.origin!==location.origin)throw Error("Only a NINJA MOONS class link can be joined.");
  const id=url.searchParams.get("room");
  const key=new URLSearchParams(url.hash.replace(/^#/,"")).get("classkey");
  if(!uuid.test(id||"")||!secret.test(key||""))
   throw Error("The class link is incomplete. Ask the teacher to copy the full invitation link.");
  return {id,key};
 }
 function classroomLocation(){
  try{return shareFromURL(location.href)}catch{return null}
 }
 function renderClass(docs,active){
  classList.replaceChildren();
  if(!docs.length){classList.append(make("p","library-helper","The teacher has not shared a reading yet."));return}
  for(const d of docs){
   const item=make("div","library-item");
   const details=make("div","library-item-details");
   details.append(make("strong","",d.title),make("small","",Number(d.words||0).toLocaleString()+" words"+(d.id===active?" · CURRENT CLASS READING":"")));
   const button=make("button","library-button",d.id===active?"Read current":"Read");
   button.onclick=()=>openShared(d.id).catch(err=>classStatus("Could not open class reading: "+err.message));
   item.append(details,button);classList.append(item);
  }
 }
 async function openShared(docId,targetPage=1){
  if(!session.id||!session.key)return;
  if(session.loading===docId)return;
  session.loading=docId;
  try{
   classStatus("Opening the teacher's shared reading…");
   const data=await core.rpc("nm_reader_read_doc",{
    p_room:session.id,p_token:session.key,p_role:"student",p_doc:docId
   });
   const reading=core.remember({id:"shared-"+data.id,title:data.title,text:data.text,
    words:data.words,source:"class",created:Date.now()});
   await waitReady();
   window.NM_STATION.openDocument(reading);
   if(targetPage>1)window.NM_STATION.goToPage(targetPage);
   session.active=docId;session.lastPage=targetPage;
   $("storyDock").scrollIntoView({behavior:"smooth",block:"start"});
   classStatus("Teacher-shared reading loaded. "+(session.follow?"Following the teacher's section.":"Read at your own pace."));
  }finally{session.loading=null}
 }
 async function pollClass(){
  if(!session.id||session.busy)return;
  session.busy=true;
  try{
   const current=await core.rpc("nm_reader_status",{
    p_room:session.id,p_token:session.key,p_role:"student"
   });
   const documents=Array.isArray(current.documents)?current.documents:[];
   const before=[...session.docs.keys()].join(",");
   session.docs=new Map(documents.map(d=>[d.id,d]));
   const after=[...session.docs.keys()].join(",");
   if(before!==after||current.active_doc!==session.active)renderClass(documents,current.active_doc);
   const follow=$("studentFollowTeacher").checked&&current.follow;
   session.follow=follow;
   if(follow&&current.active_doc){
    if(current.active_doc!==session.active)await openShared(current.active_doc,current.active_page||1);
    else if(ready()&&window.NM_STATION.getStory()?.documentId==="shared-"+current.active_doc
     &&Number(window.NM_STATION.getContext()?.page)!==Number(current.active_page||1)){
     window.NM_STATION.goToPage(current.active_page||1);
     session.lastPage=current.active_page;
    }
   }
   if(!current.active_doc)classStatus("Connected to class. Waiting for a teacher to share a reading.");
   else if(!session.loading)classStatus("Class connected · "+documents.length+" shared reading(s) · "+
    (follow?"Following the teacher":"Independent reading mode"));
  }catch(err){classStatus("Class session unavailable: "+err.message)}
  finally{session.busy=false}
 }
 async function joinClass(link,writeHistory=true){
  const invite=shareFromURL(link);
  session.id=invite.id;session.key=invite.key;session.active=null;session.lastPage=0;
  session.docs.clear();
  if(writeHistory){
   const url=new URL(location.href);url.searchParams.set("room",invite.id);
   url.hash="classkey="+invite.key;history.replaceState(null,"",url.pathname+url.search+url.hash);
  }
  $("studentJoinLink").value="";
  classStatus("Joining your teacher's classroom session…");
  await pollClass();
 }
 $("studentJoinClass").onclick=()=>{
  const text=$("studentJoinLink").value.trim();
  if(!text){classStatus("Paste the private class invitation link first.");return}
  joinClass(text).catch(err=>classStatus("Cannot join class: "+err.message));
 };
 $("studentFollowTeacher").onchange=()=>{
  session.follow=$("studentFollowTeacher").checked;
  classStatus(session.follow?"Follow Teacher turned on.":"Follow Teacher turned off. Read at your own pace.");
 };
 async function init(){
  await showOwned();
  const initial=classroomLocation();
  if(initial)joinClass(location.href,false).catch(err=>classStatus("Class invitation failed: "+err.message));
  setInterval(()=>{if(document.visibilityState==="visible"&&session.id)pollClass().catch(()=>{})},5000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")pollClass().catch(()=>{})});
 }
 init().catch(error=>status("Document library unavailable: "+error.message));
})();
