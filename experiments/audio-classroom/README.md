# NINJA MOONS — Multi-Reader Listening Laboratory

## Status
- **Deployed adult-only prototype:** https://ninja-moons-classroom-audio-lab.vercel.app/
- **Teacher:** https://ninja-moons-classroom-audio-lab.vercel.app/teacher.html
- **Reader:** https://ninja-moons-classroom-audio-lab.vercel.app/student.html
- **Isolation:** This lab is in the Vercel project `ninja-moons-classroom-audio-lab` and a separate GitHub branch `audio-classroom-multireader-lab`. Original live NINJA MOONS and the working one-to-one audio test were not redeployed.
- **Verifications:** Vercel deployment READY; both role URLs HTTP 200; JavaScript parses; simulated two-reader connection/switching passed, with only the selected reader in streaming state.
- **Not yet verified:** Three physical devices on the intended school network, actual Bluetooth playback during switching, long-duration stability, 30 real simultaneous reader connections.

## How to test (consenting adults only)
1. Open the teacher URL and press **Start Class Listening**.
2. On two other devices, open the reader URL and press **Start Microphone**, allowing browser microphone permission.
3. The teacher sees **Reader 01** and **Reader 02** automatically.
4. Tap each reader; only that selected reader sends an active WebRTC audio call.
5. Change the sample sentence on a reader. It should appear when that reader is selected.
6. Press Stop Microphone on a reader; it must disappear from the teacher roster.

## Important production blockers
- **NO authentication, classroom tenancy, device enrollment, user identity check, or permissions**. Public PeerJS signaling / a shared demo room means unauthorized parties could join. Do NOT use with actual students.
- **No TURN service:** WebRTC using public STUN may fail on restrictive school Wi-Fi.
- **No backend presence store:** The roster is in-memory in the open teacher browser and disappears on refresh. Reader labels are assigned by order, not linked to actual names.
- **No recording:** The application does not save audio; browser and third-party signaling privacy need a school legal/privacy review before any deployment with minors.
- **AI feedback OFF:** No audio/transcript is sent to ChatGPT, OpenAI, or other AI service. Future work: first add authorized classroom sessions and consent; then opt-in transcription and clearly labeled, human-reviewable constructive reading comments. Avoid grading children without teacher supervision.

## Architecture
PeerJS Cloud for signaling, WebRTC media streams for real-time audio, a reliable PeerJS data channel for reader presence, selected status, and sample sentence. Up to 30 reader connections are listed while just one selected reader initiates live audio to the teacher. Switching sends pause to the old reader, which closes its media call, and listen to the next selected reader. The microphone stays active on each reader device until they press Stop.

The source intentionally stays separate from the original classroom website and the prior working two-device test.
