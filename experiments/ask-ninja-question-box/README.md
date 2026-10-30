# Ask NINJA — low-cost question-box preview

Live preview: https://ninja-moons-ask-ninja-lab.vercel.app/

- Reader: https://ninja-moons-ask-ninja-lab.vercel.app/student.html
- Teacher: https://ninja-moons-ask-ninja-lab.vercel.app/teacher.html

The **Ask NINJA** question field accepts typed text, with sample question chips and clearly labeled **built-in sample answers**. **This is not an AI service:** no OpenAI connection, no real AI inference, and no API cost.

No speech transcription or automatic reading analysis is used. The existing browser-based sample story narration and word meanings work without microphone transcription. Students can use the box without activating their microphone.

The teacher can test existing PeerJS live audio monitoring (one selected reader at a time). This is a **public shared unauthenticated adult-only technical test**; do not use with students, do not enter confidential data, and do not assume school deployment readiness.

No questions are stored, transmitted, or logged by this page. The page doesn't record speech. The live monitoring feature streams the selected reader's microphone to the teacher using a third-party signaling service; this is not production secure.

Before actual AI responses are enabled, add a private server-side model connection, authentication, classroom identity and access controls, rate limiting, per-class billing cap, data retention safeguards, appropriate child privacy/consent policies, and student-safety checks. Keep API credentials server-side and never in the public GitHub repository or client HTML.

This is an isolated Vercel project and GitHub experiment branch. The main NINJA MOONS site, Secret Garden, original working one-tap test, multireader lab, and old NINJA Reading Advice prototype are untouched.
