/* NINJA MOONS: one friendly mascot, including dynamically rendered controls. */
(()=>{'use strict';
 const base='https://ninjamoons.vercel.app/brand/';
 const visited=new WeakSet(),frames=new WeakSet();
 function mascot(doc){const img=doc.createElement('img');img.src=base+'mascot.webp';img.alt='';img.setAttribute('aria-hidden','true');img.className='nm-mascot';img.dataset.nmMascot='true';img.width=28;img.height=28;img.decoding='async';return img;}
 function replaceText(node){
  if(!node.nodeValue?.includes('🥷')||node.parentElement?.closest('script,style,textarea,input,select,option,[data-nm-mascot]'))return;
  const doc=node.ownerDocument,parts=node.nodeValue.split(/🥷\uFE0F?/g),frag=doc.createDocumentFragment();
  parts.forEach((part,i)=>{if(i)frag.append(mascot(doc));if(part)frag.append(doc.createTextNode(part));});node.replaceWith(frag);
 }
 function enhance(root){
  if(root.nodeType===3){replaceText(root);return;}
  if(!root.querySelectorAll||root.matches?.('script,style,textarea,input,select,option,[data-nm-mascot]'))return;
  const doc=root.ownerDocument;
  const marks=root.matches?.('img.nm-wordmark,img.nm-inline-wordmark')?[root]:[...root.querySelectorAll('img.nm-wordmark,img.nm-inline-wordmark')];
  for(const img of marks){if(!img.src.endsWith('/wordmark-compact.webp'))img.src=base+'wordmark-compact.webp';img.height=44;img.removeAttribute('width');}
  const walker=doc.createTreeWalker(root,4),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(replaceText);
  for(const el of root.querySelectorAll('.brand,.site-logo,.logo')){
   if(el.closest('#nm-site-nav')||el.dataset.nmWordmark||el.querySelector('button,input,select')||!/NINJA\s*M[O☾◔🌙\s]*ONS/i.test(el.textContent))continue;
   const img=doc.createElement('img');img.src=base+'wordmark-compact.webp';img.alt='NINJA MOONS';img.className='nm-inline-wordmark';img.width=132;img.height=44;el.replaceChildren(img);el.dataset.nmWordmark='true';
   if(el.tagName==='A')el.href='https://ninjamoons.vercel.app/';
  }
  const candidates=root.matches?.('iframe')?[root]:[...root.querySelectorAll('iframe')];
  for(const frame of candidates){if(frames.has(frame))continue;frames.add(frame);const enter=()=>{try{if(frame.contentDocument?.body)install(frame.contentDocument);}catch(e){}};frame.addEventListener('load',enter);enter();}
 }
 function install(doc){
  if(visited.has(doc)||!doc.body)return;visited.add(doc);
  if(!doc.querySelector('link[data-nm-brand-style]')){const css=doc.createElement('link');css.rel='stylesheet';css.href=base+'branding.css';css.dataset.nmBrandStyle='true';doc.head?.append(css);}
  let favicon=doc.querySelector('link[rel="icon"]');if(!favicon){favicon=doc.createElement('link');favicon.rel='icon';doc.head?.append(favicon);}favicon.href=base+'mascot.webp';favicon.type='image/webp';
  const nav=doc.getElementById('nm-site-nav')?.querySelector('nav');
  if(nav&&!nav.querySelector('.nm-live-menu')){
   const menu=doc.createElement('details');menu.className='nm-live-menu';const summary=doc.createElement('summary');summary.textContent='Live reading ▾';
   const links=doc.createElement('div');links.className='nm-live-links';
   for(const [label,url] of [['Teacher · Listen & transcript','teacher.html'],['Reader · Microphone & Ask NINJA','student.html']]){const a=doc.createElement('a');a.textContent=label;a.href='https://ninja-moons-ask-ninja-lab.vercel.app/'+url;links.append(a);}
   menu.append(summary,links);nav.append(menu);
  }
  enhance(doc.body);
  const observer=new MutationObserver(records=>{for(const r of records){if(r.type==='characterData')replaceText(r.target);else for(const n of r.addedNodes)enhance(n);}});
  observer.observe(doc.body,{childList:true,subtree:true,characterData:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(document),{once:true});else install(document);
})();
