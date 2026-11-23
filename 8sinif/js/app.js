
'use strict';

const KEY='wow8_island_reference_v1';
const THEME_PREFIX='wow8_theme_v1_';const MEDAL_KEY='wow8_medals_v1';const $=id=>document.getElementById(id);
const localDay=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function dayNum(s){return Math.floor(new Date(s+'T12:00:00').getTime()/86400000)}
function monday(s){const d=new Date(s+'T12:00:00'),wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function weekId(){return monday(localDay())}
const WORDS=window.WOW_THEME_1;
const THEMES=Object.fromEntries(Array.from({length:10},(_,i)=>i+1).map(i=>[String(i),{name:["Friendship", "Teen Life", "In the Kitchen", "On the Phone", "The Internet", "Adventures", "Tourism", "Chores", "Science", "Natural Forces"][i-1],words:window['WOW_THEME_'+i]}]));
function themeAvailable(id){const n=Number(id);return n<=2||(n>=3&&n<=10&&Boolean(medals()[String(n-1)]))}

let state={},legacy={};
function load(){try{legacy=JSON.parse(localStorage.getItem(KEY))||{}}catch{legacy={}};state=legacy;state.usage??={};state.activeTheme??='1';if(!Array.from({length:10},(_,i)=>String(i+1)).includes(String(state.activeTheme)))state.activeTheme='1';state.avatar??='🦉';if(!themeAvailable(String(state.activeTheme)))state.activeTheme='1';loadTheme()}
function emptyTheme(){return {start:monday(localDay()),wordStats:{},puzzles:[[],[],[],[]],awarded:{},swipe:{},stats:{total:0,correct:0},gameStats:{},demoWeek:0}}
function themeId(){return String(state.activeTheme||'1')}
function themeName(){return `Ünite ${themeId()} · ${THEMES[themeId()]?.name||'Hazırlanıyor'}`}
function themeWords(){return THEMES[themeId()]?.words||[]}
let theme={};
function loadTheme(){try{theme=JSON.parse(localStorage.getItem(THEME_PREFIX+themeId()))||emptyTheme()}catch{theme=emptyTheme()};theme.wordStats??={};theme.puzzles??=[[],[],[],[]];theme.awarded??={};theme.swipe??={};theme.stats??={total:0,correct:0};theme.gameStats??={};theme.demoWeek??=0;
// V14 legacy records are migrated once into Tema 1; original key remains intact for rollback.
if(false&&themeId()==='1'&&!localStorage.getItem(THEME_PREFIX+'1')&&!localStorage.getItem('wow8_migrated_v1')&&legacy.wordStats){for(const data of Object.values(legacy.wordStats)){for(const [name,v] of Object.entries(data)){const idx=WORDS.findIndex(w=>w[0]===name);if(idx<0)continue;const x=theme.wordStats[idx]??={c:0,w:0,r:'',d:0};x.c+=v.correct||0;x.w+=(v.total||0)-(v.correct||0)}}}
}
function save(){try{localStorage.setItem('wow8_migrated_v1','1');localStorage.setItem(KEY,JSON.stringify({activeTheme:themeId(),avatar:state.avatar,usage:state.usage}));if(!medals()[themeId()])localStorage.setItem(THEME_PREFIX+themeId(),JSON.stringify(theme))}catch(e){console.warn('Kaydetme başarısız',e)}}
function medals(){try{return JSON.parse(localStorage.getItem(MEDAL_KEY))||{}}catch{return {}}}
function changeTheme(value){if(!THEMES[value]||!themeAvailable(value)){alert('Bu tema kilitli. Önce bir önceki temanın altın madalyasını kazanmalısın.');$('themeSelect').value=themeId();return}save();state.activeTheme=value;loadTheme();dailyWords.cacheKey=null;save();updateThemeLabels();openScreen('home')}
function updateThemeLabels(){document.querySelectorAll('.theme-wide-shortcut,.p-theme-shortcut').forEach(e=>e.textContent=themeName());if($('themeSelect')){const sel=$('themeSelect');for(const opt of sel.options){const open=themeAvailable(opt.value);opt.disabled=!open;opt.textContent='Ünite '+opt.value+' — '+THEMES[opt.value].name+(open?'':' 🔒')}sel.value=themeId()};if($('bookThemeLabel'))$('bookThemeLabel').textContent=themeName();if($('puzzleThemeLabel'))$('puzzleThemeLabel').textContent=themeName()}
load();
function puzzleSeason(){const d=new Date(weekId()+'T12:00:00');const m=d.getMonth()+1;return [12,1,2].includes(m)?'winter':[3,4,5].includes(m)?'spring':[6,7,8].includes(m)?'summer':'autumn'}
function puzzleImage(w=viewWeek()){
 return `assets/puzzles/tema${themeId()}/hafta${w+1}.webp`;
}
function puzzleFallback(){return 'assets/images/puzzle-'+puzzleSeason()+'.webp'}
function imageWithFallback(img,week){img.onerror=()=>{img.onerror=null;img.src=puzzleFallback()};img.src=puzzleImage(week)}
function refreshPuzzleTheme(){
 const w=viewWeek(),p=puzzleImage(w);
 const probe=new Image();probe.onload=()=>document.documentElement.style.setProperty('--active-puzzle',`url("${p}")`);
 probe.onerror=()=>document.documentElement.style.setProperty('--active-puzzle',`url("${puzzleFallback()}")`);probe.src=p;
 const el=$('puzzleStudentLabel');if(el)el.textContent=studentName()||'Öğrenci';
 const stamp=document.querySelector('.puzzle-stamp');if(stamp)stamp.classList.toggle('completed',pieces(w).length===6||Boolean(medals()[themeId()]));
}

const LIMIT=1200;let screen='home',gameType='',q=null,roundCorrect=0,roundTotal=0,answerLocked=false,swShown=0,swInterval=null,gameTick=performance.now();let tabOwner=true;const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('wow8_game_clock'):null;let tabId=Math.random().toString(36).slice(2);if(channel){channel.onmessage=e=>{if(e.data?.type==='playing'&&e.data.id!==tabId&&screen==='game'){tabOwner=false;openScreen('home');alert('Oyun başka bir sekmede açık. Bu sekmedeki oyun durduruldu.')}}}
function usage(){return state.usage[localDay()]||0}function remaining(){return Math.max(0,LIMIT-usage())}
function actualWeek(){return Math.min(3,Math.max(0,Math.floor((dayNum(localDay())-dayNum(theme.start))/7)))}
function currentWeek(){return Math.min(3,actualWeek()+Math.max(0,theme.demoWeek||0))}
let lastAwardedWeek=0;let viewedWeek=null;function viewWeek(){return viewedWeek===null?currentWeek():viewedWeek}
function pieces(w=currentWeek()){return theme.puzzles[w]||[]}
function timeFmt(n){n=Math.ceil(n);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
function topUI(){const t=timeFmt(remaining()),pc=theme.puzzles.reduce((n,p)=>n+p.length,0),keys=theme.puzzles.filter(p=>p.length===6).length;
$('clockL').textContent=t;$('clockP').textContent='⏱ '+t;$('gameTime').textContent='🎮 '+t;$('piecesP').textContent='🧩 '+pieces().length+'/6';}
function openScreen(id){if(typeof stopGameTimers==='function'&&screen==='game'&&id!=='game'){stopGameTimers();const dm=$('defenderMount');if(dm){dm.replaceChildren();dm.hidden=true}}screen=id;document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===id));$('home').classList.toggle('hidden',id!=='home');if(id==='swipe')renderSwipe(true);if(id==='progress'){viewedWeek=null;renderProgress()}if(id==='badges')renderBadges();if(id==='settings'){refreshPuzzleTheme();updateThemeLabels()}if(id==='book')renderBook();topUI();if(id!=='swipe'){clearInterval(swInterval);if('speechSynthesis'in window)speechSynthesis.cancel()}}
function unlockBounds(w=currentWeek()){
 const n=themeWords().length;return [0,Math.ceil(n/3),Math.ceil(2*n/3),n,n];
}
function unlockedCount(){return unlockBounds()[currentWeek()+1]}
function pool(){return themeWords().slice(0,unlockedCount())}
function reviewWords(count=5,source=pool()){
 const ws=source;if(!ws.length)return [];
 const sorted=[...ws].sort((a,b)=>{
  const x=theme.wordStats[themeWords().indexOf(a)]||{},y=theme.wordStats[themeWords().indexOf(b)]||{};
  const rx=x.r||'',ry=y.r||'';
  const ax=rx.length?rx.split('').filter(z=>z==='1').length/rx.length:0.5;
  const ay=ry.length?ry.split('').filter(z=>z==='1').length/ry.length:0.5;
  return ax-ay||((y.w||0)-(x.w||0));
 });
 const weak=sorted.slice(0,Math.min(3,count));
 const unseen=ws.filter(x=>!weak.includes(x)).sort((a,b)=>(theme.wordStats[themeWords().indexOf(a)]?.d||0)-(theme.wordStats[themeWords().indexOf(b)]?.d||0));
 return [...weak,...unseen.slice(0,count-weak.length)];
}
function dailyWords(){
 const cacheKey=themeId()+'|'+localDay()+'|'+currentWeek();
 if(dailyWords.cacheKey===cacheKey)return dailyWords.cache;
 const w=currentWeek(),all=pool(),weekend=[0,6].includes(new Date().getDay());
 let selected=[];
 if(w===3||weekend){const chosen=reviewWords(5);selected=[...chosen,...shuffle(all.filter(x=>!chosen.includes(x))).slice(0,15-chosen.length)];}
 else {const b=unlockBounds(),news=themeWords().slice(b[w],b[w+1]),old=themeWords().slice(0,b[w]);
 selected=[...shuffle(news).slice(0,10),...reviewWords(5,old)];
 selected=[...new Set([...selected,...shuffle(old),...shuffle(news)])].slice(0,15);}
 if(!selected.length)selected=all.slice(0,15);
 const storeKey='wow8_daily_v18_'+cacheKey;try{const saved=JSON.parse(localStorage.getItem(storeKey)||'null');if(Array.isArray(saved)&&saved.length){const found=saved.map(n=>themeWords()[n]).filter(Boolean);if(found.length===saved.length)selected=found}else{localStorage.setItem(storeKey,JSON.stringify(selected.map(w=>themeWords().indexOf(w))))}}catch(e){console.warn(e)}dailyWords.cacheKey=cacheKey;dailyWords.cache=selected;return selected;
}
function swState(){const d=localDay();return theme.swipe[d]??(theme.swipe[d]={index:0})}
function renderSwipe(fresh){const s=swState(),list=dailyWords(),w=list[s.index%list.length];if(!w)return;$('swEmoji').textContent=w[2]||'';$('swEmoji').hidden=!w[2];$('swWord').textContent=w[0];$('swTr').textContent=w[1];if(fresh){swShown=Date.now();$('swNext').disabled=true;speak();clearInterval(swInterval);swInterval=setInterval(()=>{if(screen!=='swipe'){clearInterval(swInterval);return}const left=3000-(Date.now()-swShown);$('swNext').disabled=left>0;if(left<=0)clearInterval(swInterval)},120)}}
function speak(){const list=dailyWords(),s=swState();if(list.length)say(list[s.index%list.length][0])}
function say(word){if(!('speechSynthesis'in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(word);u.lang='en-US';u.rate=.84;speechSynthesis.speak(u)}catch(e){console.warn(e)}}
function nextSwipe(){if(Date.now()-swShown<3000)return;const s=swState(),list=dailyWords();s.index=Math.min(list.length*2,s.index+1);if(s.index===list.length*2){save();alert('Harika! İki turu tamamladın, oyunlar açıldı.');openScreen('home');return}save();renderSwipe(true)}
let touchStart=null;$('swCard').addEventListener('touchstart',e=>touchStart=e.touches[0].clientY,{passive:true});$('swCard').addEventListener('touchend',e=>{if(touchStart!==null){const dy=touchStart-e.changedTouches[0].clientY;if(dy>55)nextSwipe();else if(dy< -55)previousSwipe()}touchStart=null},{passive:true});

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
function recordWord(game,word,ok){if(!word||medals()[themeId()])return;const idx=themeWords().findIndex(w=>w[0]===word[0]);if(idx<0)return;const stat=theme.wordStats[idx]??={c:0,w:0,r:'',d:0};if(ok)stat.c++;else stat.w++;stat.r=(stat.r+(ok?'1':'0')).slice(-5);stat.d=dayNum(localDay())}
function showPieceCelebration(){
 const old=document.getElementById('wowPieceCelebration');if(old)old.remove();
 const layer=document.createElement('div');layer.id='wowPieceCelebration';layer.className='wow-celebrate';layer.setAttribute('role','dialog');layer.setAttribute('aria-label','Puzzle parçası kazanıldı');
 const image=document.createElement('div');image.className='wow-celebrate-image';image.style.backgroundImage=`url("${puzzleFallback()}")`;const im=new Image();im.onload=()=>image.style.backgroundImage=`url("${puzzleImage(lastAwardedWeek)}")`;im.src=puzzleImage(lastAwardedWeek);const caption=document.createElement('span');caption.className='wow-celebrate-label';caption.textContent=themeName();image.append(caption);
 const title=document.createElement('h2');title.textContent='🎉 Yeni puzzle parçanı kazandın!';
 const text=document.createElement('p');text.textContent=`${studentName()||'Harika'}! ${currentWeek()+1}. haftanın ${pieces().length}. parçası açıldı.`;
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
 if([1,2,3,4].includes(new Date().getDay())&&swState().index<dailyWords().length*2){showLearningGate();return}
 if(remaining()<=0)return alert('Bugünkü 20 dakikalık oyun süresi doldu. Kelime Öğren ve Kelime Defterim açık.');
 stopGameTimers();$('defenderMount').hidden=true;$('defenderMount').replaceChildren();gameType=type;roundCorrect=0;roundTotal=0;answerLocked=false;tabOwner=true;gameData={};
 openScreen('game');gameRunning=true;
 $('gameTitle').textContent={match:'🔗 Çizgi Eşleştirme',quiz:'📝 Mini Quiz',anagram:'🔤 Harf Atölyesi',defender:'🚀 Word Defender'}[type];
 if(channel)channel.postMessage({type:'playing',id:tabId});gameTick=performance.now();
 if(type==='match')startMatchBoard();else if(type==='defender')startDefender();else nextQuestion();
}
function updateScore(){ $('gameStats').textContent=`${Math.min(roundTotal+1,10)}/10 • ${roundCorrect} doğru`; }
function gameResult(){
 stopGameTimers();roundTotal=10;const pct=roundCorrect/10;(theme.gameStats[gameType]??={total:0,correct:0,rounds:0}).rounds++;save();let awarded=pct>=.8?awardPiece():false;
 $('gameEmoji').textContent=pct>=.8?'🎉':'💪';$('question').textContent=`${roundCorrect}/10 doğru — %${Math.round(pct*100)}`;
 $('hint').textContent=pct>=.8?(awarded?'Yeni puzzle parçan açıldı!':'Harika! Bugünkü parça hakkını kullandın veya bu tema tamamlandı.'):'Hedef %80. Yeniden deneyebilirsin.';
 $('choices').innerHTML='';$('defenderMount').hidden=true;$('defenderMount').replaceChildren();$('feedback').textContent='';$('gameStats').textContent='Tur tamamlandı';
 if(!awarded&&pct>=.8)playWowSound('round');
 if(awarded)showPieceCelebration();
 makeButton($('choices'),'🔁 Yeniden oyna',()=>startGame(gameType),'choice');
 makeButton($('choices'),'🧩 Puzzle’ı gör',()=>openScreen('progress'),'choice');
}
function makeButton(parent,label,fn,cls='choice'){let b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=fn;parent.append(b);return b}
function recordAttempt(ok){
 if(!gameRunning)return;roundTotal++;theme.stats.total++;if(ok){roundCorrect++;theme.stats.correct++;playWowSound('correct')}
 const gs=theme.gameStats[gameType]??={total:0,correct:0,rounds:0};gs.total++;if(ok)gs.correct++;
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
 const words=shuffle(dailyWords()).slice(0,5);
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
 q=rand(dailyWords());$('choices').className='choices';$('gameEmoji').textContent=q[1];$('question').textContent='Bu ifadenin İngilizcesi hangisi?';
 $('hint').textContent='Türkçe ipucunu incele ve doğru İngilizce karşılığı seç.';
 let options=shuffle([q,...shuffle(pool().filter(w=>w!==q)).slice(0,3)]);
 options.forEach(w=>makeButton($('choices'),w[0],()=>{
 if(answerLocked)return;answerLocked=true;let ok=w===q;recordAttempt(ok);
 $('feedback').textContent=ok?'🌟 Harika!':'Doğru kelime: '+q[0];
 for(const b of $('choices').children)b.disabled=true;
 later(nextQuestion,850)
 }));
}
// ANAGRAM: independently assemble letters by tapping tiles, then submit.
function drawAnagram(){
 q=rand(dailyWords().filter(w=>w[0].replace(/\s/g,'').length<=12));gameData={letters:shuffle(q[0].replace(/\s/g,'').toUpperCase().split('').map((ch,i)=>({ch,id:i}))),picked:[]};
 $('choices').className='choices anagram-area';$('gameEmoji').textContent='🔤';$('question').textContent=q[1];
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

// WOW8: Word Defender replaces mole, reusing the WOW5 scoring, timer, unlock and rewards engine.
function startDefender(){
 const mount=$('defenderMount');mount.hidden=false;mount.replaceChildren();
 $('gameEmoji').textContent='';$('question').textContent='';$('hint').textContent='Asteroitlere dokun, doğru İngilizce kelimeyi vur!';$('choices').innerHTML='';$('choices').className='choices';
 const iframe=document.createElement('iframe');iframe.className='defender-frame';iframe.title='Word Defender';iframe.src='defender.html';iframe.setAttribute('allow','autoplay');mount.append(iframe);
 updateScore();
}
// Explicit message bridge: works in embedded iframe even when file:// origins are opaque.
function defenderWords(){
 const source=dailyWords().filter(w=>w[0]&&w[1]&&w[0].length<=19);
 return (source.length>=3?source:dailyWords()).map(w=>[w[0],w[1]]);
}
window.addEventListener('message',event=>{
 const frame=document.querySelector('#defenderMount iframe');
 if(!frame||event.source!==frame.contentWindow||screen!=='game'||gameType!=='defender')return;
 const data=event.data;
 if(!data||data.wowDefender!==1)return;
 if(data.type==='ready'){
   frame.contentWindow.postMessage({wowDefender:1,type:'words',words:defenderWords()},'*');
 }else if(data.type==='result'&&gameRunning&&roundTotal<10){
   q=Array.isArray(data.word)?data.word:null;
   recordAttempt(data.correct===true);updateScore();
   if(roundTotal>=10)later(()=>{if(gameRunning)gameResult()},100);
 }
});

// MOLE V9: gentler pace, 2.2 seconds visible, 15 seconds total.
function drawMole(){
 q=rand(dailyWords());gameData={target:Math.floor(Math.random()*9),roundStarted:performance.now(),resolved:false,turn:0,sequence:[]};
 $('choices').className='choices mole-grid';$('gameEmoji').textContent='🐹';$('question').textContent=`${q[1]} kelimesini yakala!`;
 $('hint').textContent='Köstebekler 2,2 saniye görünür. Doğru İngilizce kelimeyi 15 saniye içinde yakala.';
 const wrong=shuffle(pool().filter(w=>w!==q)).slice(0,5);gameData.sequence=shuffle([q,q,q,...wrong]);
 const holes=Array.from({length:9},(_,i)=>makeButton($('choices'),'🕳️',()=>hitMole(i),'mole-hole'));
 function move(){if(!gameRunning||gameType!=='mole'||gameData.resolved)return;
  const now=performance.now();if(now-gameData.roundStarted>=15000){finishMole(false,'⏳ Süre doldu! Doğrusu: '+q[0]);return}
  const pos=gameData.target;
  holes.forEach(h=>{h.textContent='🕳️';h.classList.remove('up');h.dataset.word=''});
  const turn=gameData.turn++;const choice=gameData.sequence[turn%gameData.sequence.length];
  holes[pos].textContent='🐹 '+choice[0];holes[pos].classList.add('up');holes[pos].dataset.word=choice[0];
  gameData.target=(pos+1+Math.floor(Math.random()*8))%9;
  later(move,2200);
 }
 gameData.holes=holes;gameData.correctWord=q[0];move();later(()=>{if(!gameData.resolved)finishMole(false,'⏳ Süre doldu! Doğrusu: '+q[0])},15000);
}
function hitMole(i){
 if(!gameRunning||gameData.resolved)return;
 let hole=gameData.holes[i];if(!hole.classList.contains('up'))return;
 let ok=hole.dataset.word===gameData.correctWord;
 finishMole(ok,ok?'🌟 Doğru köstebeği yakaladın!':'💡 Doğru kelime: '+gameData.correctWord);
}
function finishMole(ok,msg){if(gameData.resolved)return;gameData.resolved=true;recordAttempt(ok);$('feedback').textContent=msg;for(let b of gameData.holes)b.disabled=true;later(nextQuestion,750)}
function awardPiece(){if(medals()[themeId()])return false;const today=localDay(),week=currentWeek();if(theme.awarded[today]?.normal&&theme.awarded[today]?.catchup)return false;
 const earned=theme.awarded[today]??={normal:false,catchup:false};let target=-1;
 if(new Date().getDay()!==0&&!earned.normal&&pieces(week).length<6){target=week;earned.normal=true}
 else if(!earned.catchup){const isSunday=new Date().getDay()===0;target=theme.puzzles.findIndex((arr,i)=>i<week&&arr.length<6);if(target<0&&isSunday&&pieces(week).length<6)target=week;if(target>=0)earned.catchup=true}
 if(target<0)return false;lastAwardedWeek=target;const arr=pieces(target),slot=[0,1,2,3,4,5].find(i=>!arr.includes(i));if(slot===undefined)return false;arr.push(slot);theme.awarded[today]=earned;save();topUI();if(theme.puzzles.every(x=>x.length===6))completeTheme();return true}
function completeTheme(){const all=medals();if(all[themeId()])return;all[themeId()]=localDay();localStorage.setItem(MEDAL_KEY,JSON.stringify(all));localStorage.removeItem(THEME_PREFIX+themeId());theme=emptyTheme();alert('🏆 Dört anahtar sandığı açtı! '+themeName()+' altın madalyası kazandın!')}
function setPuzzleWeek(delta){viewedWeek=Math.max(0,Math.min(3,viewWeek()+delta));renderProgress()}
function demoNextWeek(){theme.demoWeek=Math.min(3,(theme.demoWeek||0)+1);save();viewedWeek=null;renderProgress()}
function renderProgress(){refreshPuzzleTheme();updateThemeLabels();const week=viewWeek(),done=Boolean(medals()[themeId()]),arr=done?[0,1,2,3,4,5]:pieces(week),keyNames=['Bronz','Gümüş','Altın','Platin'];$('puzzleOwner').textContent=(studentName()||'Öğrenci')+' adlı öğrencinin';$('weekLabel').textContent=(week+1)+'. Hafta';$('weekIntro').textContent=week===3?'Genel tekrar haftası: yeni kelime yok.':'Cumartesi ve pazar tekrar günleri. Haftanın 6 parçasını tamamlayınca '+keyNames[week]+' anahtarı kazanılır.';
 const pc=done?24:theme.puzzles.reduce((n,a)=>n+a.length,0);$('progressText').textContent=`${themeName()} • ${pc}/24 parça • ${done?4:theme.puzzles.filter(a=>a.length===6).length}/4 anahtar • Günlük oyun süresi: ${timeFmt(remaining())} kaldı.`;
 const puzzle=$('puzzle');puzzle.replaceChildren();for(let i=0;i<6;i++){const el=document.createElement('div');el.className='piece'+(arr.includes(i)?' earned':' locked');el.style.backgroundImage='var(--active-puzzle)';el.style.backgroundPosition=`${(i%3)*50}% ${Math.floor(i/3)*100}%`;puzzle.append(el)}
 refreshPuzzleTheme();$('puzzleText').textContent=arr.length===6?'🎉 Bu haftanın puzzle’ı tamamlandı! '+keyNames[week]+' anahtarı senin.':`${arr.length}/6 gerçek yapboz parçası açıldı.`;
 $('keyRow').innerHTML='';keyNames.forEach((name,i)=>{const el=document.createElement('div');el.className='key-card'+((done||theme.puzzles[i].length===6)?' won':'');el.textContent='🗝️ '+name+' '+((done||theme.puzzles[i].length===6)?'✓':'🔒');$('keyRow').append(el)});
 $('chestArea').textContent=medals()[themeId()]?'🏅 Altın madalya kazanıldı!':'🎁 Dört anahtarı biriktir, hazine sandığını aç!';$('exportBtn').disabled=arr.length!==6;
}
function renderBadges(){const root=$('medalGrid');root.replaceChildren();const data=medals();const entries=Object.entries(data);if(!entries.length){root.textContent='Henüz altın madalya kazanılmadı. İlk temanın sandığı seni bekliyor!';return}entries.forEach(([id,date])=>{const div=document.createElement('div');div.className='medal-card';const name=THEMES[id]?.name||'Tema';div.innerHTML='<div class="medal-icon">🏅</div>';const t=document.createElement('strong');t.textContent=`Tema ${id} · ${name}`;const d=document.createElement('span');d.textContent=new Date(date+'T12:00:00').toLocaleDateString('tr-TR');div.append(t,d);root.append(div)})}
function renderGameWordStats(){} // Detaylı rapor yerine kompakt kelime istatistikleri kullanılır.
// Produce one PNG for the native share sheet or the download fallback.
function puzzleImageReady(week){
 return new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);
  img.onerror=()=>reject(new Error('Puzzle görseli yüklenemedi.'));
  imageWithFallback(img,week);
 });
}
function puzzlePNG(canvas){
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG oluşturulamadı.')),'image/png'));
}
function downloadPuzzle(blob,filename){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function sharePuzzle(){
 const week=viewWeek();
 if(pieces(week).length!==6&&!medals()[themeId()])return;
 const btn=$('exportBtn');if(btn.disabled)return;
 btn.disabled=true;const label=btn.textContent;btn.textContent='⏳ Görsel hazırlanıyor…';
 try{
  const img=await puzzleImageReady(week);
  const c=document.createElement('canvas');c.width=1200;c.height=800;
  const x=c.getContext('2d');if(!x)throw new Error('Görsel oluşturulamadı.');
  x.drawImage(img,0,0,1200,800);
  x.save();x.globalAlpha=.5;x.fillStyle='white';x.textAlign='center';x.textBaseline='middle';
  x.shadowColor='#002b44';x.shadowBlur=8;x.font='bold 62px sans-serif';
  x.fillText(studentName()||'Öğrenci',600,400,1100);x.restore();
  x.fillStyle='rgba(8,63,123,.92)';x.fillRect(0,0,1200,100);
  x.fillStyle='white';x.textAlign='center';x.font='bold 27px sans-serif';
  x.fillText('MySchool WOW • 8. Sınıf',600,38,1160);
  x.font='bold 26px sans-serif';x.fillText(themeName()+' • '+(week+1)+'. Hafta',600,76,1160);
  const blob=await puzzlePNG(c);
  const filename=`MySchool_WOW_5_Sinif_Tema_${themeId()}_Hafta_${week+1}.png`;
  const file=new File([blob],filename,{type:'image/png'});
  const data={files:[file],title:'MySchool WOW — Başarım',text:`${studentName()||'Öğrenci'} • 8. Sınıf • ${themeName()} • ${week+1}. Hafta`};
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
   try{await navigator.share(data);return;}
   catch(err){if(err&&err.name==='AbortError')return;}
  }
  downloadPuzzle(blob,filename);
 }catch(err){console.error('Puzzle paylaşımı:',err);alert('Puzzle görseli hazırlanamadı. Lütfen tekrar deneyin.');}
 finally{btn.textContent=label;btn.disabled=pieces(viewWeek()).length!==6&&!medals()[themeId()];}
}
// Retain legacy name for integrations; the new button calls sharePuzzle.
function exportPuzzle(){return sharePuzzle()}
function renderBook(){$('bookGrid').replaceChildren();updateThemeLabels();pool().forEach(w=>{const d=document.createElement('div');d.className='bookitem';const b=document.createElement('button');b.textContent='🔊 '+w[0];b.onclick=()=>say(w[0]);d.append(b);const t=document.createElement('div');t.textContent=w[1];d.append(t);$('bookGrid').append(d)})}

// Active game seconds only, while the tab is visible. Count monotonic elapsed time; clamp long pauses.
setInterval(()=>{let now=performance.now(),elapsed=Math.max(0,Math.min(1.5,(now-gameTick)/1000));gameTick=now;if(screen==='game'&&gameRunning&&!document.hidden&&tabOwner&&remaining()>0){state.usage[localDay()]=(state.usage[localDay()]||0)+elapsed;save();if(remaining()<=0){openScreen('home');alert('Bugünkü 20 dakika tamamlandı!')}}topUI()},1000);document.addEventListener('visibilitychange',()=>{gameTick=performance.now()});window.addEventListener('pagehide',save);topUI();

// V10 maskot tercihi: mevcut oyun/ilerleme kaydıyla aynı localStorage nesnesinde.
const WOW_STUDENT_KEY='wow8_student_name_locked_v1';
const WOW_AVATARS=['🦉','🐼','🦊','🐱','🐰','🐸','🐻','🦁'];
function renderAvatar(){
 const selected=WOW_AVATARS.includes(state.avatar)?state.avatar:'🦉';
 $('avatarWide').textContent=selected;$('avatarPortrait').textContent=selected;const visibleAvatar=$('wowSelectedAvatar');if(visibleAvatar)visibleAvatar.textContent=selected;
 document.querySelectorAll('.student-name').forEach(el=>el.textContent=studentName()||'Öğrenci');$('settingsStudentName').textContent=studentName()||'—';$('gradeWide').textContent='8. Sınıf';$('gradePortrait').textContent='8. Sınıf';
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
ensureStudentName();renderAvatar();refreshPuzzleTheme();updateThemeLabels();

function previousSwipe(){if(Date.now()-swShown<3000)return;const s=swState();if(s.index>0){s.index--;save();renderSwipe(true)}}

// v0.3: responsive mode is based on the current viewport, not an unreliable device model.
// This also handles tablets, window resizing, and orientation changes.
(function initArtworkLayout(){
  const frame=document.getElementById('wowFlat');
  const artwork=document.getElementById('wowActiveArtwork');
  if(!frame||!artwork)return;
  const landscape='assets/images/onayli-yatay.png';
  const portrait='assets/images/onayli-dikey.png';
  function update(){
    const w=document.documentElement.clientWidth||window.innerWidth;
    const h=window.innerHeight;
    const mode=w>=h?'landscape':'portrait';
    if(frame.dataset.layout!==mode)frame.dataset.layout=mode;
    const desired=mode==='landscape'?landscape:portrait;
    if(artwork.getAttribute('src')!==desired)artwork.setAttribute('src',desired);
    // The existing game timer is state-based, not attached to either artwork.
    if(typeof topUI==='function')topUI();
  }
  update();
  window.addEventListener('resize',update,{passive:true});
  window.addEventListener('orientationchange',update,{passive:true});
})();

// v0.7: create every top-panel element in JavaScript. Nothing is baked into the images.
(function initDynamicHeader(){
 const flat=document.getElementById('wowFlat');if(!flat)return;
 const header=document.createElement('div');header.className='wow-dynamic-top';
 const profile=document.createElement('button');profile.type='button';profile.className='wow-dynamic-profile';profile.setAttribute('aria-label','Profilim');profile.onclick=()=>openScreen('settings');
 const avatar=document.createElement('span');avatar.id='wowSelectedAvatar';avatar.className='wow-selected-avatar';
 const profileText=document.createElement('span');profileText.className='wow-profile-text';
 const name=document.createElement('span');name.className='wow-student-name student-name';
 const grade=document.createElement('span');grade.className='wow-grade';grade.textContent='⭐ 8. Sınıf';
 profileText.append(name,grade);profile.append(avatar,profileText);
 const themeButton=document.createElement('button');themeButton.type='button';themeButton.className='wow-dynamic-theme';themeButton.setAttribute('aria-label','Tema seçimi');themeButton.onclick=()=>openScreen('settings');
 const books=document.createElement('span');books.textContent='📚';
 const themeText=document.createElement('span');themeText.className='wow-theme-name theme-wide-shortcut';themeButton.append(books,themeText);
 const clock=document.createElement('div');clock.className='wow-dynamic-clock';
 const clockLabel=document.createElement('span');clockLabel.textContent='⏱ Günlük süren';
 const clockValue=document.createElement('strong');clockValue.className='wow-clock-value';clockValue.id='wowClockValue';clock.append(clockLabel,clockValue);
 header.append(profile,themeButton,clock);flat.append(header);
 const originalTopUI=topUI;
 topUI=function(){originalTopUI();clockValue.textContent=timeFmt(remaining())};
 renderAvatar();updateThemeLabels();topUI();
})();

// Friendly in-app modal instead of a browser alert when games are locked.
function showLearningGate(){
 const overlay=document.getElementById('wowLearnGate');if(!overlay)return;
 const words=dailyWords(),count=words.length;
 const index=Math.min(count*2,swState().index||0);
 document.getElementById('wowGateProgress').textContent=count?`${index} / ${count*2} kart • ${Math.floor(index/count)} / 2 tur`:'0 / 2 tur';
 document.getElementById('wowGateFill').style.width=count?`${Math.round(index/(count*2)*100)}%`:'0%';
 overlay.hidden=false;document.getElementById('wowGateGo').focus();
}
function closeLearningGate(go){
 const overlay=document.getElementById('wowLearnGate');if(overlay)overlay.hidden=true;
 if(go)openScreen('swipe');
}
