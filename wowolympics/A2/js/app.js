'use strict';
const WORDS=window.WOO_WORDS||[],TOTAL=WORDS.length,KEY='myschool_woo_a2_v1';
const $=id=>document.getElementById(id),today=()=>new Date().toLocaleDateString('en-CA');
const makeState=()=>({started:today(),words:{},history:[],session:0,reviewRound:0,learnIndex:0,learnOrder:[]});
let state;try{state=JSON.parse(localStorage.getItem(KEY))||makeState()}catch{state=makeState()}
state.words??={};state.history??=[];state.session??=0;state.reviewRound??=0;state.learnIndex??=0;state.started??=today();if(!Array.isArray(state.learnOrder)||state.learnOrder.length!==TOTAL){state.learnOrder=randomize(WORDS.map(w=>w.id));state.learnIndex=0;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){console.warn('Yerel kayıt yapılamadı',e)}}
function record(w){return state.words[w.id]??(state.words[w.id]={seen:false,known:false,streak:0,lastCorrectSession:0,reviewNeeded:false,reviewCorrect:0,lastReviewRound:0})}
function randomize(a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function sample(a,n){return randomize(a).slice(0,n)}
function say(en){
 if(!('speechSynthesis' in window)){
  const feedback=document.getElementById('speechStatus');if(feedback)feedback.textContent='Bu tarayıcı sesli okumayı desteklemiyor.';
  return;
 }
 try{
  const synth=window.speechSynthesis;synth.cancel();
  const u=new SpeechSynthesisUtterance(en);u.lang='en-US';u.rate=.84;u.pitch=1;u.volume=1;
  u.onerror=()=>{const feedback=document.getElementById('speechStatus');if(feedback)feedback.textContent='Ses oynatılamadı. Cihazdaki İngilizce TTS sesini ve ses düzeyini kontrol edin.'};
  synth.speak(u);
  if(synth.paused)synth.resume();
 }catch(e){console.warn('Telaffuz başlatılamadı',e)}
}
let audioContext=null;
function successSound(){try{const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;audioContext??=new AudioCtx();if(audioContext.state==='suspended')audioContext.resume();const now=audioContext.currentTime;[659.25,783.99,1046.5].forEach((freq,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,now+i*.095);gain.gain.exponentialRampToValueAtTime(.085,now+i*.095+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.095+.19);osc.connect(gain);gain.connect(audioContext.destination);osc.start(now+i*.095);osc.stop(now+i*.095+.2)})}catch(e){console.warn('Başarı sesi çalınamadı',e)}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function seen(w){const r=record(w);if(!r.seen){r.seen=true;save()}}
function result(w,correct,review=false){const r=record(w);if(review){if(correct){if(r.lastReviewRound!==state.reviewRound){r.reviewCorrect++;r.lastReviewRound=state.reviewRound}if(r.reviewCorrect>=3){r.reviewNeeded=false;r.reviewCorrect=0;r.known=true;r.streak=3}}else{r.reviewCorrect=0;r.lastReviewRound=0;r.reviewNeeded=true;r.known=false;r.streak=0}}else if(correct){if(r.lastCorrectSession!==state.session){r.streak=Math.min(3,r.streak+1);r.lastCorrectSession=state.session;if(r.streak===3&&!r.reviewNeeded)r.known=true}}else{r.streak=0;r.known=false;r.reviewNeeded=true;r.reviewCorrect=0;r.lastReviewRound=0}save()}
function categories(){const n=[],c=[],k=[];for(const w of WORDS){const r=record(w);if(!r.seen)n.push(w);else if(r.known)k.push(w);else c.push(w)}return {n,c,k}}
function pickSession(count){const {n,c,k}=categories();const elapsed=Math.max(0,Math.floor((Date.now()-new Date(state.started+'T00:00:00').getTime())/86400000));const daysLeft=Math.max(1,30-elapsed);const seenTotal=TOTAL-n.length;const due=Math.max(Math.ceil(TOTAL/30),Math.ceil(TOTAL*Math.min(30,elapsed+1)/30-seenTotal),Math.ceil(n.length/daysLeft));let targets=[Math.round(count*.6),Math.round(count*.3)];targets.push(count-targets[0]-targets[1]);if(n.length&&due>targets[0])targets[0]=Math.min(count,due);const groups=[n,c,k];let chosen=[];for(let i=0;i<3;i++){const need=Math.max(0,Math.min(targets[i],count-chosen.length));const available=groups[i].filter(w=>!chosen.includes(w));chosen.push(...sample(available,need))}const rest=WORDS.filter(w=>!chosen.includes(w));const unseenRest=rest.filter(w=>!record(w).seen);chosen.push(...sample(unseenRest,Math.min(count-chosen.length,unseenRest.length)));chosen.push(...sample(rest.filter(w=>!chosen.includes(w)),count-chosen.length));const recent=new Set(state.history.slice(-10));let ordered=randomize(chosen);for(let i=0;i<Math.min(10,ordered.length);i++){if(recent.has(ordered[i].id)){const j=ordered.findIndex((w,index)=>index>i&&!recent.has(w.id));if(j>=0)[ordered[i],ordered[j]]=[ordered[j],ordered[i]]}}return ordered}
function rememberQuestion(w){seen(w);state.history.push(w.id);if(state.history.length>30)state.history=state.history.slice(-30);save()}
let currentScreen='home',game=null,locked=false,timer=null,learnShown=0,moleToken=0;
function stopTimer(){moleToken++;if(timer!==null){clearTimeout(timer);timer=null}}
function openScreen(name){stopTimer();game=null;currentScreen=name;document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===name));if(name==='learn')renderLearn();if(name==='book')renderBook();if(name==='progress')renderProgress();if(name==='review')renderReview();if(name==='profile')$('profileTotal').textContent=TOTAL;window.scrollTo(0,0)}
function currentLearnWord(){return WORDS.find(w=>w.id===state.learnOrder[state.learnIndex])||WORDS[0]}
function renderLearn(){const w=currentLearnWord();if(!w)return;$('learnEn').textContent=w.en;$('learnTr').textContent=w.tr;const speechStatus=$('speechStatus');if(speechStatus)speechStatus.textContent='';learnShown=Date.now();$('nextLearn').disabled=true;setTimeout(()=>{if(currentScreen==='learn')$('nextLearn').disabled=false},3000);say(w.en)}
$('nextLearn').onclick=()=>{if(Date.now()-learnShown<3000)return;state.learnIndex++;if(state.learnIndex>=TOTAL){const last=state.learnOrder[TOTAL-1];state.learnOrder=randomize(WORDS.map(w=>w.id));if(TOTAL>1&&state.learnOrder[0]===last)[state.learnOrder[0],state.learnOrder[1]]=[state.learnOrder[1],state.learnOrder[0]];state.learnIndex=0}save();renderLearn()};$('listen').onclick=()=>say(currentLearnWord().en);
function renderBook(){const search=$('bookSearch').value.toLocaleLowerCase('tr');const list=WORDS.filter(w=>(w.en+' '+w.tr).toLocaleLowerCase('tr').includes(search));$('bookList').innerHTML=list.map(w=>`<div class="bookentry"><div><strong>${esc(w.en)}</strong><small>${esc(w.tr)}</small></div><button data-say="${esc(w.id)}" aria-label="Dinle">🔊</button></div>`).join('')}
$('bookSearch').oninput=renderBook;$('bookList').onclick=e=>{const b=e.target.closest('[data-say]');if(b){const w=WORDS.find(x=>x.id===b.dataset.say);if(w)say(w.en)}};
function renderProgress(){const seenCount=WORDS.filter(w=>record(w).seen).length,known=WORDS.filter(w=>record(w).known).length;$('seenCount').textContent=`${seenCount} / ${TOTAL}`;$('knownCount').textContent=`${known} / ${TOTAL}`;$('seenBar').style.width=(100*seenCount/TOTAL)+'%';$('knownBar').style.width=(100*known/TOTAL)+'%';const day=Math.max(1,Math.floor((Date.now()-new Date(state.started+'T00:00:00').getTime())/86400000)+1);$('coverageNote').textContent=`${day}. gün · Henüz sorulmamış ${TOTAL-seenCount} kelime. 30 günlük kapsama hedefi, yeterli oyun oynanmasına bağlıdır.`}
function renderReview(){const list=WORDS.filter(w=>record(w).reviewNeeded);$('reviewSummary').textContent=`Tekrar bekleyen kelime: ${list.length}`;$('startReview').disabled=!list.length;$('reviewList').innerHTML=list.slice(0,100).map(w=>`<div class="reviewitem"><b>${esc(w.en)}</b> — ${esc(w.tr)} <small>(${record(w).reviewCorrect}/3 tur)</small></div>`).join('')+(list.length>100?`<p>Ve ${list.length-100} kelime daha...</p>`:'')}
const gameNames={quiz:'WOW Quiz',match:'Eşleştir & Kazan',anagram:'Anagram',mole:'Köstebeği Yakala',review:'Tekrar Quizi'};
function startGame(type){stopTimer();if(type==='review'){state.reviewRound++;const words=sample(WORDS.filter(w=>record(w).reviewNeeded),20);if(!words.length){renderReview();return}game={type,words,index:0,correct:0,roundId:state.reviewRound}}else{state.session++;game={type,words:pickSession(20),index:0,correct:0}}save();locked=false;currentScreen='game';document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id==='game'));$('gameTitle').textContent=gameNames[type];nextQuestion()}
function nextQuestion(){stopTimer();if(!game)return;locked=false;$('nextQuestion').hidden=true;$('feedback').textContent='';if(game.index>=game.words.length){const done=game;$('gameContent').innerHTML=`<div class="flash"><div class="bigword">🏆 Tur tamamlandı!</div><div class="meaning">${done.correct} / ${done.words.length} doğru</div></div>`;$('gameCount').textContent='';$('nextQuestion').hidden=false;$('nextQuestion').textContent=done.type==='review'?'Yeni Tekrar Turu':'Yeni Oyun Turu';$('nextQuestion').onclick=()=>startGame(done.type);return}const w=game.words[game.index];game.index++;game.current=w;$('gameCount').textContent=`${game.index} / ${game.words.length}`;$('nextQuestion').textContent='Sonraki Soru →';$('nextQuestion').onclick=nextQuestion;if(game.type!=='review')rememberQuestion(w);else if(!record(w).seen){}if(game.type==='anagram')drawAnagram(w);else if(game.type==='mole')drawMole(w);else if(game.type==='match')drawMatch(w);else drawQuiz(w)}
function finish(correct){if(locked)return;locked=true;stopTimer();const w=game.current;result(w,correct,game.type==='review');if(correct){game.correct++;successSound();}$('feedback').textContent=correct?'✅ Harika! Doğru cevap.':`🔁 Doğru cevap: ${w.en} — ${w.tr}`;$('nextQuestion').hidden=false}
function distractors(w,count){const other=WORDS.filter(x=>x.id!==w.id&&x.tr!==w.tr);return sample(other,count)}
function drawQuiz(w){$('gameHint').textContent='Türkçe karşılığını seç.';const opts=randomize([w,...distractors(w,3)]);$('gameContent').innerHTML=`<div class="gameword">${esc(w.en)} <button class="secondary" id="speakQ" aria-label="Dinle">🔊</button></div><div class="choicegrid">${opts.map(x=>`<button class="choice" data-id="${x.id}">${esc(x.tr)}</button>`).join('')}</div>`;$('speakQ').onclick=()=>say(w.en);$('gameContent').querySelectorAll('.choice').forEach(b=>b.onclick=()=>{if(locked)return;const ok=b.dataset.id===w.id;b.classList.add(ok?'correct':'wrong');finish(ok)})}
function drawAnagram(w){
 $('gameHint').textContent='Harfleri sırayla seçerek İngilizce kelimeyi oluştur.';
 const target=w.en.toLocaleLowerCase('en').replace(/[^a-z]/g,'');
 if(target.length<2||target.length>22){drawQuiz(w);return}
 let letters=randomize(target.split('')).map((ch,i)=>({ch,i}));
 let built=[];
 $('gameContent').innerHTML=`<div class="gameword">${esc(w.tr)}</div><div class="anagram-built" id="anagramBuilt">_</div><div class="anagram-letters" id="anagramLetters"></div><div class="actions"><button id="undoAnagram" class="secondary">↩ Geri Al</button><button id="checkAnagram">Kontrol Et</button></div>`;
 const paint=()=>{$('anagramBuilt').textContent=built.map(i=>letters[i].ch).join('').toUpperCase()||'_';$('anagramLetters').innerHTML=letters.map((l,i)=>`<button class="letter" data-i="${i}" ${built.includes(i)?'disabled':''}>${esc(l.ch.toUpperCase())}</button>`).join('');$('anagramLetters').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(locked)return;built.push(Number(b.dataset.i));paint()})};
 $('undoAnagram').onclick=()=>{if(locked)return;built.pop();paint()};
 $('checkAnagram').onclick=()=>{if(locked||built.length!==letters.length){$('feedback').textContent='Önce bütün harfleri seç.';return}finish(built.map(i=>letters[i].ch).join('')===target)};
 paint();
}
function drawMatch(w){$('gameHint').textContent='İngilizce kelimeyi Türkçe karşılığıyla eşleştir.';const options=randomize([w,...distractors(w,3)]);const en=randomize(options),tr=randomize(options);let selected=null,matched=new Set(),errors=0;$('gameContent').innerHTML=`<div class="matchboard"><div class="matchcol">${en.map(x=>`<button class="matchcard" data-side="en" data-id="${x.id}">${esc(x.en)}</button>`).join('')}</div><div class="matchcol">${tr.map(x=>`<button class="matchcard" data-side="tr" data-id="${x.id}">${esc(x.tr)}</button>`).join('')}</div></div>`;const cards=[...$('gameContent').querySelectorAll('.matchcard')];cards.forEach(b=>b.onclick=()=>{if(locked||matched.has(b.dataset.id))return;if(!selected){selected=b;b.classList.add('selected');return}if(selected===b){b.classList.remove('selected');selected=null;return}if(selected.dataset.side===b.dataset.side){selected.classList.remove('selected');selected=b;b.classList.add('selected');return}const ok=selected.dataset.id===b.dataset.id;selected.classList.remove('selected');if(ok){matched.add(b.dataset.id);cards.filter(x=>x.dataset.id===b.dataset.id).forEach(x=>x.classList.add('done'));if(matched.size===options.length)finish(errors===0)}else{$('feedback').textContent='Bir daha dene!';errors++}selected=null})}
function drawMole(w,remainingOverride){
 $('gameHint').textContent='Köstebekler 2,2 saniye görünür. Doğru İngilizce kelimeyi 15 saniye içinde yakala.';
 const opts=randomize([w,...distractors(w,5)]);
 $('gameContent').innerHTML=`<div class="mole-prompt"><span class="mole-prompt-icon" aria-hidden="true">🐹</span><strong>${esc(w.tr)} kelimesini yakala!</strong></div><div class="mole-arena"><div class="molegrid">${Array.from({length:6},(_,i)=>`<button class="molehole" data-hole="${i}" aria-label="Boş köstebek deliği"><span class="mole-character" aria-hidden="true">🐹</span><span class="mole-label"></span></button>`).join('')}</div><div class="mole-status"><span id="moleTimer" role="timer">⏱️ 15.0 saniye</span><span id="moleHits">🎯 Doğru köstebeği yakala!</span></div><div class="mole-timerbar"><div id="moleTimeFill"></div></div></div>`;
 const token=++moleToken,duration=15000,visibleMs=2200;
 let remaining=Number.isFinite(remainingOverride)?Math.max(0,remainingOverride):duration;
 let lastTime=performance.now(),activeHole=-1,activeWord=null,lastHole=-1,cycleIndex=0,cycleElapsed=visibleMs;
 let order=randomize(opts);
 const holes=[...$('gameContent').querySelectorAll('.molehole')];
 const hide=()=>holes.forEach(b=>{b.classList.remove('up');b.dataset.id='';b.setAttribute('aria-label','Boş köstebek deliği')});
 function pop(){
  hide();
  if(cycleIndex>=order.length){order=randomize(opts);cycleIndex=0}
  // Correct answer is guaranteed to appear during each six-pop cycle.
  activeWord=order[cycleIndex++];
  const available=holes.map((_,i)=>i).filter(i=>i!==lastHole);
  activeHole=available[Math.floor(Math.random()*available.length)];lastHole=activeHole;
  const b=holes[activeHole];b.dataset.id=activeWord.id;b.querySelector('.mole-label').textContent=activeWord.en;
  b.setAttribute('aria-label',activeWord.en);b.classList.add('up');
 }
 holes.forEach((b,i)=>b.onclick=()=>{
  if(locked||token!==moleToken||i!==activeHole||!b.classList.contains('up'))return;
  const correct=activeWord?.id===w.id;
  b.classList.add(correct?'hit':'miss');finish(correct);
 });
 function tick(){
  if(token!==moleToken||locked||currentScreen!=='game'||!game||game.current!==w)return;
  const now=performance.now(),delta=Math.max(0,now-lastTime);lastTime=now;
  remaining=Math.max(0,remaining-delta);cycleElapsed+=delta;
  if(cycleElapsed>=visibleMs){cycleElapsed%=visibleMs;pop()}
  const display=$('moleTimer'),bar=$('moleTimeFill');
  if(display)display.textContent=`⏱️ ${(remaining/1000).toFixed(1)} saniye`;
  if(bar)bar.style.width=`${remaining/duration*100}%`;
  if(remaining<=0){finish(false);return}
  timer=setTimeout(tick,50);
 }
 // Pause/resume retains the same question, choices and progress without redrawing.
 game.molePause=()=>{
  if(token!==moleToken||locked||game.molePaused)return;
  remaining=Math.max(0,remaining-(performance.now()-lastTime));
  game.molePaused=true;if(timer!==null){clearTimeout(timer);timer=null}
  const display=$('moleTimer');if(display)display.textContent='⏸️ Duraklatıldı';
 };
 game.moleResume=()=>{
  if(token!==moleToken||locked||currentScreen!=='game'||!game.molePaused)return;
  game.molePaused=false;lastTime=performance.now();tick();
 };
 game.molePaused=false;
 pop();cycleElapsed=0;tick();
}
$('nextQuestion').onclick=nextQuestion;$('startReview').onclick=()=>startGame('review');document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openScreen(b.dataset.open));document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>startGame(b.dataset.game));document.addEventListener('visibilitychange',()=>{if(game?.type!=='mole'||locked||currentScreen!=='game')return;if(document.hidden){game.molePause?.()}else{game.moleResume?.()}});save();
