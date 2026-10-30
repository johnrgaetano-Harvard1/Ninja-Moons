# NINJA MOONS Classroom Listening Lab — adult test

URL: https://ninja-moons-classroom-lab.vercel.app/

Teacher: https://ninja-moons-classroom-lab.vercel.app/teacher.html

Reader: https://ninja-moons-classroom-lab.vercel.app/student.html

## What it does
The teacher taps **Start Monitoring**. Multiple adult readers tap **Start Microphone** on their own devices. Up to 30 reader slots can appear on the teacher dashboard (capacity designed, not yet validated by load test). The teacher taps **Listen** on one slot to request a WebRTC audio connection to that reader. Selecting a different reader sends `stop-audio` to the previous reader and releases the earlier stream. The teacher can mute or stop. Each reader can turn off their microphone.

Reader positions use an **illustrative five-sentence practice set**, not automatic detection of exactly which words the person spoke. No speech transcription or ChatGPT feedback is active.

This experiment uses PeerJS Cloud to exchange connection metadata, STUN, and direct WebRTC peer streams where network conditions allow. Audio is not recorded or persisted by the app, though third-party service/browser privacy warrants review.

## Critical restrictions
- This is **NOT suitable for students** because the single test room has no user authentication, class-specific authorization, consent controls, or participant verification. A person who discovers the demo ID could connect or masquerade as a teacher/reader.
- Conduct real two- and three-device microphone tests with consenting adults only.
- School filtering, symmetric NATs, and firewalls may require a TURN service for connectivity; the app currently uses public STUN only.
- No OpenAI/ChatGPT backend is connected. AI coaching is intentionally deferred until secure teacher/student identity, consent, and privacy have been implemented.
- Never enter a private student name or student work into this prototype.
- The original NINJA MOONS website, Secret Garden, and successful one-tap adult test were not changed.

## Deployment
Independent Vercel project: `ninja-moons-classroom-lab` (ID `prj_8c2idMLLWQwaVfPXEur9dNKgF1e8`). Files: `index.html`, `app.js`, `styles.css`, `vercel.json`. Root `/teacher.html` and `/student.html` rewrite to `/index.html`; the client recognizes the route. This branch is for source preservation and does not change the production publisher repository branch.
