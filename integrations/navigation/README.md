# Navigation across NINJA MOONS

`site-nav.html` is the shared, script-free top menu. Every destination is an absolute URL on the main site, so separate tool deployments can always return home. The menu stays at the top while scrolling, wraps on small screens, and is hidden for printing.

The main library integration pages include this menu. The publisher build inserts it into the publishing library and all current and future story readers. `sources/` contains the updated public frontends for the trainer, race, Spanish reader, live listening, Ask NINJA, and the original story wrapper.

The deployments retain the original API sources, configuration, and data files by their SHA references in `deployments.json`. Do not replace a deployment with just its HTML if it also contains APIs or supporting files. Environment variables, teacher sign-in, adult test access, microphone activation, and AI budget settings remain managed by their existing projects.

`script-checksums.json` records the SHA256 of each tool's original script blocks. Navigation changes preserve those scripts exactly. The original story wrapper uses a flex layout to reserve space for the menu above its iframe instead of covering the story.

The Secret Garden's main-site route serves `../main-library/garden.html`, retaining all story text, images, and dictionary scripts. Its original standalone page already has a top link back to the main library. Recovery is served on the main origin so its original account-recovery API remains on the same origin.

Verify the full path from a dashboard to a tool and back through its Home menu. For live reading, verify both teacher and reader pages without starting a microphone. For AI, loading the page and checking its menu requires no paid AI question.
