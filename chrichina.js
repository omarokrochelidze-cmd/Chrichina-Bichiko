/* ============================================================================
   ჭრიჭინა — თამაშის ლოგიკა
   ----------------------------------------------------------------------------
   ერთი IIFE, გლობალების გარეშე (ტესტი მდგომარეობას DOM-იდან კითხულობს).

   ⚠ ეს კლასიკური სკრიპტია და არა ES module. გვერდი `file://`-ზე, ორმაგი
   დაწკაპუნებით უნდა იხსნებოდეს, module-ს კი ბრაუზერი იქ CORS-ით ბლოკავს
   (origin = null). ამიტომ არც `import`/`export` და არც `type="module"` —
   თორემ თამაში ცარიელი ეკრანით გაიხსნება, კონსოლში ერთი CORS-შეცდომით.

   შრეების გაყოფა:
     • დისკრეტული მდგომარეობები → CSS კლასები (setPlayState/setScene/setMode)
     • უწყვეტი, კადრობრივი ვიზუალი → render(), inline სტილებით

   მდგომარეობათა მანქანა: idle | pour | recover | frozen.
   დაჭერა ახალ რაუნდს იწყებს ნებისმიერი მდგომარეობიდან, გარდა pour-ისა —
   ანუ „გაყინვიდან“ და „აღდგენიდან“ გამოსასვლელად ცალკე ღილაკი არ არსებობს.

   დაკავშირებული ფაილები: chrichina.html (მარკაპი), chrichina.css (სტილები).
   ============================================================================ */

(function(){
  "use strict";

  /* ---------- AI სცენების ასეტები (გარე ფაილები: scenes/) ---------- */
  const SCENES={idle:"scenes/idle.webp",wet:"scenes/wet.webp",frozen:"scenes/frozen.webp",win:"scenes/win.webp"};
  const layer={idle:document.getElementById('scIdle'),wet:document.getElementById('scWet'),
    frozen:document.getElementById('scFrozen'),win:document.getElementById('scWin')};
  for(const k in layer){ layer[k].style.backgroundImage="url('"+SCENES[k]+"')"; }

  /* ---------- ელემენტები ---------- */
  const $=id=>document.getElementById(id);
  const multEl=$('mult'),cashPanel=$('cashPanel'),cashVal=$('cashVal'),
    btnMain=$('btnMain'),btnLbl=$('btnLbl'),stamp=$('stamp'),
    floatEl=$('float'),toast=$('toast'),
    balTxt=$('balTxt'),balTxt2=$('balTxt2'),balPill=document.querySelector('.balpill'),
    ovCold=$('ovCold'),ovFrost=$('ovFrost'),
    flash=$('flash'),multWrap=$('multWrap'),game=$('game'),
    betCoin=$('betCoin'),betAmt=$('betAmt'),betUp=$('betUp'),betDown=$('betDown');

  /* ---------- ეკონომიკა / კონსტანტები ---------- */
  const BETS=[0.10,0.20,0.50,1,2,5,10,20,50];   // ფსონები: 0.10 → 50
  let betIndex=2;                      // ნაგულისხმევი: 0.50
  let balance=100, bet=BETS[betIndex];
  const K=0.5;                         // მულტიპლიკატორის ზრდის ტემპი
  const RECOVER_TIME=1.7;              // აღდგენა/დათბობა

  /* ---------- მდგომარეობა ---------- */
  let state='idle';                    // idle | pour | recover | frozen
  let mult=1, roundT=0, crashT=0, cold=0, wet=0, recoverT=0, holding=false;
  let soundOn=true;

  /* მდგომარეობის ცვლა + შესაბამისი კლასი #game-ზე (CSS-ის ეფექტები აქედან ირთვება) */
  const STATES=['idle','pour','recover','frozen'];
  function setPlayState(s){
    state=s;
    STATES.forEach(k=>game.classList.toggle('state-'+k,k===s));
    renderBet();                       // ფსონი მხოლოდ pour-ში იბლოკება
  }
  setPlayState('idle');

  /* ---------- Aviator-ის სტილის crash განაწილება ---------- */
  function genCrashTime(){
    const r=Math.random();
    let crashMult;
    if(r<0.03) crashMult=1.0;                       // ~3% მყისიერი გაყინვა
    else crashMult=Math.min(60, 0.97/(1-r));        // 0.97/(1-r), max x60
    return Math.log(Math.max(1.0001,crashMult))/K;  // → დრო
  }

  /* ---------- ფსონის სტეპერი ---------- */
  function affordable(v){ return balance>=v-1e-9; }

  /* ფსონი ყველგან იცვლება, სადაც დაჭერა ახალ რაუნდს იწყებს — ანუ pour-ის გარდა.
     ბალანსზე ძვირი ფსონი თავად არ ჩამოდის: მონეტა მუქდება და დაჭერა ტოსტს იძლევა. */
  function betEditable(){ return state!=='pour'; }
  function renderBet(){
    betAmt.textContent=BETS[betIndex].toFixed(2);
    const ed=betEditable();
    betCoin.classList.toggle('poor',ed && !affordable(BETS[betIndex]));
    betUp.disabled=!ed || betIndex>=BETS.length-1 || !affordable(BETS[betIndex+1]);
    betDown.disabled=!ed || betIndex<=0;
  }
  function stepBet(d){
    if(!betEditable()) return;
    const n=betIndex+d;
    if(n<0 || n>=BETS.length) return;
    // ზემოთ მხოლოდ ხელმისაწვდომამდე; ქვემოთ ყოველთვის — თორემ ცარიელი ბალანსით
    // მოთამაშე ძვირ ფსონზე იჭედება (ყველა საფეხური ხელმიუწვდომელია, ჩამოსვლაც კი).
    if(d>0 && !affordable(BETS[n])) return;
    betIndex=n; bet=BETS[n]; renderBet();
  }

  /* ---------- სცენის გადართვა (crossfade) ---------- */
  /* wet/frozen-ს ვიდეო-ლუპი აქვს: ვუშვებთ მხოლოდ მაშინ, როცა ჩანს, და თავიდან ვიწყებთ,
     რომ ყოველი რაუნდი ერთი და იმავე კადრიდან დაიწყოს. play() შეიძლება უარყოს ჟესტამდე —
     უვნებელია, რადგან ეს სცენები ისედაც დაჭერის შემდეგ ჩნდება. */
  function setScene(name){
    for(const k in layer){
      const on=k===name;
      layer[k].classList.toggle('on',on);
      const v=layer[k].firstElementChild;
      if(v&&v.tagName==='VIDEO'){
        if(on){ try{v.currentTime=0;}catch(e){} v.play().catch(()=>{}); }
        else v.pause();
      }
    }
  }

  /* ---------- UI რეჟიმები ---------- */
  function setMode(m){
    stamp.classList.remove('show');
    if(m==='idle'){
      multEl.classList.add('idle'); cashPanel.classList.remove('show');
      btnLbl.textContent='დაჭირე'; btnMain.disabled=false; btnMain.style.opacity=1;
    }else if(m==='pour'){
      /* ერთადერთი მინიშნება ღილაკზეა („აუშვი!“) — მულტიპლიკატორის ქვედა ტექსტი
         იმავეს იმეორებდა და მოხსნილია. */
      multEl.classList.remove('idle'); cashPanel.classList.add('show');
      btnLbl.textContent='აუშვი!'; btnMain.disabled=false; btnMain.style.opacity=1;
    }else if(m==='win'){
      /* მოგებას აღარ ვაცხადებთ პანელით: Cash Out მხოლოდ pour-ის ინსტრუმენტია და
         აქ ქრება — თანხას #float იტყვის და ბალანსში ჩააგდებს. */
      cashPanel.classList.remove('show');
      btnLbl.textContent='დაჭირე'; btnMain.disabled=false; btnMain.style.opacity=1;
    }else if(m==='frozen'){
      cashPanel.classList.remove('show');
      btnLbl.textContent='დაჭირე'; btnMain.disabled=false; btnMain.style.opacity=1;
      stamp.classList.add('show');
    }else if(m==='recover'){
      cashPanel.classList.remove('show');
      btnLbl.textContent='დაჭირე'; btnMain.disabled=false; btnMain.style.opacity=1;
    }
  }

  /* ---------- ბალანსი ---------- */
  function fmt(v){ return v.toFixed(2)+' GEL'; }
  function updateBalance(){
    balTxt.textContent=fmt(balance); if(balTxt2)balTxt2.textContent=fmt(balance);
    renderBet();                       // ბალანსმა შეიძლება ფსონი ხელმიუწვდომელი გახადოს
  }

  /* ---------- მოქმედებები ---------- */
  /* დაჭერა ახალ რაუნდს იწყებს ნებისმიერი მდგომარეობიდან, გარდა pour-ისა:
     idle-დან, გაყინვიდან (reset ღილაკის გარეშე) და აღდგენიდანაც. */
  /* აბრუნებს true-ს მხოლოდ მაშინ, თუ რაუნდი მართლა დაიწყო — press() ამაზე წყვეტს,
     ღილაკს „გეჭირავს“ იერი მისცეს თუ არა. */
  function down(){
    if(state==='pour') return false;
    if(!affordable(bet)){ showToast('არასაკმარისი ბალანსი'); return false; }
    crashT=genCrashTime(); roundT=0; mult=1; cold=0; wet=0;
    setPlayState('pour');
    balance-=bet; updateBalance();
    setScene('wet'); setMode('pour'); sfxStart();
    return true;
  }
  function up(){ if(state==='pour') cashOut(); }
  function cashOut(){
    const winAmt=bet*mult;
    balance+=winAmt; updateBalance();
    setPlayState('recover'); recoverT=0;
    setScene('win'); setMode('win');
    cashVal.textContent=fmt(winAmt);
    showFloat('+'+fmt(winAmt)); goldFlash(); sparkleBurst(); sfxCash();
  }
  function crash(){
    setPlayState('frozen'); setScene('frozen'); setMode('frozen');
    // რაუნდი დამთავრდა, თითი კი შეიძლება ისევ ღილაკზე იყოს — „გეჭირავს“ იერი
    // აქვე უნდა ჩამოვარდეს, თორემ ღილაკი ყინულისფერი რჩება წარწერასთან
    // („დაჭირე“) წინააღმდეგობაში. holding-ს არ ვცვლით: release() მას თავად ხურავს.
    btnMain.classList.remove('held');
    freezeFlash(); snowBurst(); sfxCrash();
  }

  /* ---------- ეფექტები (toast/float/flash) ---------- */
  let toastT;
  function showToast(t){ toast.textContent=t; toast.classList.add('show');
    clearTimeout(toastT); toastT=setTimeout(()=>toast.classList.remove('show'),1600); }
  /* თანხა ცენტრიდან ბალანსის pill-ისკენ. ვექტორს ყოველ ჯერზე თავიდან ვზომავთ:
     .play-ის მოხსნის შემდეგ #float თავის საწყის (transform-გარეშე) ადგილზეა, ამიტომ
     rect სწორია — orientation-ის ცვლილებაც თავისით ეწერება. */
  let balHitT;
  function showFloat(t){
    floatEl.textContent=t; floatEl.classList.remove('play'); void floatEl.offsetWidth;
    const f=floatEl.getBoundingClientRect(), b=balPill.getBoundingClientRect();
    floatEl.style.setProperty('--fx',((b.left+b.width/2)-(f.left+f.width/2)).toFixed(1)+'px');
    floatEl.style.setProperty('--fy',((b.top+b.height/2)-(f.top+f.height/2)).toFixed(1)+'px');
    floatEl.classList.add('play');
    // pill-ის პულსი ზუსტად დაჯდომის მომენტში (ანიმაციის ბოლო)
    clearTimeout(balHitT);
    balHitT=setTimeout(()=>{ balPill.classList.remove('hit'); void balPill.offsetWidth;
      balPill.classList.add('hit'); },1420);
  }
  function goldFlash(){ flash.classList.add('gold'); flash.style.transition='none';
    flash.style.opacity=.85; requestAnimationFrame(()=>{ flash.style.transition='opacity .8s ease';
      flash.style.opacity=0; }); }
  function freezeFlash(){ flash.classList.remove('gold'); flash.style.transition='none';
    flash.style.opacity=.9; requestAnimationFrame(()=>{ flash.style.transition='opacity .6s ease';
      flash.style.opacity=0; }); }

  /* ---------- ნაწილაკები (canvas) ---------- */
  const cv=$('fx'), ctx=cv.getContext('2d'); let parts=[];
  /* W/H = ტილოს ზომა CSS-პიქსელებში; ნაწილაკები სწორედ ამ სივრცეში ცხოვრობენ.
     ბუფერი dpr-ჯერ დიდია და კონტექსტი იმავეზეა დამასშტაბებული, რომ ეკრანზე
     წვეთები მკვეთრი იყოს და არა გადაჭიმული. */
  let W=0,H=0;
  function resize(){
    const dpr=Math.min(2,window.devicePixelRatio||1);
    W=cv.clientWidth; H=cv.clientHeight;
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);   // width/height-ის ჩაწერა transform-ს ანულებს
  }
  window.addEventListener('resize',resize); resize();
  function P(o){ parts.push(o); }
  /* კაცი კადრის ცენტრშია (~0.48 სიგანის) — ემიტერები მასზეა დამიზნებული.
     ძველი 0.20–0.36 დიაპაზონი მარცხნივ მდგარ პერსონაჟს ეკუთვნოდა. */
  const MANX=0.48;
  function spawnRain(dt){ // pour: წყლის წვეთები კაცის ზონაში
    const n=Math.floor(dt*90*(0.4+wet));
    for(let i=0;i<n;i++){ const cx=W*(MANX-0.08+Math.random()*0.16);
      P({x:cx,y:H*0.24+Math.random()*20,vx:(Math.random()-.5)*20,
        vy:220+Math.random()*160,r:1.5+Math.random()*2.2,life:1,type:'rain'}); } }
  function snowBurst(){ for(let i=0;i<70;i++){ P({x:W*(MANX-0.18+Math.random()*0.36),
    y:H*(0.22+Math.random()*0.4),vx:(Math.random()-.5)*60,vy:-40-Math.random()*120,
    r:2+Math.random()*3.5,life:1,type:'snow',g:60}); } }
  function sparkleBurst(){ for(let i=0;i<50;i++){ P({x:W*(MANX-0.12+Math.random()*0.24),
    y:H*(0.4+Math.random()*0.25),vx:(Math.random()-.5)*90,vy:-60-Math.random()*140,
    r:1.5+Math.random()*3,life:1,type:'gold',g:20}); } }
  function updateFX(dt){
    if(state==='pour') spawnRain(dt);
    if(state==='frozen'&&Math.random()<0.35){ P({x:Math.random()*W,y:-6,
      vx:(Math.random()-.5)*20,vy:30+Math.random()*40,r:1.5+Math.random()*3,life:1,type:'snow',g:6}); }
    ctx.clearRect(0,0,W,H);
    for(let i=parts.length-1;i>=0;i--){ const p=parts[i];
      p.vy+=(p.g||400)*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt*(p.type==='rain'?1.6:0.5);
      if(p.life<=0||p.y>H+10){ parts.splice(i,1); continue; }
      ctx.globalAlpha=Math.max(0,Math.min(1,p.life));
      if(p.type==='rain'){ ctx.strokeStyle='rgba(190,230,255,.85)'; ctx.lineWidth=p.r;
        ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx*0.02,p.y-p.vy*0.03); ctx.stroke(); }
      else if(p.type==='snow'){ ctx.fillStyle='#eaf7ff'; ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,7); ctx.fill(); }
      else { ctx.fillStyle='rgba(255,215,120,.95)'; ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,7); ctx.fill(); }
    }
    ctx.globalAlpha=1;
    if(parts.length>1200) parts.splice(0,parts.length-1200);
  }

  /* ---------- ხმა (WebAudio, მარტივი) ---------- */
  let ac;
  function actx(){ if(!ac){ try{ ac=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return ac; }
  function tone(f,f2,dur,type,vol){ if(!soundOn)return; const a=actx(); if(!a)return;
    const o=a.createOscillator(),g=a.createGain(); o.type=type||'sine';
    o.frequency.setValueAtTime(f,a.currentTime);
    if(f2) o.frequency.exponentialRampToValueAtTime(f2,a.currentTime+dur);
    g.gain.setValueAtTime(vol||0.12,a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001,a.currentTime+dur);
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime+dur); }
  function sfxStart(){ tone(220,520,0.25,'triangle',0.1); }
  function sfxCash(){ tone(660,990,0.18,'sine',0.14); setTimeout(()=>tone(990,1320,0.2,'sine',0.12),90); }
  function sfxCrash(){ tone(400,80,0.5,'sawtooth',0.13); }

  /* ---------- render ---------- */
  function render(){
    multEl.textContent=mult.toFixed(2)+'x';
    if(state==='pour') cashVal.textContent=fmt(bet*mult);
    ovCold.style.opacity=cold;
    ovFrost.style.opacity=(state==='frozen')?1:(cold*0.25);
    // წვიმის ახლო ფენა რაუნდის მსვლელობისას ძლიერდება
    game.style.setProperty('--rain',(state==='pour'?wet:0).toFixed(3));
    // შიშისგან კანკალი — რაც უფრო ცივა, მით მეტი
    const shiver=(state==='pour')?cold*4:(state==='frozen'?1.5:0);
    if(shiver>0){ const dx=(Math.random()-.5)*shiver, dy=(Math.random()-.5)*shiver;
      for(const k in layer) layer[k].style.transform='translate('+dx+'px,'+dy+'px)';
      multWrap.style.transform='translateX(-50%) translate('+dx*0.4+'px,'+dy*0.4+'px)';
    } else { for(const k in layer) layer[k].style.transform='';
      // multWrap-იც უნდა გასუფთავდეს, თორემ ბოლო ცახცახის ოფსეტი inline-ად რჩება
      // და მულტიპლიკატორი სამუდამოდ ცენტრიდან ოდნავ გადაწეული დგება.
      multWrap.style.transform=''; }
  }

  /* ---------- ლუპი ---------- */
  let last=performance.now();
  function frame(now){
    const dt=Math.min(0.05,(now-last)/1000); last=now;
    if(state==='pour'){
      roundT+=dt; mult=Math.exp(K*roundT);
      cold=Math.min(0.8,(mult-1)/6); wet=Math.min(1,roundT/1.2);
      if(roundT>=crashT) crash();
    } else if(state==='recover'){
      recoverT+=dt; cold=Math.max(0,cold-dt/RECOVER_TIME);
      if(recoverT>=RECOVER_TIME){ setPlayState('idle'); mult=1; setScene('idle'); setMode('idle'); }
    }
    render(); updateFX(dt); requestAnimationFrame(frame);
  }

  /* ---------- input: press & hold ---------- */
  /* ღია მოდალი თამაშს ფარავს — კლავიატურამ მის უკან რაუნდი არ უნდა დაიწყოს
     (ფსონი ისედაც ჩამოიჭრებოდა, მოთამაშე კი ვერაფერს ხედავდა). */
  function modalOpen(){ return !!document.querySelector('.scrim.show'); }
  function press(e){ if(e){ e.preventDefault(); } if(actx()&&ac.state==='suspended')ac.resume();
    /* „გეჭირავს“ იერს მხოლოდ მაშინ ვრთავთ, თუ რაუნდი მართლა დაიწყო: არასაკმარისი
       ბალანსის დროს ღილაკი ადრე ტოსტთან ერთად ყინულისფერდებოდა, თითქოს ითამაშა. */
    if(!down()) return;
    holding=true; btnMain.classList.add('held'); }
  function release(){ if(!holding)return; holding=false; btnMain.classList.remove('held'); up(); }
  btnMain.addEventListener('pointerdown',e=>{ try{btnMain.setPointerCapture(e.pointerId);}catch(_){}; press(e); });
  btnMain.addEventListener('pointerup',release);
  btnMain.addEventListener('pointercancel',release);
  btnMain.addEventListener('lostpointercapture',release);
  window.addEventListener('blur',release);
  window.addEventListener('contextmenu',e=>{ if(e.target.closest('#btnMain'))e.preventDefault(); });
  document.addEventListener('keydown',e=>{ if(e.code==='Space'&&!e.repeat&&!modalOpen()){ e.preventDefault(); press(); } });
  document.addEventListener('keyup',e=>{ if(e.code==='Space'){ e.preventDefault(); release(); } });
  betUp.addEventListener('click',()=>stepBet(+1));
  betDown.addEventListener('click',()=>stepBet(-1));

  /* ---------- modals ---------- */
  $('menuBtn').addEventListener('click',()=>$('menuScrim').classList.add('show'));
  $('gearBtn').addEventListener('click',()=>$('gearScrim').classList.add('show'));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',
    ()=>$(b.dataset.close).classList.remove('show')));
  document.querySelectorAll('.scrim').forEach(s=>s.addEventListener('click',
    e=>{ if(e.target===s)s.classList.remove('show'); }));
  $('soundToggle').addEventListener('click',function(){ soundOn=!soundOn; this.classList.toggle('on',soundOn); });
  $('topUpBtn').addEventListener('click',()=>{ balance+=100; updateBalance(); });
  $('resetBalBtn').addEventListener('click',()=>{ balance=0; updateBalance(); });

  /* ---------- init ---------- */
  updateBalance(); setScene('idle'); setMode('idle');
  requestAnimationFrame(frame);
})();
