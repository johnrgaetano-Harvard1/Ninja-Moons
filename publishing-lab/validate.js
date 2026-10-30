"use strict";
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=__dirname;
function die(x){console.error('PUBLISH VALIDATION FAILED:',x);process.exit(1)}
const h=JSON.parse(fs.readFileSync(path.join(root,'health.json'))),p=JSON.parse(fs.readFileSync(path.join(root,'stories/zoom-trip/manifest.json')));
if(h.service!=='ninja-moons-publishing-lab'||h.storyPages!==14||h.illustrations!=='complete')die('Invalid site health manifest');
if(p.pages.length!==14||p.status!=='ready'||p.imageStatus!=='complete')die('Incomplete story');
const pageHtml=fs.readFileSync(path.join(root,'stories/zoom-trip/index.html'),'utf8');
const homeHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!homeHtml.includes('/stories/zoom-trip/'))die('Library link missing');
for(const [i,page] of p.pages.entries()){
 if(page.page!==i+1 || !Array.isArray(page.lines)||page.lines.length<2)die('Story text missing for page '+(i+1));
 const fp=path.resolve(root,'stories/zoom-trip',page.image);
 if(!fp.startsWith(path.resolve(root,'stories/zoom-trip/images/') ))die('Unsafe image path '+page.image);
 if(!fs.existsSync(fp)||fs.statSync(fp).size!==page.imageBytes)die('Image missing or wrong size: '+page.image);
 const sh=crypto.createHash('sha256').update(fs.readFileSync(fp)).digest('hex');if(sh!==page.sha256)die('Image checksum mismatch: '+page.image);
 if(!pageHtml.includes('"page":'+page.page) && !pageHtml.includes('"page": '+page.page))die('Page data missing in illustrated reader: '+page.page);
}
if(!pageHtml.includes('NINJA READER — Sentence Practice'))die('Sentence practice helper missing');
console.log('PUBLISH VALIDATION PASSED: 14 original illustrations, 14 story pages, image checksums, reading helper, library navigation');