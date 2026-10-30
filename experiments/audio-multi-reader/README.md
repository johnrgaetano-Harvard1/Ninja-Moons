# NINJA MOONS • Multi-Reader Audio Lab

This is a standalone **adult-only prototype** with a separate Vercel project, not a change to any original NINJA MOONS classroom website or the working one-reader demo.

- Teacher: https://ninja-moons-audio-classroom-lab.vercel.app/teacher.html
- Reader: https://ninja-moons-audio-classroom-lab.vercel.app/student.html
- One button for the teacher and each reader. No codes or messages.
- Teacher shows an automatically populated roster of connected readers (up to 12 in this adult-only test) and can switch listening by tapping a card.
- The *selected* reader transmits live microphone audio; unselected readers are connected to signaling but not transmitting their microphone to the teacher.
- Reader name is optional; without one the teacher assigns Reader 01, Reader 02, etc.
- The practice text and current sentence update across the signaling data channel.
- The AI Reading Coach UI is an explicitly disabled placeholder. **No audio is sent to OpenAI.**
- WebRTC PeerJS Cloud `0.peerjs.com` signaling + Google STUN. On restrictive networks reliable audio may require TURN.
- This app does not save or record microphone audio; it is transmitted live to the teacher when selected.

## Not production ready

The demo has **no login, no teacher identity verification, and one public shared room**. Anyone who knows the URLs could join or attempt to listen. Do **not** involve children, real student names or private classroom information. Authentication, per-class rooms, secure signaling, identity-protected rosters, class-admin permissions, consent/FERPA review and functional load tests are required before student deployment.

## Future AI feature

Only after teacher-selected audio is reliable and the access controls are implemented, add teacher-controlled, opt-in transcription and short feedback with teacher review and data-minimization. The AI will be advisory, not an authoritative reading assessment. Using the OpenAI API requires a separate account and possible usage charges.

## Running

Serve `index.html` over HTTPS with the included Vercel rewrite configuration. For local development, an HTTPS/localhost context is required for microphone permissions. Paths `/teacher.html` and `/student.html` rewrite to `index.html`, and the browser selects the interface using the URL pathname.

This source is saved on an **experimental GitHub branch** and is not merged into the production website.
