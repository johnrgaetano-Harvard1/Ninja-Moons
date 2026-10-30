# One-tap audio proof of concept

**Status:** Adult-only two-device demo; live microphone playback is **not yet verified on actual iPhone and Chromebook**.

Live test: https://ninja-moons-audio-test.vercel.app/teacher.html and https://ninja-moons-audio-test.vercel.app/student.html

The teacher clicks **Start Listening** and the reader clicks **Start Microphone** (accepts the browser microphone permission if prompted). The app uses the free PeerJS Cloud signaling service and WebRTC peer-to-peer audio with automatic waiting/retry. No manual copy/paste codes.

**Safety:** This prototype uses one shared demo room and has NO authentication or per-class access control. It is not suitable for use with actual students or private information. Do not embed in the live classroom product until a secure authenticated signaling service, private rooms, and authorization rules have been implemented and audited. WebRTC may require TURN service on school networks; default public STUN alone is not enough for all networks. No recording function is included. Audio is not saved by the app, but browser/device/service privacy still needs review.

**Isolation:** Store this experiment on its branch. Do not change the live main NINJA MOONS project or the Secret Garden production project. Vercel test project is separate. The HTML contains the styling and all role logic. The separate test deployment has two URL rewrites `/teacher.html` and `/student.html` to `/index.html`.
