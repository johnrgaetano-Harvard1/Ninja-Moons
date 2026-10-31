import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {EVENT_TYPES,validateEvent} from "../src/tracker.js";
const sql=fs.readFileSync(new URL("../supabase/migrations/20261031_0001_accounts_progress.sql",import.meta.url),"utf8");
test("row-level security for every table",()=>{
 for(const table of ["profiles","schools","school_staff","classrooms","classroom_teachers","student_profiles","student_user_links","guardian_links","consent_records","classroom_enrollments","reading_assignments","reading_events","quiz_attempts","audit_events"])
 assert.ok(sql.includes("alter table public."+table+" enable row level security;"),table);
});
test("client cannot self-authorize consent or school roles",()=>{
 assert.ok(!sql.includes("grant update on public.student_profiles"));
 assert.ok(!sql.includes("grant insert on public.consent_records"));
 assert.ok(sql.includes("s.consent_status='approved'"));
 assert.ok(sql.includes("actor_user_id=(select auth.uid())"));
});
test("invalid events rejected",()=>{
 for(const type of EVENT_TYPES)assert.equal(validateEvent({type,storySlug:"ocean-that-glows"}),true);
 for(const e of [{storySlug:"../x",type:"word_tap"},{storySlug:"ocean",type:"unsafe"},{storySlug:"ocean",type:"story_open",durationMs:-1},{storySlug:"ocean",type:"helper_step",helperStage:5}])
 assert.throws(()=>validateEvent(e));
});
test("no user-provided trusted quiz grade",()=>assert.equal(sql.includes("is_correct boolean"),false));
