
'use strict';

const KEY='wow3_island_reference_v8';const $=id=>document.getElementById(id);const localDay=()=>{let d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};function weekId(){let d=new Date(),wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd);return [d.getFullYear(),d.getMonth()+1,d.getDate()].join('-')};let state={};function load(){try{state=JSON.parse(localStorage.getItem(KEY))||{}}catch{state={}};state.usage??={};state.swipe??={};state.puzzles??={};state.awarded??={};state.stats??={total:0,correct:0};state.gameStats??={};state.wordStats??={}}function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){console.warn('Kaydetme başarısız',e)}}load();const LIMIT=1200;let screen='home',gameType='',q=null,roundCorrect=0,roundTotal=0,answerLocked=false,swShown=0,swInterval=null,gameTick=performance.now();let tabOwner=true;const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('wow3_game_clock'):null;let tabId=Math.random().toString(36).slice(2);if(channel){channel.onmessage=e=>{if(e.data?.type==='playing'&&e.data.id!==tabId&&screen==='game'){tabOwner=false;openScreen('home');alert('Oyun başka bir sekmede açık. Bu sekmedeki oyun durduruldu.')}}}
function usage(){return state.usage[localDay()]||0}function remaining(){return Math.max(0,LIMIT-usage())}function pieces(){return state.puzzles[weekId()]||[]}function timeFmt(n){n=Math.ceil(n);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}function topUI(){let t=timeFmt(remaining());$('clockL').textContent=t;$('clockP').textContent='⏱ '+t;$('gameTime').textContent='🎮 '+t;$('piecesP').textContent='🧩 '+pieces().length+'/6';}function openScreen(id){if(typeof stopGameTimers==='function'&&screen==='game'&&id!=='game')stopGameTimers();screen=id;document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===id));$('home').classList.toggle('hidden',id!=='home');if(id==='swipe')renderSwipe(true);if(id==='progress')renderProgress();if(id==='book')renderBook();topUI();if(id!=='swipe'){clearInterval(swInterval);if('speechSynthesis'in window)speechSynthesis.cancel()}}
function swState(){let d=localDay();return state.swipe[d]??(state.swipe[d]={round:0,index:0})}function renderSwipe(fresh){let s=swState(),w=WORDS[s.index%WORDS.length];$('swEmoji').textContent=w[2];$('swWord').textContent=w[0];$('swTr').textContent=w[1];$('swCount').textContent=`Tur ${Math.min(s.round+1,2)}/2 • ${s.index+1}/${WORDS.length}`;$('swBar').style.width=(s.index/WORDS.length*100)+'%';if(fresh){swShown=Date.now();speak();clearInterval(swInterval);swInterval=setInterval(()=>{if(screen!=='swipe'){clearInterval(swInterval);return}let left=Math.max(0,3000-(Date.now()-swShown));$('swWait').textContent=left?'⏳ '+Math.ceil(left/1000)+' saniye incele':'🎤 Şimdi sen de söyle; kartı yukarı kaydırabilirsin.';$('swNext').disabled=left>0},150)}}function speak(){let s=swState(),w=WORDS[s.index%WORDS.length];say(w[0])}function say(word){if(!('speechSynthesis'in window))return;try{speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(word);u.lang='en-US';u.rate=.84;speechSynthesis.speak(u)}catch(e){console.warn(e)}}function nextSwipe(){if(Date.now()-swShown<3000)return;let s=swState();s.index++;if(s.index>=WORDS.length){s.index=0;s.round++;if(s.round===2)alert('🎉 İki Swipe turu tamamlandı! Oyunlar açıldı.')}save();renderSwipe(true)}let touchStart=null;$('swCard').addEventListener('touchstart',e=>touchStart=e.touches[0].clientY,{passive:true});$('swCard').addEventListener('touchend',e=>{if(touchStart!==null&&touchStart-e.changedTouches[0].clientY>55)nextSwipe();touchStart=null},{passive:true});
// V13: kısa, özgün başarı sesleri; ses yalnızca kullanıcı etkileşiminden sonra çalınır.
let wowAudio=null;
function playWowSound(kind='correct'){
 try{
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  wowAudio??=new C();if(wowAudio.state==='suspended')wowAudio.resume().catch(()=>{});
  const now=wowAudio.currentTime;
  const notes=kind==='puzzle'?[523.25,659.25,783.99,1046.5]:kind==='round'?[523.25,659.25,783.99]:[659.25,880];
  notes.forEach((hz,i)=>{let osc=wowAudio.createOscillator(),gain=wowAudio.createGain();osc.type='sine';osc.frequency.setValueAtTime(hz,now+i*.115);gain.gain.setValueAtTime(.0001,now+i*.115);gain.gain.exponentialRampToValueAtTime(.075,now+i*.115+.018);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.115+.19);osc.connect(gain).connect(wowAudio.destination);osc.start(now+i*.115);osc.stop(now+i*.115+.2)});
 }catch(e){console.warn('Ses çalınamadı:',e)}
}
function recordWord(game,word,ok){
 if(!game||!word)return;
 const key=String(word[0]);const byGame=state.wordStats[game]??={};const w=byGame[key]??={total:0,correct:0};w.total++;if(ok)w.correct++;
}
function showPieceCelebration(){
 const old=document.getElementById('wowPieceCelebration');if(old)old.remove();
 const layer=document.createElement('div');layer.id='wowPieceCelebration';layer.className='wow-celebrate';layer.setAttribute('role','dialog');layer.setAttribute('aria-label','Puzzle parçası kazanıldı');
 const image=document.createElement('div');image.className='wow-celebrate-image';
 const title=document.createElement('h2');title.textContent='🎉 Yeni ada parçanı kazandın!';
 const text=document.createElement('p');text.textContent=`${studentName()||'Harika'}! Haftalık manzaranın ${pieces().length}. parçası açıldı.`;
 const actions=document.createElement('div');actions.className='wow-celebrate-actions';
 const view=document.createElement('button');view.className='btn';view.textContent='🧩 Puzzle’ımı gör';view.onclick=()=>{layer.remove();openScreen('progress')};
 const close=document.createElement('button');close.className='btn alt';close.textContent='Oyuna dön';close.onclick=()=>layer.remove();
 actions.append(view,close);layer.append(image,title,text,actions);
 for(let i=0;i<15;i++){const sp=document.createElement('span');sp.className='wow-spark';sp.textContent=['⭐','✨','🌟','🎊'][i%4];sp.style.setProperty('--x',`${(i*37)%95}%`);sp.style.setProperty('--delay',`${(i%5)*.13}s`);layer.append(sp)}
 document.body.append(layer);playWowSound('puzzle');
}
function rand(a){return a[Math.floor(Math.random()*a.length)]}
function shuffle(a){let b=[...a];for(let i=b.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
let gameRunning=false,gameEpoch=0,gameTimers=[],gameData={},matchFirst=null;
function later(fn,ms){const epoch=gameEpoch;const id=setTimeout(()=>{if(epoch===gameEpoch&&screen==='game')fn()},ms);gameTimers.push(id);return id}
function stopGameTimers(){gameEpoch++;for(const id of gameTimers)clearTimeout(id);gameTimers=[];gameRunning=false}
function startGame(type){
 if(remaining()<=0)return alert('Bugünkü 20 dakikalık oyun süresi doldu. Swipe ve Kelime Kitabı açık.');
 // V8 test modu: Swipe zorunluluğu geçici olarak devre dışı.
 stopGameTimers();gameType=type;roundCorrect=0;roundTotal=0;answerLocked=false;tabOwner=true;gameData={};
 openScreen('game');gameRunning=true;
 $('gameTitle').textContent={match:'🔗 Çizgi Eşleştirme',quiz:'🖼️ Görsel Mini Quiz',anagram:'🔤 Harf Atölyesi',mole:'🐹 Köstebek Avı'}[type];
 if(channel)channel.postMessage({type:'playing',id:tabId});gameTick=performance.now();
 if(type==='match')startMatchBoard();else nextQuestion();
}
function updateScore(){ $('gameStats').textContent=`${Math.min(roundTotal+1,10)}/10 • ${roundCorrect} doğru`; }
function gameResult(){
 stopGameTimers();roundTotal=10;const pct=roundCorrect/10;(state.gameStats[gameType]??={total:0,correct:0,rounds:0}).rounds++;save();let awarded=pct>=.8?awardPiece():false;
 $('gameEmoji').textContent=pct>=.8?'🎉':'💪';$('question').textContent=`${roundCorrect}/10 doğru — %${Math.round(pct*100)}`;
 $('hint').textContent=pct>=.8?(awarded?'Yeni puzzle parçan açıldı!':'Harika! Bugünkü puzzle parçan zaten kazanılmış.'):'Hedef %80. Yeniden deneyebilirsin.';
 $('choices').innerHTML='';$('feedback').textContent='';$('gameStats').textContent='Tur tamamlandı';
 if(!awarded&&pct>=.8)playWowSound('round');
 if(awarded)showPieceCelebration();
 makeButton($('choices'),'🔁 Yeniden oyna',()=>startGame(gameType),'choice');
 makeButton($('choices'),'🧩 Puzzle’ı gör',()=>openScreen('progress'),'choice');
}
function makeButton(parent,label,fn,cls='choice'){let b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=fn;parent.append(b);return b}
function recordAttempt(ok){
 if(!gameRunning)return;roundTotal++;state.stats.total++;if(ok){roundCorrect++;state.stats.correct++;playWowSound('correct')}
 const gs=state.gameStats[gameType]??={total:0,correct:0,rounds:0};gs.total++;if(ok)gs.correct++;
 recordWord(gameType,gameType==='match'?gameData.words?.[gameData.currentPair]:q,ok);save();
}
function nextQuestion(){
 if(screen!=='game'||!gameRunning)return;
 if(remaining()<=0){openScreen('home');alert('Oyun süren doldu.');return}
 if(roundTotal>=10){gameResult();return}
 answerLocked=false;updateScore();$('feedback').textContent='';$('choices').innerHTML='';
 if(gameType==='quiz')drawQuiz();else if(gameType==='anagram')drawAnagram();else if(gameType==='mole')drawMole();
}
// MATCH V9: connect visible English and Turkish words by selecting endpoints.
// Two sets of five pairs = ten assessed pairs; an incorrect first try marks that pair.
function startMatchBoard(){
 if(roundTotal>=10){gameResult();return}
 const words=shuffle(WORDS).slice(0,5);
 gameData={words,left:shuffle(words.map((w,i)=>({pair:i,text:w[0]}))),right:shuffle(words.map((w,i)=>({pair:i,text:w[1]}))),matched:new Set(),mistakes:new Set(),selected:null,board:Math.floor(roundTotal/5)};
 $('hint').textContent='Soldaki İngilizce kelimeye, sonra sağdaki Türkçe anlamına dokun. Doğru çiftler çizgiyle birleşir.';
 $('gameEmoji').textContent='🔗';$('question').textContent=`${gameData.board+1}. bölüm • 5 kelime çifti`;
 $('choices').innerHTML='';$('choices').className='choices connect-area';updateScore();
 const board=document.createElement('div');board.className='connect-board';board.id='connectBoard';$('choices').append(board);
 const left=document.createElement('div');left.className='connect-column';left.id='connectLeft';
 const right=document.createElement('div');right.className='connect-column';right.id='connectRight';
 const lines=document.createElementNS('http://www.w3.org/2000/svg','svg');lines.setAttribute('class','connect-lines');lines.id='connectLines';lines.setAttribute('aria-hidden','true');
 board.append(left,lines,right);
 gameData.left.forEach((w,i)=>{let btn=makeButton(left,w.text,()=>selectMatch('left',i),'connect-word');btn.dataset.pair=w.pair});
 gameData.right.forEach((w,i)=>{let btn=makeButton(right,w.text,()=>selectMatch('right',i),'connect-word');btn.dataset.pair=w.pair});
 requestAnimationFrame(drawMatchLines);
}
function selectMatch(side,index){
 const d=gameData;if(!gameRunning||gameType!=='match')return;
 const item=d[side][index];if(d.matched.has(item.pair))return;
 const el=(side==='left'?$('connectLeft'):$('connectRight')).children[index];
 if(!d.selected){if(side!=='left'){$('feedback').textContent='Önce soldan bir İngilizce kelime seç.';return}d.selected={side,index,pair:item.pair};el.classList.add('selected');$('feedback').textContent='Şimdi sağdaki Türkçe anlamını seç.';return}
 if(side==='left'){
  $('connectLeft').children[d.selected.index].classList.remove('selected');d.selected={side,index,pair:item.pair};el.classList.add('selected');return;
 }
 const selected=d.selected;d.selected=null;$('connectLeft').children[selected.index].classList.remove('selected');
 if(item.pair!==selected.pair){d.mistakes.add(selected.pair);$('feedback').textContent='💡 Eşleşmedi. Tekrar deneyebilirsin.';el.classList.add('wrong');later(()=>el.classList.remove('wrong'),500);return}
 d.matched.add(item.pair);const ok=!d.mistakes.has(item.pair);gameData.currentPair=item.pair;recordAttempt(ok);
 $('connectLeft').children[selected.index].classList.add('matched');el.classList.add('matched');
 $('feedback').textContent=ok?'🌟 Harika! Doğru çizgiyi buldun.':'👍 Doğru çifti buldun!';drawMatchLines();
 if(d.matched.size===5)later(()=>{if(roundTotal>=10)gameResult();else startMatchBoard()},850);
 else updateScore();
}
function drawMatchLines(){
 const svg=$('connectLines'),board=$('connectBoard'),d=gameData;if(!svg||!board||!d.left)return;
 svg.replaceChildren();const rect=board.getBoundingClientRect();if(!rect.width)return;
 svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
 for(const pair of d.matched){
  const li=d.left.findIndex(w=>w.pair===pair),ri=d.right.findIndex(w=>w.pair===pair);
  const l=$('connectLeft').children[li].getBoundingClientRect(),r=$('connectRight').children[ri].getBoundingClientRect();
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  const x1=l.right-rect.left,y1=l.top+l.height/2-rect.top,x2=r.left-rect.left,y2=r.top+r.height/2-rect.top;
  path.setAttribute('d',`M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}`);
  path.setAttribute('stroke','#19a766');path.setAttribute('stroke-width','5');path.setAttribute('stroke-linecap','round');path.setAttribute('fill','none');svg.append(path);
 }
}
window.addEventListener('resize',()=>{if(screen==='game'&&gameType==='match')drawMatchLines()});
// QUIZ: picture/emoji stimulus, four English word choices.
function drawQuiz(){
 q=rand(WORDS);$('choices').className='choices';$('gameEmoji').textContent=q[2];$('question').textContent='Bu kelimenin İngilizcesi hangisi?';$('gameEmoji').textContent=q[2]+' '+q[1];
 $('hint').textContent='Türkçe ipucunu incele ve doğru İngilizce karşılığı seç.';
 let options=shuffle([q,...shuffle(WORDS.filter(w=>w!==q)).slice(0,3)]);
 options.forEach(w=>makeButton($('choices'),w[0],()=>{
 if(answerLocked)return;answerLocked=true;let ok=w===q;recordAttempt(ok);
 $('feedback').textContent=ok?'🌟 Harika!':'Doğru kelime: '+q[0];
 for(const b of $('choices').children)b.disabled=true;
 later(nextQuestion,850)
 }));
}
// ANAGRAM: independently assemble letters by tapping tiles, then submit.
function drawAnagram(){
 q=rand(WORDS.filter(w=>w[0].replace(/\s/g,'').length<=12));gameData={letters:shuffle(q[0].replace(/\s/g,'').toUpperCase().split('').map((ch,i)=>({ch,id:i}))),picked:[]};
 $('choices').className='choices anagram-area';$('gameEmoji').textContent=q[2];$('question').textContent=q[1];
 $('hint').textContent='Türkçe anlamı verilen kelimeyi harf kutularına dokunarak oluştur.';
 let output=document.createElement('div');output.className='letter-output';output.id='letterOutput';$('choices').append(output);
 let tray=document.createElement('div');tray.className='letter-tray';tray.id='letterTray';$('choices').append(tray);
 let controls=document.createElement('div');controls.className='letter-controls';$('choices').append(controls);
 makeButton(controls,'↩ Son harfi sil',()=>{gameData.picked.pop();renderLetters()},'btn alt');
 makeButton(controls,'✔ Kontrol et',()=>{
 if(answerLocked||gameData.picked.length!==gameData.letters.length)return;
 answerLocked=true;let guess=gameData.picked.map(id=>gameData.letters.find(x=>x.id===id).ch).join('');
 let ok=guess===q[0].replace(/\s/g,'').toUpperCase();recordAttempt(ok);$('feedback').textContent=ok?'🌟 Kelimeyi kurdun!':'Doğrusu: '+q[0].toUpperCase();
 later(nextQuestion,1100);
 },'btn');renderLetters();
}
function renderLetters(){
 let d=gameData,out=$('letterOutput'),tray=$('letterTray');out.textContent=d.picked.map(id=>d.letters.find(x=>x.id===id).ch).join(' ')||'_ '.repeat(d.letters.length);
 tray.innerHTML='';d.letters.forEach(item=>{let used=d.picked.includes(item.id);let b=makeButton(tray,item.ch,()=>{if(answerLocked||used)return;d.picked.push(item.id);renderLetters()},'letter-tile');b.disabled=used});
}
// MOLE V9: gentler pace, 2.2 seconds visible, 15 seconds total.
function drawMole(){
 q=rand(WORDS);gameData={target:Math.floor(Math.random()*9),roundStarted:performance.now(),resolved:false,turn:0};
 $('choices').className='choices mole-grid';$('gameEmoji').textContent='🐹';$('question').textContent=`${q[1]} kelimesini yakala!`;
 $('hint').textContent='Köstebekler 2,2 saniye görünür. Doğru İngilizce kelimeyi 15 saniye içinde yakala.';
 const wrong=shuffle(WORDS.filter(w=>w!==q)).slice(0,5);
 const holes=Array.from({length:9},(_,i)=>makeButton($('choices'),'🕳️',()=>hitMole(i),'mole-hole'));
 function move(){if(!gameRunning||gameType!=='mole'||gameData.resolved)return;
  const now=performance.now();if(now-gameData.roundStarted>=15000){finishMole(false,'⏳ Süre doldu! Doğrusu: '+q[0]);return}
  const pos=gameData.target;
  holes.forEach(h=>{h.textContent='🕳️';h.classList.remove('up');h.dataset.word=''});
  const turn=gameData.turn++;const choice=turn%2===0?q:wrong[Math.floor(turn/2)%wrong.length];
  holes[pos].textContent='🐹 '+choice[0];holes[pos].classList.add('up');holes[pos].dataset.word=choice[0];
  gameData.target=(pos+1+Math.floor(Math.random()*8))%9;
  later(move,2200);
 }
 gameData.holes=holes;gameData.correctWord=q[0];move();
}
function hitMole(i){
 if(!gameRunning||gameData.resolved)return;
 let hole=gameData.holes[i];if(!hole.classList.contains('up'))return;
 let ok=hole.dataset.word===gameData.correctWord;
 finishMole(ok,ok?'🌟 Doğru köstebeği yakaladın!':'💡 Doğru kelime: '+gameData.correctWord);
}
function finishMole(ok,msg){if(gameData.resolved)return;gameData.resolved=true;recordAttempt(ok);$('feedback').textContent=msg;for(let b of gameData.holes)b.disabled=true;later(nextQuestion,750)}
function awardPiece(){let day=new Date().getDay(),arr=pieces(),week=weekId();if(arr.length>=6)return false;let slot;if(day===0){slot=[0,1,2,3,4,5].find(x=>!arr.includes(x));if(slot===undefined)return false}else{slot=day-1;if(arr.includes(slot))return false}arr.push(slot);state.puzzles[week]=arr;save();topUI();return true}
function renderProgress(){ $('puzzleOwner').textContent=(studentName()||'Öğrenci')+' adlı öğrencinin';let a=pieces(),pct=state.stats.total?Math.round(state.stats.correct/state.stats.total*100):0;$('progressText').textContent=`Bu hafta ${a.length}/6 parça • Toplam ${state.stats.total} cevap • %${pct} doğru • Bugün ${timeFmt(usage())} oyun oynandı.`;$('puzzle').innerHTML='';for(let i=0;i<6;i++){let el=document.createElement('div');el.className='piece'+(a.includes(i)?' earned':' locked');el.style.backgroundPosition=`${(i%3)*50}% ${Math.floor(i/3)*100}%`;$('puzzle').append(el)}renderGameWordStats();$('puzzleText').textContent=a.length===6?'🎉 Ada manzaran tamamlandı! Öğretmenine gönderebilirsin.':`🌴 ${a.length} parça açıldı. Kazandığın parçalar hemen görünür.`;$('exportBtn').disabled=a.length!==6}
function renderGameWordStats(){
 const root=$('gameWordStats');if(!root)return;root.replaceChildren();
 const labels={match:'🔗 Eşleştirme',quiz:'🖼️ Mini Quiz',anagram:'🔤 Anagram',mole:'🐹 Köstebek'};
 for(const [game,label] of Object.entries(labels)){
  const gs=state.gameStats[game]||{total:0,correct:0,rounds:0};
  const section=document.createElement('details');section.className='word-stat-game';
  const summary=document.createElement('summary');summary.textContent=`${label} — ${gs.correct}/${gs.total} doğru • ${gs.rounds} tur`;section.append(summary);
  const table=document.createElement('table');table.className='word-stat-table';
  const head=document.createElement('tr');for(const v of ['Kelime','Doğru','Deneme','Başarı']){let th=document.createElement('th');th.textContent=v;head.append(th)}table.append(head);
  const entries=Object.entries(state.wordStats[game]||{}).sort((a,b)=>a[0].localeCompare(b[0],'en'));
  for(const [word,stat] of entries){let tr=document.createElement('tr');for(const v of [word,stat.correct,stat.total,Math.round(stat.correct/stat.total*100)+'%']){let td=document.createElement('td');td.textContent=v;tr.append(td)}table.append(tr)}
  if(!entries.length){let p=document.createElement('p');p.textContent='Bu oyunda henüz kelime değerlendirmesi yok.';section.append(p)}else section.append(table);
  root.append(section);
 }
}
function exportPuzzle(){if(pieces().length!==6)return;let img=new Image();img.onload=()=>{let c=document.createElement('canvas');c.width=1200;c.height=800;let x=c.getContext('2d');x.drawImage(img,0,0,1200,800);x.fillStyle='#fff9';x.fillRect(0,0,1200,80);x.fillStyle='#145c65';x.font='bold 38px sans-serif';x.textAlign='center';x.fillText((studentName()||'Öğrenci')+' • MySchool WOW 3 • Ada Tamamlandı!',600,52);x.fillStyle='#fff9';x.fillRect(0,748,1200,52);x.fillStyle='#145c65';x.font='26px sans-serif';x.fillText('Hafta: '+weekId(),600,783);let a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='WOW3_ada_'+weekId()+'.png';a.click()};img.src='assets/images/ada-manzarasi.webp'}function testPiece(){let a=pieces();if(a.length<6){a.push([0,1,2,3,4,5].find(i=>!a.includes(i)));state.puzzles[weekId()]=a;save()}renderProgress();topUI()}function resetDemo(){if(confirm('Bu prototipin bütün kayıtları silinsin mi?')){localStorage.removeItem(KEY);load();renderProgress();topUI()}}function renderBook(){$('bookGrid').innerHTML='';WORDS.forEach(w=>{let d=document.createElement('div');d.className='bookitem';let b=document.createElement('button');b.textContent='🔊 '+w[0];b.onclick=()=>say(w[0]);d.append(b);let t=document.createElement('div');t.textContent=w[2]+' '+w[1];d.append(t);$('bookGrid').append(d)})}
// Active game seconds only, while the tab is visible. Count monotonic elapsed time; clamp long pauses.
setInterval(()=>{let now=performance.now(),elapsed=Math.max(0,Math.min(1.5,(now-gameTick)/1000));gameTick=now;if(screen==='game'&&gameRunning&&!document.hidden&&tabOwner&&remaining()>0){state.usage[localDay()]=(state.usage[localDay()]||0)+elapsed;save();if(remaining()<=0){openScreen('home');alert('Bugünkü 20 dakika tamamlandı!')}}topUI()},1000);document.addEventListener('visibilitychange',()=>{gameTick=performance.now()});window.addEventListener('pagehide',save);topUI();

// V10 maskot tercihi: mevcut oyun/ilerleme kaydıyla aynı localStorage nesnesinde.
const WOW_STUDENT_KEY='wow3_student_name_locked_v1';
const WOW_AVATARS=['🦉','🐼','🦊','🐱','🐰','🐸','🐻','🦁'];
function renderAvatar(){
 const selected=WOW_AVATARS.includes(state.avatar)?state.avatar:'🦉';
 $('avatarWide').textContent=selected;$('avatarPortrait').textContent=selected;
 document.querySelectorAll('.student-name').forEach(el=>el.textContent=studentName()||'Öğrenci');$('settingsStudentName').textContent=studentName()||'—';$('gradeWide').textContent='3. Sınıf';$('gradePortrait').textContent='3. Sınıf';
 const container=$('avatarChoices');container.replaceChildren();
 WOW_AVATARS.forEach((a,i)=>{const b=document.createElement('button');b.className='avatar-option'+(selected===a?' selected':'');b.type='button';b.textContent=a;b.setAttribute('aria-label','Maskot '+(i+1));b.setAttribute('aria-pressed',String(selected===a));b.onclick=()=>{state.avatar=a;save();renderAvatar()};container.append(b)})
}
renderAvatar();

// V11: isim ayrı anahtarda tutulur; demo ilerleme sıfırlama ismi değiştirmez.
function studentName(){try{return localStorage.getItem(WOW_STUDENT_KEY)||''}catch{return ''}}
function ensureStudentName(){
 const modal=$('studentWelcome');if(studentName()){modal.hidden=true;return}
 modal.hidden=false;const input=$('studentNameInput');input.focus();
}
$('studentForm').addEventListener('submit',e=>{
 e.preventDefault();if(studentName()){$('studentWelcome').hidden=true;return}
 const value=$('studentNameInput').value.trim().replace(/\s+/g,' ');
 if(value.length<2){$('welcomeError').textContent='Lütfen en az iki karakter gir.';return}
 try{localStorage.setItem(WOW_STUDENT_KEY,value)}catch{$('welcomeError').textContent='Bu tarayıcıda kayıt yapılamıyor. Gizli modu kapatıp tekrar dene.';return}
 $('studentWelcome').hidden=true;renderAvatar();renderProgress();
});
ensureStudentName();renderAvatar();
