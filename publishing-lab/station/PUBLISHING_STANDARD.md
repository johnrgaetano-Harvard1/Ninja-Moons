# 🥷 OPEN THE NINJA READER WEBSITE

## 📖 [TAP HERE — OPEN THE WORKING NINJA READER APP](https://ninja-moons-publisher.vercel.app/station/?story=seven-second-journey-grade-1)

**You are currently reading an instruction document on GitHub, NOT the website.** To read the first-grade adventure, use the blue link above. The site has the story, pictures, English/Spanish, noun photographs, NINJA Reader, Ask Ninja and the other toolbox panels.

[Choose a different story / grade](https://ninja-moons-publisher.vercel.app/station/)

---

# NINJA MOONS — Single-Page NINJA READER Publishing Standard

This document is mandatory for every new story published through the independent NINJA MOONS publisher.

## The reader experience
- Primary entry: `/station/?story=<story-slug>`.
- Keep the current illustration, story text, audio and page navigation **above** the tools at all times; on phones, use a compact sticky story.
- Every story uses one shared toolbox: **NINJA Reader, Languages, Noun Pictures, Questions, Ask Ninja, Ask Teacher, Teacher Live, Transcription, Progress and Music**.
- Keep the same four training stages **Hear → Pronounce → Definitions → Understand**. Back/Next/Repeat/Play/Stop must not reset page or language. Word groups support 1–8 words. Include adjustable pronunciation and definition hints.
- Keep blue, purple and white styling. Avoid yellow/gold highlights. No violence or weapons.

## Story content checks
- Create grade-appropriate adventures, not lectures. Write naturally for students who may read below grade level.
- K–12 target words per story: K 200; 1 400; 2 500; 3 700; 4 900; 5 1000; 6 1200; 7 1700; 8 2100; 9 2600; 10 3100; 11 3500; 12 4000. If approved grade-specific targets change, update the master chart.
- Confirm story-word count using the manifest's page lines, excluding headings, vocabulary and discussion.
- Provide a validated manifest with `readingLevel`, consecutive numbered `pages`, `lines`, image, file byte size and SHA256 for every picture. Ensure artwork matches its exact corresponding page.
- Prepare age-appropriate vocabulary. For Grade 1 baseline: 20 meaningful words, two per picture; include pronunciation and simple definitions. Use real photos for concrete nouns, never invented photorealistic objects labeled as real.
- Prepare accurate, human-checked Spanish sentences and vocabulary in addition to English; bilingual pronunciation/audio. Do not claim a translation is available when missing. The first-grade story has `station/grade1-es.json` as a reference.
- Prepare two vetted multiple-choice comprehension questions per picture (or per paragraph for other grade bands). The first-grade reference is `station/grade1-questions.json`.
- Reuse the established `station/noun-photos.json` mapping, adding new verified photographic assets and credits when vocabulary requires them.

## Protected student-teacher classroom features
- Ask Teacher is a **private classroom conversation**, NOT a public form or a pretend inbox.
- Use the existing **ninja-moons-learning** Supabase project, authorized student identities, active classrooms, teacher assignments, and consent checks. Keep RLS on all chat tables; do not expose service_role keys in browser files.
- Student questions include the current story slug and picture. Teachers reply in one inbox under the same station page.
- Student reading activity may be stored only after valid account authorization. Microphones are opt-in and must not record/upload without explicit user knowledge and permitted consent.
- No real student classroom launch until teacher profiles and classroom enrollments are activated and the flow tested on separate student and teacher devices.
- Embedded Ask Ninja, Live Reading and Music experiments must retain visible fallback links, and should not be described as natively integrated if the iframe or session is blocked.

## Deployment checklist
1. Add and validate story content, image integrity, alt text, vocabulary, Spanish translations and question data.
2. Confirm the story appears in `/catalog.json` and opens at `/station/?story=<slug>`.
3. Verify the first/last page, page changes, illustration for every page, read-aloud, Stop, the four stages, bilingual changes, pronunciation/definition help, noun photos and question feedback.
4. Check mobile sticky-story layout and desktop layout; make sure the toolbox never hides or replaces story.
5. For private messaging: test user login, cross-classroom denial, student question, teacher reply, notification/polling, and teacher-only monitoring with authorized real/synthetic accounts.
6. Validate JavaScript syntax and browser interactions. Confirm Vercel production deployment is READY and the build reported all story hashes valid.
7. Publish direct link. Note which features are verified, still dependent on login/consent, or embedded from a separate original app.
8. Do not overwrite or reroute `ninjamoons.com` or other established projects without an explicit migration and rollback plan.

Current consolidated entry: https://ninja-moons-publisher.vercel.app/station/


## November 2026 unified-station safeguards
- The publishing build now rejects any *ready* story without a **complete sentence-aligned Spanish pack** and **exactly two bilingual multiple-choice questions per picture**. Kindergarten, Grade 1 and Grade 6 have approved packs in `station/`.
- The story text itself must offer tappable words; nouns use real-photo popups on tap and hover where supported. Each image must identify its real source and usage rights.
- Include **Read Page, Read All, Pause/Resume, Stop, Previous and Next**; NINJA Reader also supports Repeat, four stages and adjustable 1–8-word groups.
- Ask Ninja contains free local story-context help plus a clearly separated, adult-only AI experiment. Never pretend the local helper generates new AI answers.
- Ask Teacher uses Supabase `nm_teacher_threads` and `nm_teacher_messages` with row-level security; activate school accounts, teacher assignments and consent before sending live student messages. Show new-reply / needs-reply indicators. Do not auto-create real student accounts or classrooms.
- Do not auto-start external microphone, video or music embeds. Live Reading starts only after deliberate action; experimental music stays off for students until licensing, filtering and teacher approval are ready.
- An embedded separate project is **not the same** as fully integrating it. Clearly label external app sessions and fallback links.
- Do not change the primary `ninjamoons.com` deployment without a tested, reversible migration plan.
