/* NINJA MOONS — stand-alone live audio proof of concept.
 * This site has no backend and never records audio.
 * Each teacher↔reader pair connects over WebRTC via exchanged SDP codes.
 * This is a proof of concept for adult-only testing, not an authenticated classroom system.
 */
(() => {
  'use strict';
  const role = document.body.dataset.role;
  if (!['teacher','student'].includes(role)) return;
  const $ = id => document.getElementById(id);
  const stun = {iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}], iceCandidatePoolSize:1};
  const sampleLines = [
    'The little robot looked at the stars.',
    'The blue ship flew past the moon.',
    'The ninjas helped the flowers grow.',
    'How did they travel so far in seven seconds?'
  ];

  function status(id, message, kind='normal') {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind;
  }
  function exceptionText(err) { return err && err.message ? err.message : String(err); }
  function capabilities() {
    if (!window.isSecureContext || typeof RTCPeerConnection !== 'function') {
      throw Error('WebRTC needs a secure HTTPS page on a supported browser.');
    }
    if (!window.crypto?.getRandomValues) throw Error('Secure browser randomness is unavailable.');
  }
  function token() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  }
  function encode(message) {
    const data = new TextEncoder().encode(JSON.stringify(message));
    let binary='';
    for(const ch of data) binary+=String.fromCharCode(ch);
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function decode(code,kind) {
    const raw = String(code||'').replace(/\s+/g,'').trim();
    if (!raw || raw.length > 80000 || !/^[A-Za-z0-9_-]+$/.test(raw)) throw Error('Invalid setup code. Copy the entire code without adding extra characters.');
    let decoded;
    try {
      const s=atob(raw.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-raw.length%4)%4));
      const bytes=Uint8Array.from(s,c=>c.charCodeAt(0));
      decoded=JSON.parse(new TextDecoder().decode(bytes));
    }catch{throw Error('Could not read the setup code. Please copy it again.');}
    if (decoded?.v!==1 || decoded?.kind!==kind || typeof decoded?.id!=='string' || !/^[a-f0-9]{32}$/.test(decoded.id)
        || decoded?.description?.type!==kind || typeof decoded.description.sdp!=='string'
        || decoded.description.sdp.length<100 || decoded.description.sdp.length>60000) {
      throw Error('This is not a valid '+kind+' code.');
    }
    return decoded;
  }
  function waitForIce(pc) {
    if (pc.iceGatheringState==='complete') return Promise.resolve();
    return new Promise((resolve,reject)=>{
      let finished=false;
      const timeout=setTimeout(()=>done(new Error('Network address gathering timed out. Try again on Wi-Fi.')),25000);
      const check=()=>{if(pc.iceGatheringState==='complete')done();};
      function done(error) {
        if(finished)return;
        finished=true;clearTimeout(timeout);pc.removeEventListener('icegatheringstatechange',check);
        if(error)reject(error);else resolve();
      }
      pc.addEventListener('icegatheringstatechange',check);
      check();
    });
  }
  async function copyText(value, elementId) {
    if(!value) return;
    try {
      await navigator.clipboard.writeText(value);
      status(elementId,'Copied. Paste it in a private message or on the other device.','ok');
    }catch {
      status(elementId,'Copy is blocked by your browser. Select the code and use Copy.','warn');
    }
  }
  async function shareText(value,title,elementId) {
    if(!value)return;
    if(!navigator.share){await copyText(value,elementId);return;}
    try { await navigator.share({title,text:value}); }
    catch(err){if(err.name!=='AbortError')status(elementId,'Sharing was not completed. Use Copy instead.','warn');}
  }
  function initTeacher() {
    const sessions = new Map();
    let activeId = null;
    let creating = false;
    function active(){ return activeId ? sessions.get(activeId) : null; }
    function choose(id) {
      const chosen=sessions.get(id);
      if(!chosen)return;
      for(const s of sessions.values()) {
        s.listening=false;
        if(s.player){s.player.pause();s.player.muted=true;}
        if(s.dc?.readyState==='open')try{s.dc.send(JSON.stringify({type:'monitor',active:s.id===id&&s.listening}));}catch{}
      }
      activeId=id;
      $('offerOut').value=chosen.offerCode||'';
      $('answerIn').value='';
      $('copyOffer').disabled=!chosen.offerCode;
      $('shareOffer').disabled=!chosen.offerCode;
      $('applyAnswer').disabled=chosen.answered||!chosen.offerCode;
      $('listen').disabled=!chosen.player;
      $('silence').disabled=!chosen.player;
      status('pairStatus',chosen.connected?'Connected to '+chosen.label:chosen.answered?'Waiting for WebRTC connection':'Paste a response for '+chosen.label,chosen.connected?'ok':'normal');
      status('audioStatus',chosen.player?'Tap “Hear selected reader” to play live microphone audio.':'No live audio stream received yet.');
      $('readingText').textContent=chosen.sentence||'Waiting for the reader’s selected sentence…';
      $('readingDetail').textContent=chosen.position||'Sentence progress will appear here when paired.';
      renderSessions();
    }
    function renderSessions() {
      const list=$('sessions'); list.replaceChildren();
      if(sessions.size===0){const p=document.createElement('p');p.className='hint';p.textContent='No test readers paired yet.';list.append(p);return;}
      for(const s of sessions.values()){
        const el=document.createElement('section');el.className='session';el.setAttribute('aria-current',String(s.id===activeId));
        const title=document.createElement('div');title.className='name';title.textContent=s.label;
        const meta=document.createElement('div');meta.className='meta';meta.textContent=s.connected?(s.listening?'🎧 Listening now':'Connected — muted'):s.answered?'Connecting…':'Waiting for reader response';
        const chooseBtn=document.createElement('button');chooseBtn.className='smallbtn';chooseBtn.textContent=s.id===activeId?'Selected':'Select reader';chooseBtn.disabled=s.id===activeId;
        chooseBtn.addEventListener('click',()=>choose(s.id));
        const endBtn=document.createElement('button');endBtn.className='smallbtn warning';endBtn.textContent='End';endBtn.addEventListener('click',()=>endSession(s.id));
        el.append(title,meta,chooseBtn,endBtn);list.append(el);
      }
    }
    function endSession(id) {
      const s=sessions.get(id);if(!s)return;
      try{s.player?.pause();s.player?.remove();s.dc?.close();s.pc?.close();}catch{}
      sessions.delete(id);
      if(activeId===id)activeId=null;
      const next=sessions.keys().next().value;
      if(next)choose(next);
      else {
        $('offerOut').value='';$('answerIn').value='';$('copyOffer').disabled=true;$('shareOffer').disabled=true;
        $('applyAnswer').disabled=true;$('listen').disabled=true;$('silence').disabled=true;
        $('readingText').textContent='Waiting for a test reader…';$('readingDetail').textContent='No reader selected.';
        status('audioStatus','No live audio.');status('pairStatus','No current pairing.');renderSessions();
      }
    }
    async function create() {
      if(creating)return;
      try{
        capabilities(); creating=true;$('create').disabled=true;
        status('createStatus','Creating a listening code (network check)…');
        const label=$('studentLabel').value.trim().slice(0,40)||'Test reader '+(sessions.size+1);
        const pc=new RTCPeerConnection(stun); const id=token();
        const session={id,pc,label,dc:null,offerCode:'',answered:false,connected:false,listening:false,player:null,sentence:'',position:''};
        sessions.set(id,session);
        pc.addTransceiver('audio',{direction:'recvonly'});
        const dc=pc.createDataChannel('reading-progress',{ordered:true});session.dc=dc;
        dc.onmessage=(event)=>{
          try{
            if(typeof event.data!=='string'||event.data.length>1000)return;
            const msg=JSON.parse(event.data);
            if(msg.type!=='progress'||typeof msg.sentence!=='string'||typeof msg.position!=='string')return;
            session.sentence=msg.sentence.slice(0,200);session.position=msg.position.slice(0,120);
            if(activeId===session.id){$('readingText').textContent=session.sentence;$('readingDetail').textContent=session.position;}
          }catch{}
        };
        pc.ontrack=(event)=>{
          if(event.track.kind!=='audio')return;
          const player=document.createElement('audio');player.autoplay=false;player.playsInline=true;player.muted=true;
          player.srcObject=event.streams[0]||new MediaStream([event.track]);
          $('audioRack').append(player);session.player=player;
          if(activeId===id){$('listen').disabled=false;$('silence').disabled=false;status('audioStatus','Audio stream received. Tap “Hear selected reader” to play.','ok');}
          renderSessions();
        };
        pc.onconnectionstatechange=()=>{
          session.connected=pc.connectionState==='connected';
          if(pc.connectionState==='failed'){
            if(activeId===id)status('pairStatus','Peer connection failed. Try the same Wi-Fi network; some networks require a relay.','error');
          } else if(activeId===id){status('pairStatus','Network: '+pc.connectionState,session.connected?'ok':'normal');}
          renderSessions();
        };
        await pc.setLocalDescription(await pc.createOffer());
        await waitForIce(pc);
        session.offerCode=encode({v:1,kind:'offer',id,description:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}});
        choose(id);
        status('createStatus','Ready! Share the listening code with the reader.','ok');
      }catch(err){
        status('createStatus',exceptionText(err),'error');
      }finally{creating=false;$('create').disabled=false;}
    }
    async function applyAnswer() {
      const s=active();if(!s||s.answered)return;
      try{
        const decoded=decode($('answerIn').value,'answer');
        if(decoded.id!==s.id)throw Error('This response belongs to another listening session. Select the matching reader.');
        await s.pc.setRemoteDescription(new RTCSessionDescription(decoded.description));
        s.answered=true; $('applyAnswer').disabled=true;
        status('pairStatus','Pairing accepted. Connecting live microphone…');renderSessions();
      }catch(err){status('pairStatus',exceptionText(err),'error');}
    }
    async function listen() {
      const s=active();if(!s?.player)return;
      for(const x of sessions.values()){
        x.listening=false;
        if(x.player){x.player.pause();x.player.muted=true;}
        if(x.dc?.readyState==='open')try{x.dc.send(JSON.stringify({type:'monitor',active:false}));}catch{}
      }
      s.listening=true;
      s.player.muted=false;s.player.volume=1;
      try{
        await s.player.play();
        status('audioStatus','🎧 Listening to '+s.label+'. Audio is live; nothing is recorded.','ok');
        if(s.dc?.readyState==='open')s.dc.send(JSON.stringify({type:'monitor',active:true}));
      }catch(err){s.listening=false;status('audioStatus','Tap Hear again to allow playback. '+exceptionText(err),'warn');}
      renderSessions();
    }
    function silence() {
      const s=active();if(!s)return;
      s.listening=false;
      if(s.player){s.player.pause();s.player.muted=true;}
      if(s.dc?.readyState==='open')try{s.dc.send(JSON.stringify({type:'monitor',active:false}));}catch{}
      status('audioStatus','Muted. The connection remains open; tap Hear to listen again.');renderSessions();
    }
    $('create').addEventListener('click',create);
    $('copyOffer').addEventListener('click',()=>copyText($('offerOut').value,'createStatus'));
    $('shareOffer').addEventListener('click',()=>shareText($('offerOut').value,'NINJA MOONS listening code','createStatus'));
    $('applyAnswer').addEventListener('click',applyAnswer);
    $('listen').addEventListener('click',listen);
    $('silence').addEventListener('click',silence);
    window.addEventListener('pagehide',()=>{for(const s of [...sessions.values()])endSession(s.id);});
  }
  function initStudent() {
    let pc=null,mic=null,audioContext=null,analyser=null,raf=0,channel=null,index=0,sharedId=null;
    function makeProgress(){
      const customized=$('customSentence').value.trim();
      const sentence=customized||sampleLines[index];
      return {type:'progress',sentence:sentence.slice(0,200),position:customized?'Custom practice sentence':'Sample practice · sentence '+(index+1)+' of '+sampleLines.length};
    }
    function sendProgress(){
      if(channel?.readyState!=='open') {status('progressStatus','The teacher will receive your sentence after pairing.','warn');return;}
      channel.send(JSON.stringify(makeProgress()));status('progressStatus','The teacher’s screen has been updated.','ok');
    }
    function showSentence(){
      $('sentence').textContent=sampleLines[index];
      $('sentenceCount').textContent='Practice sentence '+(index+1)+' of '+sampleLines.length;
      $('prevSentence').disabled=index===0;
      $('nextSentence').textContent=index===sampleLines.length-1?'Start again ↻':'Next sentence →';
      sendProgress();
    }
    function stop(){
      if(raf)cancelAnimationFrame(raf);raf=0;
      $('level').style.width='0%';
      if(mic){mic.getTracks().forEach(t=>t.stop());mic=null;}
      if(pc){pc.close();pc=null;}
      if(audioContext){audioContext.close().catch(()=>{});audioContext=null;}
      analyser=null;channel=null;sharedId=null;
      $('start').disabled=false;$('stopMic').disabled=true;$('answerOut').value='';$('copyAnswer').disabled=true;$('shareAnswer').disabled=true;
      status('micStatus','Microphone is off.','normal');status('connectionStatus','Disconnected.','normal');
    }
    function meter(){
      if(!analyser)return;
      const data=new Uint8Array(analyser.fftSize);
      const draw=()=>{
        if(!analyser||!mic)return;
        analyser.getByteTimeDomainData(data);
        let n=0;for(const c of data){const d=(c-128)/128;n+=d*d;}
        const rms=Math.sqrt(n/data.length),level=Math.min(100,Math.max(0,rms*350));
        $('level').style.width=level+'%';
        raf=requestAnimationFrame(draw);
      };draw();
    }
    async function start(){
      if(pc||mic)return;
      try{
        capabilities();if(!navigator.mediaDevices?.getUserMedia)throw Error('This device does not support secure microphone capture.');
        const msg=decode($('offerIn').value,'offer');sharedId=msg.id;
        $('start').disabled=true;status('micStatus','Requesting microphone permission…');
        mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
        $('stopMic').disabled=false;
        status('micStatus','Microphone is ON. The browser microphone indicator should be visible.','ok');
        try{
          audioContext=new (window.AudioContext||window.webkitAudioContext)();
          const source=audioContext.createMediaStreamSource(mic);analyser=audioContext.createAnalyser();analyser.fftSize=256;source.connect(analyser);meter();
        }catch{ /* Microphone transmission still works without the visual meter. */ }
        pc=new RTCPeerConnection(stun);
        pc.ondatachannel=(event)=>{
          if(event.channel.label!=='reading-progress')return;
          channel=event.channel;
          channel.onopen=()=>{status('progressStatus','Connected. Sentence position can now be sent.','ok');sendProgress();};
          channel.onmessage=event=>{
            try{const m=JSON.parse(event.data);if(m.type==='monitor')status('connectionStatus',m.active?'🎧 Teacher listening now.':'Connected. Teacher audio is muted.',m.active?'ok':'normal');}catch{}
          };
        };
        pc.onconnectionstatechange=()=>{
          if(pc?.connectionState==='connected')status('connectionStatus','WebRTC connected. Speak aloud so the teacher can hear you.','ok');
          if(pc?.connectionState==='failed')status('connectionStatus','Peer connection failed. Try the same Wi-Fi; some networks need a TURN relay.','error');
          if(pc?.connectionState==='disconnected')status('connectionStatus','Network disconnected. The teacher may temporarily lose audio.','warn');
        };
        await pc.setRemoteDescription(new RTCSessionDescription(msg.description));
        for(const track of mic.getTracks())pc.addTrack(track,mic);
        await pc.setLocalDescription(await pc.createAnswer());
        status('connectionStatus','Gathering connection details…');
        await waitForIce(pc);
        $('answerOut').value=encode({v:1,kind:'answer',id:sharedId,description:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}});
        $('copyAnswer').disabled=false;$('shareAnswer').disabled=false;
        status('connectionStatus','Response ready. Send it to the teacher to finish pairing.','ok');
      }catch(err){
        const msg=exceptionText(err);
        stop();status('micStatus',msg,'error');
      }
    }
    $('start').addEventListener('click',start);
    $('stopMic').addEventListener('click',stop);
    $('copyAnswer').addEventListener('click',()=>copyText($('answerOut').value,'connectionStatus'));
    $('shareAnswer').addEventListener('click',()=>shareText($('answerOut').value,'NINJA MOONS reader response','connectionStatus'));
    $('prevSentence').addEventListener('click',()=>{index=Math.max(0,index-1);showSentence();});
    $('nextSentence').addEventListener('click',()=>{index=(index+1)%sampleLines.length;showSentence();});
    $('sendSentence').addEventListener('click',sendProgress);
    window.addEventListener('pagehide',stop);
  }
  if(role==='teacher')initTeacher(); else initStudent();
})();