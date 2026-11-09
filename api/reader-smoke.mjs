// TEMPORARY synthetic class-session HTTP smoke check; delete after verification.
export async function GET(request){
 const url=new URL(request.url);
 if(url.searchParams.get("probe")!=="m4b98a26da6d4d7e9f4531717a6e36f2")return new Response("Not found",{status:404});
 try{
  const cfg=await fetch(url.origin+"/station/config.json",{cache:"no-store"}).then(r=>r.json());
  const headers={"apikey":cfg.publishableKey,"authorization":"Bearer "+cfg.publishableKey,"content-type":"application/json"};
  const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
  async function rpc(name,params){
   const r=await fetch(cfg.projectUrl+"/rest/v1/rpc/"+name,{method:"POST",headers,body:JSON.stringify(params)});
   const v=await r.json().catch(()=>null);
   if(!r.ok)throw Error(name+" HTTP "+r.status+": "+(v?.message||"unknown"));
   return v;
  }
  const t=random(),s=random(),room=await rpc("nm_reader_room_new",{p_teacher_key:t,p_student_key:s});
  const doc=await rpc("nm_reader_start_doc",{p_room:room,p_key:t,p_title:"Synthetic class reader integration test",p_parts:2,p_words:16});
  await rpc("nm_reader_add_part",{p_room:room,p_key:t,p_doc:doc,p_part:0,p_content:"Ninja Moons students can read classroom documents. "});
  await rpc("nm_reader_add_part",{p_room:room,p_key:t,p_doc:doc,p_part:1,p_content:"The teacher can move the whole group to another reading section."});
  await rpc("nm_reader_finish_doc",{p_room:room,p_key:t,p_doc:doc});
  await rpc("nm_reader_set_page",{p_room:room,p_key:t,p_doc:doc,p_page:4,p_follow:true});
  const state=await rpc("nm_reader_status",{p_room:room,p_token:s,p_role:"student"});
  const reading=await rpc("nm_reader_read_doc",{p_room:room,p_token:s,p_role:"student",p_doc:doc});
  const passed=state.active_doc===doc&&state.active_page===4&&state.follow===true&&
    Array.isArray(state.documents)&&state.documents.length===1&&
    reading.text.includes("Ninja Moons students")&&reading.text.includes("teacher can move");
  return Response.json({passed,create:true,publish:true,studentReads:true,followTeacher:state.follow,studentSection:state.active_page,
   documentTitle:reading.title,documentCharacters:reading.text.length},{status:passed?200:500,headers:{"cache-control":"no-store"}});
 }catch(err){return Response.json({passed:false,error:err.message},{status:500})}
}