# NINJA MOONS story import

Accept a finished story without writing another story. Make a source folder with `story.json` and `images/`.

```json
{
  "title":"A Story Title",
  "readingLevel":"Grade 2",
  "pages":[
    {"lines":["First easy sentence.","Second easy sentence."],"image":"images/01.webp"}
  ]
}
```

Run:

```sh
node publishing-lab/publisher/import-story.js --source /path/to/story --slug my-story --check
node publishing-lab/publisher/import-story.js --source /path/to/story --slug my-story
node publishing-lab/publisher/build.js
```

The importer refuses to overwrite existing stories, rejects unsafe filenames and symlinks, validates page content and image sizes, and calculates SHA256 fingerprints. The generic builder then validates all stories and generates the catalog and readers. No credentials, student data or online services are needed for the import. A GitHub/Vercel publishing action remains the last release step.

Note: this command runs on a filesystem, not in a website upload box. The user should not be asked to manually provide tokens; any connected GitHub/Vercel publishing would be carried out through their authorized integrations.
