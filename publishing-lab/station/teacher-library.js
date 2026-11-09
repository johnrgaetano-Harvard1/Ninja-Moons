"use strict";
// Teacher's universal reading library and temporary private-link classroom session.
// This is a limited demo; real school enrollment and attendance are separate.
(function(){
 const $=id=>document.getElementById(id);
 const core=window.NMDocs;
 if(!core){$("teacherLibraryStatus").textContent="The reading importer is unavailable.";return}
 const ownStatus=msg=>{$("teacherLibraryStatus").textContent=msg};
 const classStatus=msg=>{$("teacherClassStatus").textContent=msg};
 const ownList=$("teacherLocalDocuments"),classList=$("teacherSharedDocuments");
 const key="nm-teacher-reading-session-v1";
 const guid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const token=/^[a-f0-9]{64}$/;
 let room=null,activeDoc=null,shared=new Map(),lastTeacherPage=1,pageTimer=null,busy=false;
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
 const preview=$("dashStudentFrame");
 function validRoom(r){
  return r&&guid.test(r.id||"")&&token.test(r.teacherKey||"")&&token.test(r.studentKey||"")&&
   Date.now()-r.created<48*3600000;
 }
 function invite(){
  if(!room)throw Error("Start a session first.");
  const url=new URL("/station/",location.origin);
  url.searchParams.set("room",room.id);
  url.hash="classkey="+room.studentKey;
  return url.href;
 }
 function updateInvite(){
  $("teacherClassLink").value=room?invite():"";
  $("teacherCopyClassLink").disabled=!room;
  $("teacherNewReadingRoom").textContent=room?"Start New Session":"Start Classroom Session";
 }
 async function readOwned(){
  ownList.replaceChildren();
  try{
   const docs=await core.list();
   if(!docs.length){ownList.append(make("p","dash-library-help","No personal readings yet. Upload a file or paste text above."));return}
   for(const doc of docs){
    const card=make("div","dashboard-doc-item");
    const info=make("div","doc-meta");
    info.append(make("strong","",doc.title),make("small","",(doc.words||0).toLocaleString()+" words · "+(doc.source||"text")));
    const open=make("button","dash-btn secondary","Read");open.type="button";
    open.onclick=async()=>{
     try{
      const data=await core.get(doc.id);
      if(!data)throw Error("Personal reading not found.");
      await openPreview(data);
      ownStatus("Opened "+doc.title+" in the teaching workspace below.");
     }catch(err){ownStatus("Could not open reading: "+err.message)}
    };
    const share=make("button","dash-btn","Share to Class");share.type="button";
    share.disabled=!room;
    share.onclick=async()=>{
     if(!room){classStatus("Create a classroom session first.");return}
     share.disabled=true;
     try{
      const data=await core.get(doc.id);
      if(!data)throw Error("Personal reading not found.");
      const sharedId=await core.publish(room,data,classStatus);
      activeDoc=sharedId;lastTeacherPage=1;
      await refreshShared();
      await openSharedForTeacher(sharedId);
      classStatus("Shared "+data.title+" with the class. Students with your invitation can now read it.");
     }catch(err){classStatus("Could not share: "+err.message)}
     finally{share.disabled=false}
    };
    const del=make("button","dash-btn secondary","Delete");del.type="button";
    del.onclick=async()=>{
     if(!confirm('Delete "'+doc.title+'" from this browser?'))return;
     try{await core.remove(doc.id);await readOwned();ownStatus("Removed the personal copy from this browser. Already-shared class copies remain in the session.")}
     catch(err){ownStatus("Delete failed: "+err.message)}
    };
    card.append(info,open,share,del);ownList.append(card);
   }
  }catch(err){ownList.append(make("p","dash-library-help","Cannot access local documents: "+err.message))}
 }
 async function waitPreview(){
  for(let i=0;i<100;i++){
   try{if(preview.contentWindow?.NM_STATION?.openDocument)return preview.contentWindow.NM_STATION}
   catch(_error){}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error("The teaching workspace did not finish loading. Try Refresh Tool first.");
 }
 async function openPreview(data){
  $("teacherWorkspace").scrollIntoView({behavior:"smooth",block:"start"});
  await waitPreview();
  if(window.NMDashboard?.openDocument)window.NMDashboard.openDocument(data);
  else preview.contentWindow.NM_STATION.openDocument(data);
 }
 async function openSharedForTeacher(id){
  if(!room)throw Error("Start a session first.");
  const data=await core.rpc("nm_reader_read_doc",{p_room:room.id,p_token:room.teacherKey,p_role:"teacher",p_doc:id});
  const doc=core.remember({id:"shared-"+data.id,title:data.title,text:data.text,words:data.words,source:"class",created:Date.now()});
  activeDoc=id;lastTeacherPage=1;
  $("teacherSectionNumber").value="1";
  await openPreview(doc);
  await showPage(1);
 }
 function renderShared(documents){
  classList.replaceChildren();
  if(!documents.length){classList.append(make("p","dash-library-help","No class readings have been shared yet."));return}
  for(const d of documents){
   const row=make("div","dashboard-doc-item");
   const info=make("div","doc-meta");
   info.append(make("strong","",d.title),make("small","",(d.words||0).toLocaleString()+" words"+(d.id===activeDoc?" · CURRENT READING":"")));
   const button=make("button","dash-btn","Teach");button.type="button";
   button.onclick=async()=>{
    try{classStatus("Loading the shared reading into your teaching workspace…");await openSharedForTeacher(d.id)}
    catch(err){classStatus("Could not open shared reading: "+err.message)}
   };
   row.append(info,button);classList.append(row);
  }
 }
 async function refreshShared(){
  if(!room)return;
  const data=await core.rpc("nm_reader_status",{p_room:room.id,p_token:room.teacherKey,p_role:"teacher"});
  const docs=Array.isArray(data.documents)?data.documents:[];
  shared=new Map(docs.map(d=>[d.id,d]));
  activeDoc=data.active_doc||null;
  $("teacherSectionNumber").value=data.active_page||1;
  $("teacherFollowEnabled").checked=!!data.follow;
  $("teacherSetSection").disabled=!activeDoc;
  renderShared(docs);
  classStatus("Session connected · "+docs.length+" shared reading(s) · Expires "+
   new Date(data.expires).toLocaleString());
 }
 async function createRoom(){
  const teacherKey=core.secret(),studentKey=core.secret();
  const id=await core.rpc("nm_reader_room_new",{p_teacher_key:teacherKey,p_student_key:studentKey});
  if(!guid.test(id||""))throw Error("Session was not created.");
  room={id,teacherKey,studentKey,created:Date.now()};
  try{localStorage.setItem(key,JSON.stringify(room))}catch(_error){}
  activeDoc=null;shared.clear();lastTeacherPage=1;
  updateInvite();await readOwned();await refreshShared();
 }
 $("teacherNewReadingRoom").onclick=async()=>{
  if(busy)return;
  if(room&&!confirm("Start a new class session? The old invitation will no longer appear here. Existing student links may remain valid until they expire."))return;
  busy=true;$("teacherNewReadingRoom").disabled=true;
  try{classStatus("Creating a private classroom session…");await createRoom();
   classStatus("New class session ready. Copy the student link and share your reading.")}
  catch(err){classStatus("Session could not start: "+err.message)}
  finally{busy=false;$("teacherNewReadingRoom").disabled=false}
 };
 $("teacherCopyClassLink").onclick=async()=>{
  try{
   const link=invite();
   if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(link);classStatus("Student invitation copied. Open it on the students' devices.");return}
   $("teacherClassLink").focus();$("teacherClassLink").select();
   classStatus("Copy the selected student invitation link.");
  }catch(err){classStatus("Unable to copy: "+err.message)}
 };
 async function showPage(pageValue){
  if(!room||!activeDoc)throw Error("Choose a shared reading first.");
  const page=Math.max(1,Math.min(Number(pageValue)||1,99999));
  const follow=$("teacherFollowEnabled").checked;
  await core.rpc("nm_reader_set_page",{p_room:room.id,p_key:room.teacherKey,
   p_doc:activeDoc,p_page:page,p_follow:follow});
  lastTeacherPage=page;
  $("teacherSectionNumber").value=String(page);
  classStatus("Class reading is on section "+page+" · "+(follow?"Students follow teacher":"Students read independently"));
 }
 $("teacherSetSection").onclick=async()=>{
  try{await showPage($("teacherSectionNumber").value)}
  catch(err){classStatus("Could not change section: "+err.message)}
 };
 $("teacherFollowEnabled").onchange=()=>{
  if(activeDoc)showPage($("teacherSectionNumber").value).catch(err=>classStatus(err.message));
 };
 window.addEventListener("message",event=>{
  if(event.origin!==location.origin||event.source!==preview.contentWindow)return;
  const data=event.data;
  if(!data||data.kind!=="nm-reader-section"||!room||!activeDoc)return;
  if(data.docId!=="shared-"+activeDoc||!Number.isInteger(data.page))return;
  if(data.page===lastTeacherPage)return;
  if(pageTimer)clearTimeout(pageTimer);
  pageTimer=setTimeout(()=>showPage(data.page).catch(err=>classStatus("Section sync: "+err.message)),300);
 });
 $("teacherDocFile").addEventListener("change",async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
   const data=await core.extract(file,ownStatus);
   const saved=await core.save(data);
   await readOwned();
   ownStatus("Saved "+saved.title+" ("+saved.words.toLocaleString()+" words) in My Library. Choose Read or Share to Class.");
  }catch(err){ownStatus("Import failed: "+err.message)}
  event.target.value="";
 });
 $("teacherSavePaste").onclick=async()=>{
  const text=$("teacherPasteText").value;
  if(!text.trim()){ownStatus("Paste a story or reading first.");return}
  try{
   const saved=await core.save({title:$("teacherPasteTitle").value.trim()||"Class reading",text,source:"paste"});
   $("teacherPasteText").value="";$("teacherPasteTitle").value="";
   await readOwned();ownStatus("Saved "+saved.title+" privately. Use Read or Share to Class.");
  }catch(err){ownStatus("Could not save reading: "+err.message)}
 };
 async function init(){
  try{const stored=JSON.parse(localStorage.getItem(key)||"null");if(validRoom(stored))room=stored}
  catch(_error){}
  updateInvite();
  await readOwned();
  if(room){
   try{await refreshShared()}
   catch(err){room=null;updateInvite();classStatus("Previous session expired or could not be loaded. Start a new one.");await readOwned()}
  }
  // Listen only for session state, not arbitrary student data.
  setInterval(()=>{
   if(document.visibilityState==="visible"&&room&&activeDoc)
    core.rpc("nm_reader_status",{p_room:room.id,p_token:room.teacherKey,p_role:"teacher"})
     .then(data=>{if(!shared.has(data.active_doc))refreshShared().catch(()=>{})}).catch(()=>{});
  },12000);
 }
 init().catch(err=>ownStatus("Teacher document library unavailable: "+err.message));
})();
