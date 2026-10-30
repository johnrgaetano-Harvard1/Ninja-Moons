# Main library integration

These are the versioned sources deployed to the ninja-reader-story-library Vercel project. Deploy index.html also as grades.html and helper.html unchanged. The main project keeps its existing /reader and /reading-helper rewrites.

The main project's /published/(.*) rewrite points to https://ninja-moons-publisher.vercel.app/$1. It serves the generated catalog, illustrated readers, reader JSON and images under the main site's origin. Existing two readers continue using their original routes and text loader.

## Publish one story
1. Prepare one folder with story.json and its images. Supply a title, readingLevel (K, Kindergarten, or Grade 1–12), pages with lines and image paths, and optional vocabulary [{word,say,meaning}], description and topics.
2. Run import-story.js --source <folder> --slug <slug> --check, then the same command without --check. Existing slugs are protected.
3. Run node publishing-lab/publisher/test-import.js and node publishing-lab/publisher/build.js. Inspect dist/catalog.json, stories/<slug>/reader.json and every illustration.
4. Commit the complete story folder and source changes together to the connected repository. Test a preview, then publish to main. Vercel builds and validates the catalog and text automatically.
5. Verify https://ninjamoons.vercel.app/reader?level=<grade>, /published/stories/<slug>/ and /reading-helper?story=<slug>. No per-story library edits or routing changes are needed.

This publishes prepared content; it does not generate or approve story text or illustrations. The 180-title, 13-level curriculum remains future content work.
