# Generic NINJA MOONS publisher

No new story is required to build or validate the engine.

The build scans all publishing-lab/stories/<slug>/manifest.json and validates title, status:"ready", imageStatus:"complete", sequential page numbers, text, image sizes and SHA256 hashes. New stories use their own folder with images/ assets. Any invalid or incomplete story blocks release.

Each ready story gets a reader if index.html does not exist, or if generatedReader:true is set; existing custom readers are preserved. Build output is dist/ and includes catalog.json plus health.json. It does not modify the original NINJA MOONS website or its Microsoft voices.

Vercel release workflow: commit prepared story package to lab branch, build preview, test its pages and images, then release to *lab only*. A future independent GitHub repository is still needed to avoid unrelated Secret Garden preview builds. This project does not provide a web upload form, story generation, or payment setup.