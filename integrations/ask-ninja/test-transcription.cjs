const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const els={};const element=id=>els[id]||=( {textContent:'',listeners:{},addEventListener(t,f){this.listeners[t]=f}} );
let current;class Recognition{constructor(){current=this;}start(){this.onstart?.()}abort(){}}
const sent=[],timers=[];const c={window:{SpeechRecognition:Recognition},navigator:{userAgent:'iPhone'},role:'reader',active:true,connection:{open:true},$:element,safeSend:(conn,msg)=>sent.push(msg),setTimeout:(f,ms)=>{timers.push(f);return timers.length;},clearTimeout:()=>{},Date,console,startReader:()=>{}};vm.createContext(c);const html=fs.readFileSync(require('node:path').join(__dirname,'../navigation/sources/ask.html'),'utf8');const logic=html.slice(html.indexOf('/* Speech recognition is separate'),html.indexOf('function readerSentence()'));vm.runInContext(logic,c);
vm.runInContext('beginTranscription()',c);assert.equal(current.continuous,false);assert.match(element('readerTranscriptionState').textContent,/Listening/);
current.onresult({resultIndex:0,results:[Object.assign([{transcript:'The spaceship traveled among the stars.'}],{isFinal:true})]});assert.match(element('readerTranscript').textContent,/spaceship/);assert.match(sent.at(-1).text,/spaceship/);
current.onerror({error:'network'});current.onend();assert.equal(timers.length,1);timers.pop()();assert.match(element('readerTranscriptionState').textContent,/Listening/);
current.onerror({error:'not-allowed'});assert.match(element('readerTranscriptionState').textContent,/permission needed/);
element('retryTranscript').listeners.click();assert.match(element('readerTranscriptionState').textContent,/Listening/);
console.log('Transcription checks passed: reader result text, teacher data-channel update, bounded restart, permission feedback, explicit retry, and iPhone single-utterance mode.');
