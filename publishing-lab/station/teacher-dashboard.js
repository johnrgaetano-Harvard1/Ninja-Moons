"use strict";
// Consolidated NINJA MOONS teacher dashboard.
// All classroom tools run in one same-origin Student Station preview.
// Private teacher messages remain protected by their existing authenticated RPCs.
(function(){
 const $=id=>document.getElementById(id);
 const stationFrame=$("dashStudentFrame");
 const picker=$("dashStoryPick");
 const tools=[...document.querySelectorAll("[data-dashboard-tool]")];
 const allowedTools=new Map([
  ["trainer","Read & Listen"],["language","English / Spanish"],
  ["pictures","Picture Vocabulary"],["questions","Comprehension"],
  ["ninja","Ask Ninja AI"],["live","Live Reading"],
  ["transcribe","Transcription"],["progress","Class Monitor"],
  ["music","Music · Experimental"]
 ]);
 const state={tool:"trainer",story:"seven-second-journey-grade-1",loaded:false};
 let privateInit=null,notesTimer=null;
 const set=(id,content)=>{const e=$(id);if(e)e.textContent=content};
 function validSlug(value){return typeof value==="string"&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)&&value.length<120}
 function previewUrl(){
  const url=new URL("/station/",location.origin);
  url.searchParams.set("story",state.story);
  url.searchParams.set("tool",state.tool);
  return url.pathname+url.search;
 }
 function openWorkspace(tool,options={}){
  if(!allowedTools.has(tool))return;
  state.tool=tool;
  for(const btn of tools)btn.setAttribute("aria-pressed",String(btn.dataset.dashboardTool===tool));
  const next=previewUrl();
  if(!state.loaded||stationFrame.getAttribute("src")!==next||options.force){
   stationFrame.src=next;state.loaded=true;
   set("dashFrameStatus","Opening "+allowedTools.get(tool)+"…");
  }
  set("dashCurrentTool",allowedTools.get(tool)+" · "+(picker.selectedOptions?.[0]?.textContent||"Student Station"));
  if(options.scroll)$("teacherWorkspace").scrollIntoView({behavior:"smooth",block:"start"});
 }
 tools.forEach(button=>button.addEventListener("click",()=>openWorkspace(button.dataset.dashboardTool)));
 $("dashOpenMonitor").onclick=()=>openWorkspace("progress",{scroll:true});
 $("dashRefreshPreview").onclick=()=>openWorkspace(state.tool,{force:true});
 picker.onchange=()=>{
  if(validSlug(picker.value)){state.story=picker.value;openWorkspace(state.tool,{scroll:false})}
 };
 stationFrame.addEventListener("load",()=>{
  set("dashFrameStatus","Tool loaded. Use the reading and classroom controls within this dashboard.");
  try{
   const d=stationFrame.contentDocument;
   const head=d?.querySelector("h1");
   if(head)stationFrame.title="Student Station teaching preview: "+head.textContent;
  }catch(_error){/* A future cross-origin destination must never be accessed. */}
 });
 async function loadStories(){
  try{
   const response=await fetch("/catalog.json",{cache:"no-store"});
   if(!response.ok)throw Error("Story catalog unavailable.");
   const payload=await response.json();
   const stories=(Array.isArray(payload.stories)?payload.stories:[])
     .filter(s=>validSlug(s.slug)&&typeof s.title==="string"&&s.title.length<160);
   if(!stories.length)throw Error("No stories have been published.");
   picker.replaceChildren();
   const gallery=$("dashStoryCards");
   gallery.replaceChildren();
   for(const story of stories){
    const option=document.createElement("option");
    option.value=story.slug;option.textContent=story.title;
    picker.append(option);
    const card=document.createElement("article");card.className="dash-story";
    const title=document.createElement("strong");title.textContent=story.title;
    const detail=document.createElement("span");
    detail.textContent=[story.readingLevel||story.grade||"Reading adventure",
      Number.isInteger(story.pages)?story.pages+" illustrated pages":null].filter(Boolean).join(" · ");
    const select=document.createElement("button");select.type="button";
    select.className="dash-btn";select.textContent="Use in Lesson";
    select.addEventListener("click",()=>{
     state.story=story.slug;picker.value=story.slug;
     openWorkspace(state.tool,{scroll:true});
    });
    card.append(title,detail,select);gallery.append(card);
   }
   const desired=new URLSearchParams(location.search).get("story");
   const picked=stories.find(s=>s.slug===desired)||stories.find(s=>s.slug===state.story)||stories[0];
   state.story=picked.slug;picker.value=state.story;
   set("dashStoryCount",stories.length+" published stories");
   openWorkspace("trainer");
  }catch(error){
   set("dashStoryCount","Library unavailable");
   set("dashStoryCards","Could not load the story list: "+error.message);
   picker.replaceChildren();
   const opt=document.createElement("option");opt.value=state.story;opt.textContent="Default story";picker.append(opt);
   openWorkspace("trainer");
  }
 }
 function privateInbox(){
  const panel=$("privateInbox");
  panel.hidden=false;
  $("dashOpenPrivate").textContent="Protected Inbox Open";
  $("dashOpenPrivate").disabled=true;
  panel.scrollIntoView({behavior:"smooth",block:"nearest"});
  if(privateInit)return privateInit;
  privateInit=import("/station/quickchat.js").then(async module=>{
   await module.init();
   return true;
  }).catch(error=>{
   set("accountBox","The protected inbox could not open: "+error.message);
   $("dashOpenPrivate").disabled=false;
   privateInit=null;
   return false;
  });
  return privateInit;
 }
 $("openRealInbox").onclick=()=>privateInbox();
 $("dashOpenPrivate").onclick=()=>privateInbox();
 const NOTES_KEY="nm-teacher-dashboard-lesson-notes-v1";
 try{$("dashLessonNotes").value=localStorage.getItem(NOTES_KEY)||""}
 catch(_error){set("dashNotesStatus","Private browsing may prevent saving notes on this device.")}
 $("dashLessonNotes").addEventListener("input",()=>{
  set("dashNotesStatus","Saving lesson notes to this browser…");
  if(notesTimer)clearTimeout(notesTimer);
  notesTimer=setTimeout(()=>{
   try{
    localStorage.setItem(NOTES_KEY,$("dashLessonNotes").value);
    set("dashNotesStatus","Saved on this device only. Student information is not stored here.");
   }catch(_error){set("dashNotesStatus","This browser cannot save notes locally.")}
  },350);
 });
 $("dashClearNotes").onclick=()=>{
  $("dashLessonNotes").value="";
  try{localStorage.removeItem(NOTES_KEY);set("dashNotesStatus","Lesson notes cleared from this browser.")}
  catch(_error){set("dashNotesStatus","Clear the text to remove it from this page.")}
 };
 loadStories();
})();
