# NINJA Reading Advice — adult-only interactive preview

Preview: https://ninja-moons-reading-advice-preview.vercel.app/

- Teacher: https://ninja-moons-reading-advice-preview.vercel.app/teacher.html
- Reader: https://ninja-moons-reading-advice-preview.vercel.app/student.html

**Branding:** The feature is called **NINJA Reading Advice**, never "ChatGPT" on the user interface.

This experimental page incorporates the isolated multireader WebRTC teacher listening prototype, a **sample story** with click-to-start synthetic narration and hover/tap vocabulary definitions, a browser-provided SpeechRecognition transcript, and supportive rule-based hints. The transcript and hints are passed over PeerJS signaling to the teacher's connected browser. The teacher can monitor the currently selected reader's transcript while listening.

**Important limitations and safeguards:**
- Adult-only technical preview; **do not use with actual students**.
- Browser SpeechRecognition may send audio to a browser-vendor service. Its availability and privacy behavior depend on device/browser, and continuous recognition can be interrupted.
- The suggestions are word-matching practice rules; they are **not** backed by a language model and are not reliable reading proficiency scores. Use the "Preview example transcript" button to view the layout without transcription.
- There is **no OpenAI API connection**, student login, authentication, private classroom room, verified consent, persistence, formal transcription storage, or production security.
- This site itself does not store or record audio or transcripts. The app only transmits the selected reader's live microphone stream to the teacher via WebRTC; the browser speech engine receives microphone input on the reader device when enabled.
- The same unauthenticated peer room is publicly reachable. Do not speak private or student information.
- Full classroom rollout will require authenticated identities, private rooms, restricted teacher access, permissions, consent and records policy, accessibility, real device/browser reliability testing, scalable audio + transcription architecture, and secret-held server-side AI service credentials.
- The original main NINJA MOONS website, Secret Garden, working single-reader audio test, and previous multireader test are not changed.

The file is a standalone page; the Vercel rewrite configuration routes `/teacher.html` and `/student.html` to the same HTML with an in-page role switch. This code is saved on the separate experimental branch only.
