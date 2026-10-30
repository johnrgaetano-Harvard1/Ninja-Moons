# NINJA MOONS — isolated publishing lab

This directory contains the **verified source of the isolated test publisher**, fetched from https://ninja-moons-publishing-lab.vercel.app on October 29, 2026.

The source is on branch `publishing-lab-2026-10-29` of the private repository `Myninja-moons`. This branch is NOT merged into main and is NOT the source of the main NINJA MOONS website.

## Safety rules
- Do not change, redeploy, or relink the original `ninja-moons-reading-preview` Vercel project.
- Do not change the Secret Garden project or its main branch.
- Continue new publishing only through the independent `ninja-moons-publishing-lab` Vercel project.
- Always verify the story page, story JSON, and health JSON before marking a deployment healthy.
- Illustrations are NOT yet included in this lab; this is a text-and-navigation smoke test, not the finished illustrated book.
- Do not upload student information, school credentials, payment details, or voice recordings here.

## Important original-site backup limitation
The separate `backup/ninjamoons-live-2026-10-29` branch contains incomplete/truncated contents returned by the live Vercel source API. It is explicitly marked DO NOT DEPLOY. It is **not** a full restore backup. The last verified live main deployment id is `dpl_3wRGPCFiKk6GTC6AF6K9GR4CTjrq`.

## Next steps
1. Establish a full, verified backup of the original production source through a working download method.
2. Add media asset transfer and checksums to the publishing lab.
3. Enable GitHub-linked publishing for the **new lab only**, not the existing projects.
4. Test full 14-image story release on the lab before considering links on the main website.
