# NINJA MOONS — Independent WebRTC Audio Pilot

This is a **standalone prototype**, not a modification of `ninjamoons.vercel.app`.

## What works in code

- Teacher and reader use two separate devices, over HTTPS with browser WebRTC.
- Teacher creates a listening offer and passes it privately to the reader.
- Reader explicitly enables the microphone, then returns an answer code.
- Teacher pastes the answer and can listen or mute the reader through normal earbuds.
- Teacher can create and select multiple peer connections (one unmuted at a time).
- Reader can send a demonstration current-sentence update over an encrypted WebRTC DataChannel.
- Reader Stop ends microphone tracks and the WebRTC session. No MediaRecorder, upload, cookies, analytics, student login or persistent storage.

## Testing steps

1. On an iPhone, connect Bluetooth earbuds and open `/teacher.html`. Choose Create listening code.
2. Open `/student.html` on a Chromebook or other device. Paste the teacher's code and click Start microphone. Grant browser permission.
3. Send the reader's response code back to the teacher, then paste it into the teacher dashboard and click Connect reader.
4. On iPhone, tap Hear selected reader. Student talks into the microphone. Earbuds should play the live voice.
5. Tap Next sentence on the reader device. The selected sentence should update on the teacher's phone.
6. Tap Mute on the teacher, then Hear again. Finally Stop microphone on the reader.

**This test uses lengthy copy-and-paste negotiation rather than classroom automatic pairing.** It does not include teacher authentication, secure school rosters, a TURN relay, or integration with the actual NINJA READER. It should be tested using your own devices or a consenting adult first, **not with students yet**.

## Technical details

The app generates a random one-time session ID using browser crypto, creates a recvonly audio transceiver and data channel on the teacher browser, and uses base64url-encoded SDP blobs copied manually to pair. All audio is WebRTC encrypted SRTP, peer-to-peer when compatible network paths are found. STUN discovery uses Google public STUN services; they can see connection metadata but not audio content. Firewalls, iOS autoplay rules, or restrictive NAT may prevent playback until a TURN relay or a better signaling service is added. No backend exists and the static server never receives live audio.

## Source files

- `index.html`: choose teacher vs reader
- `teacher.html`: teacher listening dashboard
- `student.html`: reader microphone and sentence controls
- `app.js`: WebRTC connection and safety logic
- `styles.css`: responsive styles

## Scope / next phase

The goal of this deliverable is real device-to-device microphone audio, not a simulated waveform. The next phase requires authenticated low-friction signaling and teacher roles, school-approved privacy controls, TURN connectivity, and actual NINJA READER progress integration. Browser automation in the execution environment was restricted, so **cross-device audio functionality must be confirmed with two real devices** before a school pilot.