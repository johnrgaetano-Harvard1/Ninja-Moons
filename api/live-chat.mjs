// NINJA MOONS isolated, expiring live demonstration. No real student inbox is readable here.
// Same-origin HTTP API avoids third-party speech/chat SDK loading on school browsers.
const ROOM="197d9609-c01a-46b7-af7a-ecb6efd14bed";
const KEYS={teacher:"1346f460b5a281348be85ca264d1215cec7a9cb6bedf6d3dd9891ce564ccac2c",student:"7ffa15545dceb848d809f6dd925a06dd5c8e6e8d416ebd7c3f2257552391c5a6"};
const SUPABASE="https://eaqwobzxrpplxymumlki.supabase.co";
const PUBLISHABLE_KEY="sb_publishable_XyVDJAFO5aWN_KVZoK9fXQ_j49gQckf";
const H={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
async function callRpc(name,body){
 const r=await fetch(SUPABASE+"/rest/v1/rpc/"+name,{
  method:"POST",headers:{"apikey":PUBLISHABLE_KEY,"Authorization":"Bearer "+PUBLISHABLE_KEY,"Content-Type":"application/json","Accept":"application/json"},
  body:JSON.stringify(body),signal:AbortSignal.timeout(10000)
 });
 const data=await r.json().catch(()=>null);
 if(!r.ok){
  console.error("Live test RPC returned HTTP",r.status);
  const reason=data?.message||"The live messaging database is unavailable.";
  return {error:reason,status:r.status,data:null};
 }
 return {data,error:null,status:r.status};
}
export async function GET(request){
 const u=new URL(request.url);
 const role=u.searchParams.get("role")||"teacher";
 if(!(role in KEYS))return json({message:"Invalid live-test view."},400);
 try{
  const r=await callRpc("nm_live_demo_read",{p_room:ROOM,p_key:KEYS[role],p_role:role});
  if(r.error)return json({message:r.error,connected:false},r.status===400?410:502);
  const messages=Array.isArray(r.data?.messages)?r.data.messages:[];
  if(u.searchParams.get("check")==="1")return json({connected:true,mode:"isolated-live-demo",messageCount:messages.length,expires:"2026-11-14"});
  return json({connected:true,messages});
 }catch(err){console.error("Live test read failed",err.name);return json({message:"The live test could not reach its messaging database."},504)}
}
export async function POST(request){
 const origin=request.headers.get("origin");
 if(origin!==new URL(request.url).origin)return json({message:"Use the NINJA MOONS reading page for this test."},403);
 if(!String(request.headers.get("content-type")||"").startsWith("application/json"))return json({message:"JSON required."},415);
 if(Number(request.headers.get("content-length")||0)>2000)return json({message:"Message is too long."},413);
 try{
  const raw=await request.text();if(raw.length>2000)return json({message:"Message is too long."},413);
  let body;try{body=JSON.parse(raw)}catch{return json({message:"Invalid message format."},400)}
  const role=body.role;
  const msg=typeof body.message==="string"?body.message.trim():"";
  const story=typeof body.story==="string"?body.story:"seven-second-journey-grade-1";
  const page=Number.isInteger(body.page)?body.page:1;
  if(!(role in KEYS)||!msg||msg.length>750||story.length>100||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(story))return json({message:"Enter a short test question or reply."},400);
  const r=await callRpc("nm_live_demo_add",{p_room:ROOM,p_key:KEYS[role],p_role:role,p_body:msg,p_story:story,p_page:page});
  if(r.error)return json({message:r.error},r.status===400?429:502);
  return json({sent:true});
 }catch(err){console.error("Live test send failed",err.name);return json({message:"The message could not reach the live test database."},504)}
}
