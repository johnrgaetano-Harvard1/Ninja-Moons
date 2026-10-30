# NINJA MOONS — Ask NINJA question box with restored transcription

Live adult-only test: https://ninja-moons-ask-ninja-lab.vercel.app/

- Reader: https://ninja-moons-ask-ninja-lab.vercel.app/student.html
- Teacher: https://ninja-moons-ask-ninja-lab.vercel.app/teacher.html
- AI endpoint readiness status: https://ninja-moons-ask-ninja-lab.vercel.app/api/ask

## What works today
- Teacher can connect to and hear the selected reader through the WebRTC PeerJS audio test.
- Student and teacher have blue live browser-transcription panels, using SpeechRecognition where supported. A transcript is sent over the PeerJS data channel.
- Word hover definitions, click-to-speak narration, and sample reading sentences.
- An Ask NINJA typed-question form. Built-in sample answers continue to work without AI.
- A production-deployed Vercel function at `api/ask.mjs` handles short, text-only AI questions using AI Gateway, when explicitly activated.

## Activation (NOT DONE: remain billable-call disabled)
The Vercel server function checks all three:
1. `NINJA_AI_ENABLED=true` set in **this test project's** production environment.
2. `NINJA_TEST_ACCESS_CODE` set to a long, unpredictable value in the Vercel project environment. Only an adult with this access code should test the API.
3. Valid Vercel OIDC credentials injected by Vercel or `AI_GATEWAY_API_KEY` stored securely in this project's environment.

**Before enabling any paid call**, the owner should configure a small Vercel AI Gateway **project spending limit** and confirm account billing/credits, then review authentication and data-handling requirements. The function has a per-IP best-effort, in-memory request counter, but **this is not a distributed rate limiter or hard spending cap**. No full public classroom launch should happen without real authenticated sessions, global rate limits, consent and privacy handling. This prototype is strictly adult-only and unauthenticated for listening.

The function sends only the typed question plus current sample story sentence to `openai/gpt-5-nano` through Vercel AI Gateway, not microphone audio, a transcript, or recording. There is no automatic AI reading analysis. The browser itself may send audio to its browser speech-recognition vendor; that is separate and has device/browser-specific availability and terms.

**Do not put any API keys, access codes, student audio, or student data into this public GitHub experiment or inline client HTML.** No code changes to the original NINJA MOONS website, Secret Garden, the single-reader prototype, or the earlier multireader test have been made.
