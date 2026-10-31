# NINJA MOONS shared branding

The wordmark is the user's supplied metallic white/cyan NINJA MOONS logo with its blue crescent and star field. `wordmark.jpg` preserves that supplied artwork. `mascot.webp` is the single friendly masked mascot used across the website, controls, and favicon. It is a transparent, optimized derivative of the original generated PNG, with no weapons.

`../navigation/site-nav.html` supplies the same logo and mascot in each connected page's persistent Home menu. `branding.css` keeps sizes consistent despite the different tool stylesheets. `branding.js` replaces the previous ninja emoji in visible text, including dynamically rendered controls, and updates legacy brand blocks and same-origin embedded readers. It does not change authentication, audio, story text, or AI settings.

The main project routes `/brand/(.*)` to `https://ninja-reader-story-library.vercel.app/brand/$1`. Keep the assets available whenever deploying the library. The publisher build copies this bundle and adds the same navigation to all generated stories.

Mascot generation used the built-in image-generation tool. Prompt: one friendly joyful masked ninja explorer, head and upper torso with a waving open hand; expressive smiling eyes; navy hood and mask, cyan headband with fabric tails, cyan accents and a white crescent badge; navy #07182c, icy cyan #54d7ff, silver/white; polished 3D children's science-adventure style; centered, readable at icon sizes, transparent background; no text, weapons, swords, knives, sticks, holsters, or crossed objects. The original PNG is retained with the generated artwork; the web derivative reduces the transfer size to about 24 KB.
