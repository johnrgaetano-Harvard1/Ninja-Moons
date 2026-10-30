# Ask NINJA — low-cost question-box preview

Live preview: https://ninja-moons-ask-ninja-lab.vercel.app/

- Reader: https://ninja-moons-ask-ninja-lab.vercel.app/student.html
- Teacher: https://ninja-moons-ask-ninja-lab.vercel.app/teacher.html

The **Ask NINJA** question field accepts typed text, with sample question chips and clearly labeled **built-in sample answers**. **This is not an AI service:** no OpenAI connection, no real AI inference, and no API cost.

**Restored:** Live browser-based SpeechRecognition converts the reader's spoken words to visible text in a blue transcript panel. Transcript and status are sent over the existing PeerJS connection to the teacher dashboard and update as speech is recognized, regardless of which reader is currently selected for audible monitoring. There is **no paid AI transcription API and no automated reading analysis**. The question box also works independently without enabling a microphone. Availability and reliability depend on the browser; some browsers may send speech to their provider for processing.

The teacher can test existing PeerJS live audio monitoring (one selected reader at a time). This is a **public shared unauthenticated adult-only technical test**; do not use with students, do not enter confidential data, and do not assume school deployment readiness.

No typed Ask NINJA questions are stored or sent by the page. The app itself does not save transcripts or record audio, but the browser speech-recognition vendor may process microphone audio remotely. Transcript text travels over third-party PeerJS data signaling to the teacher in the unauthenticated test room. Live monitoring streams the selected reader's microphone to the teacher via WebRTC; this setup is not production-secure.

Before actual AI responses are enabled, add a private server-side model connection, authentication, classroom identity and access controls, rate limiting, per-class billing cap, data retention safeguards, appropriate child privacy/consent policies, and student-safety checks. Keep API credentials server-side and never in the public GitHub repository or client HTML.

This is an isolated Vercel project and GitHub experiment branch. The main NINJA MOONS site, Secret Garden, original working one-tap test, multireader lab, and old NINJA Reading Advice prototype are untouched.
