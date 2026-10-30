#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto"),cp=require("node:child_process");
const src=path.resolve(__dirname,"..","stories","zoom-trip","images","page-01.webp");
const importer=path.join(__dirname,"import-story.js");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"nm-import-test-"));
const fixture=path.join(tmp,"fixture"),images=path.join(fixture,"images");
const slug="publisher-test-fixture";
const target=path.resolve(__dirname,"..","stories",slug);
function run(check=false){const args=[importer,"--source",fixture,"--slug",slug];if(check)args.push("--check");return cp.spawnSync(process.execPath,args,{encoding:"utf8"})}
function ok(condition,message){if(!condition)throw Error("STORY IMPORT TEST FAILED: "+message)}
try {
 ok(fs.existsSync(src),"real illustration fixture missing");
 ok(!fs.existsSync(target),"test destination preexists; refusing to overwrite");
 fs.mkdirSync(images,{recursive:true});fs.copyFileSync(src,path.join(images,"real.webp"));
 const story={title:"Validation fixture",readingLevel:"Grade 2",vocabulary:[{word:"test",say:"test",meaning:"A check."}],pages:[{lines:["A test sentence."],image:"images/real.webp"}]};
 fs.writeFileSync(path.join(fixture,"story.json"),JSON.stringify(story));
 const a=run(true);ok(a.status===0 && a.stdout.includes('"PASS"'),"check-only failed: "+a.stderr);
 ok(!fs.existsSync(target),"check-only wrote a story");
 const b=run();ok(b.status===0 && b.stdout.includes('"IMPORTED"'),"import failed: "+b.stderr);
 const m=JSON.parse(fs.readFileSync(path.join(target,"manifest.json"),"utf8"));
 const copied=path.join(target,"images","page-01.webp");
 ok(m.pages.length===1 && fs.existsSync(copied),"image or manifest not created");
 ok(m.pages[0].sha256===crypto.createHash("sha256").update(fs.readFileSync(copied)).digest("hex"),"checksum incorrect");
 ok(m.vocabulary[0].meaning==="A check.","vocabulary lost");
 const again=run();ok(again.status!==0 && again.stderr.includes("already exists"),"existing story was not protected");
 fs.rmSync(target,{recursive:true,force:true});
 fs.writeFileSync(path.join(fixture,"story.json"),JSON.stringify({...story,pages:[{lines:["A test."],image:"images/../notallowed.webp"}]}));
 const attack=run(true);ok(attack.status!==0 && attack.stderr.includes("unsafe image"),"unsafe path accepted");
 console.log("IMPORT TEST PASSED: dry-run, real image, SHA256, existing-story protection, unsafe-path rejection");
} finally {
 fs.rmSync(target,{recursive:true,force:true});
 fs.rmSync(tmp,{recursive:true,force:true});
}
