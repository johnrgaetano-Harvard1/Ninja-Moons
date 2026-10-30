# NINJA MOONS — Independent Publishing Engine

This repository contains the standalone NINJA MOONS publishing system. It is linked to the **ninja-moons-publisher** Vercel project, not to the original classroom site or Secret Garden.

## Story publishing

The source lives in `publishing-lab/`. Each story has its own validated `stories/<slug>/` directory and `manifest.json` with safe image paths, byte sizes and SHA256 fingerprints. Story content and image imports are checked automatically before deployment.

The build command (configured in `vercel.json`) is:

```sh
node publishing-lab/publisher/test-import.js && node publishing-lab/publisher/build.js
```

When the validation passes, Vercel publishes the static site, `catalog.json`, generated readers and preserved custom readers. The importer rejects overwrites and unsafe images. A failed build does not replace an existing healthy release.

## Safety boundaries

- **Main site**: https://ninjamoons.vercel.app/ — must remain unchanged.
- **Secret Garden**: https://ninja-moons-secret-garden.vercel.app/ — separate Git repository.
- **Independent publisher**: https://ninja-moons-publisher.vercel.app/ — builds from *this* repository.
- **Previous lab**: https://ninja-moons-publishing-lab.vercel.app/ — preserved as prior working release.

No student accounts, voice recordings, payment credentials, or backend secrets belong in this public repository. The original main site's complete server-side backup has not been verified.

The current publishing engine is a validated content-to-deployment pipeline, not a fully autonomous story-writing/illustration service or a browser-based uploader.
