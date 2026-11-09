"use strict";
// NINJA MOONS LIVE TEST ONLY: browser-side AES-256-GCM.
// The message server receives ciphertext, never this 256-bit key.
// The teacher privately transfers the key to a student in a URL fragment (#),
// which browsers do not include in HTTP requests. Links containing the key are secret.
(function(){
 const PREFIX="nmE2E1";
 const STORAGE="nm-live-test-aes-key-v1";
 // Public demonstration only: shared room/key allow immediate no-login two-way testing.
 // Never use this shared demo for real student or private classroom messages.
 const DEMO_KEY="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
 const encode=new TextEncoder(),decode=new TextDecoder("utf-8",{fatal:true});
 let secret="",key=null,keyId="";
 const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 const fromBase64url=value=>{
  if(!/^[A-Za-z0-9_-]+$/.test(value))throw Error("Invalid encryption data.");
  const normalized=value.replace(/-/g,"+").replace(/_/g,"/");
  const s=atob(normalized+"=".repeat((4-normalized.length%4)%4));
  return Uint8Array.from(s,ch=>ch.charCodeAt(0));
 };
 function assertCrypto(){
  if(!globalThis.crypto?.subtle||!globalThis.crypto?.getRandomValues)
   throw Error("This browser cannot use secure end-to-end encryption. Open the page using HTTPS in an up-to-date browser.");
 }
 function hashKey(){
  const hash=new URLSearchParams(location.hash.replace(/^#/,""));
  const value=hash.get("nmkey");
  return value||"";
 }
 async function setKey(value){
  assertCrypto();
  if(!/^[A-Za-z0-9_-]{43}$/.test(value))throw Error("Invalid AES-256 test invitation. Open the student link from the Teacher screen.");
  const bytes=fromBase64url(value);
  if(bytes.length!==32)throw Error("The test encryption key must be exactly 256 bits.");
  const imported=await crypto.subtle.importKey("raw",bytes,{name:"AES-GCM"},false,["encrypt","decrypt"]);
  const fingerprint=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
  secret=value;key=imported;keyId=Array.from(fingerprint.slice(0,4),b=>b.toString(16).padStart(2,"0")).join("").toUpperCase();
  // Only the imported non-extractable key is used for encryption after this step.
 }
 async function teacher(){
  assertCrypto();
  let value=new URLSearchParams(location.search).get("test")==="live"?DEMO_KEY:hashKey();
  if(!value){
   try{value=localStorage.getItem(STORAGE)||""}catch(_e){}
  }
  if(!value){
   const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
   value=base64url(bytes);
  }
  await setKey(value);
  try{localStorage.setItem(STORAGE,value)}catch(_e){}
  return {keyId};
 }
 async function student(){
  assertCrypto();
  let value=new URLSearchParams(location.search).get("test")==="live"?DEMO_KEY:hashKey(),generated=false;
  // Opening the student story directly must not leave Send permanently disabled.
  // Generate a secret locally, and provide a paired TEACHER link to share it.
  if(!value){
   const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
   value=base64url(bytes);generated=true;
   // A # fragment is never included in the HTTP request to the server.
   try{history.replaceState(null,"",location.pathname+location.search+"#nmkey="+value)}
   catch(_error){location.hash="nmkey="+value}
  }
  await setKey(value);
  return {keyId,generated};
 }
 function teacherLink(){
  if(!secret||!key)throw Error("No encryption key loaded.");
  const url=new URL("/station/teacher.html?test=live",location.origin);
  url.hash="nmkey="+secret;
  return url.href;
 }
 function studentLink(url){
  if(!secret||!key)throw Error("Teacher encryption has not been initialized.");
  const out=new URL(url,location.origin);
  out.hash="nmkey="+secret;
  return out.href;
 }
 const aad=sender=>encode.encode("ninjamoons:two-screen-test:v1:"+sender);
 async function seal(message,sender){
  if(!key)throw Error("Encryption is not ready.");
  if(sender!=="student"&&sender!=="teacher")throw Error("Unknown message sender.");
  const plaintext=encode.encode(String(message||"").trim());
  if(!plaintext.length||plaintext.length>450)
   throw Error("Please keep messages under 450 UTF-8 bytes (shorter for non-English characters).");
  const iv=new Uint8Array(12);crypto.getRandomValues(iv);
  const cipher=new Uint8Array(await crypto.subtle.encrypt({
   name:"AES-GCM",iv,additionalData:aad(sender),tagLength:128
  },key,plaintext));
  const envelope=PREFIX+"."+base64url(iv)+"."+base64url(cipher);
  if(envelope.length>750)throw Error("Encrypted message exceeds the test-room limit.");
  return envelope;
 }
 async function open(envelope,sender){
  if(!key)throw Error("Decryption key missing.");
  if(sender!=="student"&&sender!=="teacher")throw Error("Unknown sender.");
  if(typeof envelope!=="string"||!/^nmE2E1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22,690}$/.test(envelope))
   throw Error("Not an encrypted test message.");
  const pieces=envelope.split(".");
  const iv=fromBase64url(pieces[1]);if(iv.length!==12)throw Error("Invalid message IV.");
  const cipher=fromBase64url(pieces[2]);
  const plaintext=await crypto.subtle.decrypt({
   name:"AES-GCM",iv,additionalData:aad(sender),tagLength:128
  },key,cipher);
  return decode.decode(plaintext);
 }
 window.NMLiveE2E=Object.freeze({teacher,student,studentLink,teacherLink,seal,open,get keyId(){return keyId}});
})();
