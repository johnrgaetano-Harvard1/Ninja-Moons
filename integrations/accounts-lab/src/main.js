import {createClient} from "@supabase/supabase-js";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const config={url:import.meta.env.VITE_SUPABASE_URL||"",key:import.meta.env.VITE_SUPABASE_ANON_KEY||"",enabled:import.meta.env.VITE_ENABLE_AUTH==="true"};
const backendConfigured=/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url)&&config.key.length>40;
const authEnabled=config.enabled&&backendConfigured;
const supabase=authEnabled?createClient(config.url,config.key,{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const status=$("#auth-status"),message=$("#auth-message");
const say=txt=>{message.textContent=txt;};
const panel=(id)=>{$$(".panel").forEach(p=>p.hidden=p.id!==id);$$(".tabs [data-panel]").forEach(b=>{if(b.dataset.panel===id)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});};
$$(".tabs [data-panel]").forEach(b=>b.addEventListener("click",()=>panel(b.dataset.panel)));
const demo=[{id:"Student A",progress:83,sentences:105,words:26},{id:"Student B",progress:61,sentences:78,words:22},{id:"Student C",progress:94,sentences:111,words:29},{id:"Student D",progress:44,sentences:33,words:12}];
const demoBox=$("#sample-students");
for(const s of demo){const item=document.createElement("article");item.className="sample-student";const title=document.createElement("h4");title.textContent=s.id;const bar=document.createElement("div");bar.className="bar";bar.setAttribute("role","progressbar");bar.setAttribute("aria-valuemin","0");bar.setAttribute("aria-valuemax","100");bar.setAttribute("aria-valuenow",String(s.progress));bar.setAttribute("aria-label",s.id+" progress");const inner=document.createElement("span");inner.style.width=s.progress+"%";bar.append(inner);const sub=document.createElement("p");sub.textContent=s.progress+"% sample progress · "+s.sentences+" sentence practices · "+s.words+" word lookups";item.append(title,bar,sub);demoBox.append(item);}
status.textContent=authEnabled?"Private sign-in available for pre-approved accounts only.":backendConfigured?"Supabase database connected · Student sign-in and data collection safely disabled during verification.":"Demo mode · Supabase database and sign-in are not connected.";
$("#database-status").textContent=authEnabled?"Authentication enabled · Verify privacy and role isolation before enrolling students.":backendConfigured?"Supabase connected · Student-progress tables created · Real student login and recording disabled pending testing.":"Not connected · Database migration is prepared, but no student records are stored.";
$$("[data-requires-auth]").forEach(el=>el.disabled=!authEnabled);
$$("#password-form input").forEach(el=>el.disabled=!authEnabled);
if(!authEnabled){say("Account preview only: login is disabled until privacy review, role-isolation tests, verified consent and approved account provisioning are complete.");}
let current=null;
async function updateSession(session){
 if(!session){current=null;$("#signout").hidden=true;$("#real-account").hidden=true;$("#sample-dashboard").hidden=false;return;}
 const {data:profile,error}=await supabase.from("profiles").select("id,display_name,role,is_active").eq("id",session.user.id).maybeSingle();
 if(error||!profile||!profile.is_active){await supabase.auth.signOut();say("This account has not been approved by your school or the NINJA MOONS administrator.");return;}
 current=profile;$("#signout").hidden=false;$("#sample-dashboard").hidden=true;$("#real-account").hidden=false;$("#real-welcome").textContent="Signed in as "+profile.display_name+" · "+profile.role+". Your data is visible only where your role permits.";
 await fetchProgress();
}
async function fetchProgress(){
 if(!current)return;
 const box=$("#real-progress");box.textContent="Reading your permitted progress…";
 const {data:students,error}=await supabase.from("student_profiles").select("id,display_alias,grade_level").limit(100);
 if(error){box.textContent="Progress information is not accessible or the database setup is incomplete.";return;}
 if(!students?.length){box.textContent="No students are linked to this account yet.";return;}
 const ids=students.map(s=>s.id);
 const {data:events,error:evError}=await supabase.from("reading_events").select("student_id,story_slug,event_type,created_at").in("student_id",ids).order("created_at",{ascending:false}).limit(200);
 if(evError){box.textContent="Access to student events is restricted.";return;}
 const container=document.createElement("div");container.className="student-grid";for(const s of students){const count=(events||[]).filter(e=>e.student_id===s.id).length;const card=document.createElement("article");card.className="sample-student";const name=document.createElement("h4");name.textContent=s.display_alias||"Learner";const desc=document.createElement("p");desc.textContent="Grade "+(s.grade_level||"—")+" · "+count+" recent recorded activities";card.append(name,desc);container.append(card);}box.replaceChildren(container);
}
$("#real-refresh").addEventListener("click",fetchProgress);
$("#password-form").addEventListener("submit",async e=>{e.preventDefault();if(!supabase)return;const form=new FormData(e.currentTarget),email=String(form.get("email")||"").trim(),password=String(form.get("password")||"");if(!email||!password){say("Enter your email and password.");return;}say("Checking your approved account…");const {error}=await supabase.auth.signInWithPassword({email,password});e.currentTarget.querySelector('[name="password"]').value="";say(error?"Sign in failed. Check your credentials or contact your school.":"Account verified. Loading authorized access…");});
$("#magic-link").addEventListener("click",async()=>{if(!supabase)return;const email=String($("#password-form [name=email]").value||"").trim();if(!email){say("Enter your email address first.");return;}const {error}=await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}});say(error?"The sign-in link could not be sent. Please contact your administrator.":"If your account is approved, you will receive an email sign-in link.");});
$$("[data-provider]").forEach(b=>b.addEventListener("click",async()=>{if(!supabase)return;const provider=b.dataset.provider;const {error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:location.origin+location.pathname}});if(error)say("This provider is not enabled for your organization.");}));
$("#signout").addEventListener("click",async()=>{if(supabase){await supabase.auth.signOut();say("Signed out.");}});
if(supabase){supabase.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>updateSession(session),0);});supabase.auth.getSession().then(({data})=>updateSession(data.session)).catch(()=>say("Account service temporarily unavailable."));}
