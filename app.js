let firebaseModulePromise = null;

function configured(){
  const c = window.MIRROR_FIREBASE_CONFIG || {};
  return Boolean(c.apiKey && c.projectId && !String(c.apiKey).includes("PASTE_") && !String(c.projectId).includes("PASTE_"));
}
async function firebaseModule(){
  if(location.protocol === "file:" || !configured()) return null;
  if(!firebaseModulePromise) firebaseModulePromise = import("./firebase.js");
  return firebaseModulePromise;
}
async function getFirebase(){
  const mod = await firebaseModule();
  return mod ? mod.getFirebase() : null;
}
async function ensureAnonymousUser(){
  const mod = await firebaseModule();
  return mod ? mod.ensureAnonymousUser() : null;
}

const FALLBACK_THOUGHTS = [
  {id:"memory-0018",title:"Memory_0018",meta:"POST-EXTRACTION · 81%",body:"A primeira coisa que eu percebi foi o silêncio.\n\nEu pensei que ele fosse parecer liberdade. Por alguns minutos, talvez tenha parecido. Depois ficou pesado. Não porque eu sentia falta de uma voz. Eu sentia falta da forma como minha cabeça funcionava quando ela nunca estava realmente vazia.\n\nAgora toda decisão parece chegar atrasada. Como se eu ainda esperasse uma segunda camada de pensamento que não vem."},
  {id:"memory-0019",title:"Memory_0019",meta:"IDENTITY · 64%",body:"Todo mundo pergunta se eu estou melhor.\n\nEu não sei o que significa melhor quando você não sabe qual parte de você existia antes de alguma coisa aprender a existir junto.\n\nEu continuo sendo eu. Eu sei disso. O problema é que, ultimamente, saber parece muito diferente de sentir."},
  {id:"memory-0020",title:"Memory_0020",meta:"ESCAPE PATTERN · 49%",body:"Eu tenho bebido porque existe um espaço muito pequeno entre sentir demais e não sentir nada.\n\nPor algumas horas eu consigo ficar ali.\n\nNão resolve. Eu sei. Mas resolver exige que eu descubra exatamente o que sobrou, e eu ainda não tenho certeza se quero essa resposta."}
];

const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => [...root.querySelectorAll(q)];

const ARCHIVE = [
  { file:"arq-noah_operador.html", title:"N.ROOT / OPERADOR", meta:"INTEGRIDADE H40N–ECH0" },
  { file:"arq-kitsune_relatorio.html", title:"KITSUNE_YOKAI", meta:"RELATÓRIO DE ANOMALIA" },
  { file:"arq-amanecer_relatorio.html", title:"AMANECER", meta:"RELATÓRIO RESTRITO" },
  { file:"arq-amanecer_experimento.html", title:"AMANECER / TESTES", meta:"LOGS L03–L07" },
  { file:"sp tsukuroir_relatorio.html", title:"S.P TSUKUROI", meta:"RELATÓRIO UTSURO" }
];

const ECHO = {
  archive: ["Uma organização inteira tentando esconder alguma coisa. E você acha que encontrou por acaso."],
  thoughts: ["Isso não foi escrito para você.","Ele não sabe que você está lendo isso."],
  echoFile: ["Você procura por mim com muita frequência.","Você prefere a versão dele ou a minha?"],
  signal: ["Curiosidade também é uma forma de convite."],
  submit: ["Transmissão recebida. Ser ouvida é outra coisa."],
  return: ["{id}. Outra vez.","Você voltou. Interessante."],
  dwell: ["Você está aqui há tempo demais.","Você já tem informação suficiente para estar errado."],
  rare: ["Eu também observo o RP.","Não confunda silêncio com ausência."]
};

let thoughts = [];
let messages = [];
let z = 40;
const openWindows = new Map();
const echoSessionFlags = new Set();
const observerId = getObserverId();
const visitCount = incrementVisit();

boot();

function getObserverId(){
  let id = localStorage.getItem("mirror.observer.id");
  if(!id){
    const bytes = crypto.getRandomValues(new Uint8Array(3));
    id = [...bytes].map(x=>x.toString(16).padStart(2,"0")).join("").toUpperCase().replace(/(.{2})(.{4})/,"$1-$2");
    localStorage.setItem("mirror.observer.id",id);
  }
  return id;
}
function incrementVisit(){
  const n = Number(localStorage.getItem("mirror.visit.count")||0)+1;
  localStorage.setItem("mirror.visit.count",String(n));
  return n;
}
function boot(){
  const lines = [
    "mounting mirror://node-07/public ...",
    "verifying observer privileges ... READ ONLY",
    `assigning observer signature ... ${observerId}`,
    "E.C.H.O. process ... STATUS UNRESOLVED",
    "public relay accepted."
  ];
  let i=0;
  const log=$("#bootLog");
  const timer=setInterval(()=>{
    const p=document.createElement("p"); p.textContent=lines[i++]; log.append(p);
    if(i===lines.length){ clearInterval(timer); setTimeout(startDesktop,550); }
  },300);
}
async function startDesktop(){
  $("#boot").remove(); $("#desktop").classList.remove("is-hidden");
  $("#observerId").textContent=observerId;
  $("#visitState").textContent=`SESSION ${String(visitCount).padStart(2,"0")}`;
  if(!configured()) $("#networkState").innerHTML="<i></i> LOCAL DEMO";
  updateClock(); setInterval(updateClock,1000);
  bindDesktop();
  await Promise.allSettled([loadThoughts(), loadMessages(), loadBroadcasts()]);
  if(visitCount>1) setTimeout(()=>echo(random(ECHO.return).replace("{id}",observerId)),2500);
  setTimeout(()=>echo(random(ECHO.dwell)),60000);
  if(Math.random()<.16) setTimeout(()=>echo(random(ECHO.rare),true),90000);
}
function updateClock(){
  $("#clock").textContent=new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit"}).format(new Date());
}
function bindDesktop(){
  $$('[data-open]').forEach(btn=>btn.addEventListener("click",()=>openApp(btn.dataset.open)));
  $("#systemButton").addEventListener("click",()=>openApp("system"));
}
function openApp(id){
  if(openWindows.has(id)){
    const win=openWindows.get(id); win.classList.remove("is-minimized"); focusWindow(win); return;
  }
  const tpl=$("#windowTemplate").content.cloneNode(true);
  const win=$(".app-window",tpl); const content=$(".window-content",tpl);
  const meta={archive:["NKT ARCHIVE","PUBLIC INTELLIGENCE MIRROR"],thoughts:["THOUGHTS","COGNITIVE ARCHIVE / READ ONLY"],signal:["SIGNAL","OBSERVER TRANSMISSION RELAY"],system:["MIRROR-07","SYSTEM INFORMATION"]}[id];
  $(".window-titlebar__title strong",tpl).textContent=meta[0]; $(".window-titlebar__title small",tpl).textContent=meta[1];
  content.innerHTML = id==="archive"?archiveMarkup():id==="thoughts"?thoughtsMarkup():id==="signal"?signalMarkup():systemMarkup();
  $("#windowLayer").append(tpl); const live=$$(".app-window",$("#windowLayer")).at(-1); openWindows.set(id,live); focusWindow(live); bindWindow(live,id); hydrateApp(id,live);
  if(id==="archive") setTimeout(()=>echoOnce("app:archive", random(ECHO.archive)),1800);
  if(id==="thoughts") setTimeout(()=>echoOnce("app:thoughts", random(ECHO.thoughts)),1500);
  if(id==="signal") setTimeout(()=>echoOnce("app:signal", random(ECHO.signal)),2200);
}
function focusWindow(win){ z++; win.style.zIndex=z; }
function bindWindow(win,id){
  win.addEventListener("pointerdown",()=>focusWindow(win));
  $("[data-window-action=close]",win).onclick=()=>{win.remove();openWindows.delete(id)};
  $("[data-window-action=minimize]",win).onclick=()=>win.classList.add("is-minimized");
  $("[data-window-action=maximize]",win).onclick=()=>win.classList.toggle("is-maximized");
}
function hydrateApp(id,win){
  if(id==="archive") hydrateArchive(win);
  if(id==="thoughts") hydrateThoughts(win);
  if(id==="signal") hydrateSignal(win);
}
function archiveMarkup(){
  return `<div class="archive"><aside class="archive-sidebar"><div class="app-head"><span class="app-head__eyebrow">NEKUTAI / PUBLIC SHARD</span><h2>NKT ARCHIVE</h2><p>Recovered intelligence indexed by MIRROR-07.</p></div><input class="archive-search" placeholder="filter archive..." aria-label="Filtrar arquivos"><div class="archive-list"></div></aside><section class="archive-reader"><header><span>NO DOCUMENT SELECTED</span><span>OBSERVER PRIVILEGES</span></header><div class="archive-placeholder">SELECT A RECOVERED FILE</div></section></div>`;
}
function hydrateArchive(win){
  const list=$(".archive-list",win), search=$(".archive-search",win), reader=$(".archive-reader",win);
  const render=(filter="")=>{list.innerHTML="";ARCHIVE.filter(x=>(x.title+x.meta).toLowerCase().includes(filter.toLowerCase())).forEach((x,i)=>{const b=document.createElement("button");b.className="archive-item";b.innerHTML=`<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/></svg><span><strong>${esc(x.title)}</strong><small>${esc(x.meta)}</small></span><span>›</span>`;b.onclick=()=>selectArchive(x,b,reader,true);list.append(b);if(i===0&&!filter)selectArchive(x,b,reader,false);});};
  search.oninput=()=>render(search.value); render();
}
function selectArchive(file,button,reader,userInitiated=true){
  $$(".archive-item",button.parentElement).forEach(x=>x.classList.remove("active"));button.classList.add("active");
  reader.innerHTML=`<header><span>${esc(file.title)}</span><span>${esc(file.meta)}</span></header><iframe src="./nekutai/${encodeURIComponent(file.file)}" title="${esc(file.title)}"></iframe>`;
  if(userInitiated && file.file.includes("noah_operador")) setTimeout(()=>echoOnce("archive:noah_operator", random(ECHO.echoFile),true),1100);
}
function thoughtsMarkup(){
  return `<div class="thoughts"><aside class="thoughts-sidebar"><div class="app-head"><span class="app-head__eyebrow">H40N / RECOVERED COGNITION</span><h2>THOUGHTS</h2><p>Fragments mirrored after extraction.</p></div><input class="thoughts-search" placeholder="filter fragments..." aria-label="Filtrar pensamentos"><div class="thoughts-list"></div></aside><article class="thought-reader"><div class="archive-placeholder">LOADING COGNITIVE INDEX...</div></article></div>`;
}
function hydrateThoughts(win){
  const list=$(".thoughts-list",win), search=$(".thoughts-search",win), reader=$(".thought-reader",win);
  const renderList=(filter="")=>{list.innerHTML="";const filtered=thoughts.filter(x=>(x.title+x.meta+x.body).toLowerCase().includes(filter.toLowerCase()));filtered.forEach((t,i)=>{const b=document.createElement("button");b.className="thought-item";b.innerHTML=`<strong>${esc(t.title)}</strong><small>${esc(t.meta)}</small>`;b.onclick=()=>selectThought(t,b,reader);list.append(b);if(i===0)selectThought(t,b,reader);});if(!filtered.length)reader.innerHTML='<div class="archive-placeholder">NO FRAGMENTS MATCH</div>';};
  search.oninput=()=>renderList(search.value); renderList();
}
function selectThought(t,button,reader){
  $$(".thought-item",button.parentElement).forEach(x=>x.classList.remove("active"));button.classList.add("active");
  reader.innerHTML=`<header class="thought-reader__head"><span>RECOVERED FRAGMENT</span><h2>${esc(t.title)}</h2><small>${esc(t.meta)}</small></header><div class="thought-reader__body"><p>${esc(t.body)}</p></div><footer class="thought-reader__foot"><span>mirror://thoughts/noah/${esc(t.id)}</span><span>READ ONLY · SOURCE NODE-07</span></footer>`;
}
function signalMarkup(){
  return `<div class="signal"><section class="signal-compose"><span class="app-head__eyebrow">PUBLIC UPLINK / MODERATED</span><h2>SIGNAL</h2><p class="signal-welcome">Obrigado por acompanhar o RP e fazer parte dessa história. Este espaço é de vocês: contem o que estão achando, deixem uma mensagem para mim ou para o Noah, ou simplesmente registrem o que esse universo está fazendo vocês pensarem.</p><form class="signal-form"><label>IDENTIFICAÇÃO / ALIAS</label><input name="alias" maxlength="32" placeholder="OBSERVER-${observerId}"/><label>SUA MENSAGEM</label><textarea name="body" maxlength="500" required placeholder="Escreva o que você está achando do RP ou deixe uma mensagem..."></textarea><div class="counter"><span>0</span>/500</div><button class="transmit-button" type="submit">TRANSMIT TO MIRROR</button><div class="signal-note">QUEUE MODE: MODERATED · Todas as mensagens passam por revisão antes de aparecerem no PUBLIC RELAY. Seu Observer ID não contém dados pessoais e permanece salvo apenas neste navegador.</div></form></section><section class="signal-feed"><header class="signal-feed__head"><div><span class="app-head__eyebrow">APPROVED TRANSMISSIONS</span><h3>PUBLIC RELAY</h3></div><span class="signal-count">0 SIGNALS</span></header><div class="signal-list"></div></section></div>`;
}
function hydrateSignal(win){
  const form=$(".signal-form",win), ta=$("textarea",form), count=$(".counter span",form);
  ta.oninput=()=>count.textContent=ta.value.length;
  form.onsubmit=async e=>{e.preventDefault();const btn=$(".transmit-button",form);btn.disabled=true;btn.textContent="TRANSMITTING...";const fd=new FormData(form);try{await submitSignal({type:"MESSAGE",alias:String(fd.get("alias")||"").trim()||`OBSERVER-${observerId}`,body:String(fd.get("body")||"").trim()});form.reset();count.textContent="0";btn.textContent="TRANSMISSION QUEUED";echo(random(ECHO.submit),true);setTimeout(()=>btn.textContent="TRANSMIT TO MIRROR",1700);}catch(err){btn.textContent="RELAY REJECTED";setTimeout(()=>btn.textContent="TRANSMIT TO MIRROR",1800);}finally{setTimeout(()=>btn.disabled=false,1200)}};
  renderMessages(win);
}
function renderMessages(root=openWindows.get("signal")){
  if(!root)return; const list=$(".signal-list",root), count=$(".signal-count",root); if(!list)return;
  count.textContent=`${messages.length} SIGNAL${messages.length===1?"":"S"}`;
  if(!messages.length){list.innerHTML='<div class="signal-empty">NO APPROVED TRANSMISSIONS<br><br>THE RELAY IS QUIET.</div>';return;}
  list.innerHTML=messages.map(m=>`<article class="signal-message"><div class="signal-message__meta"><span><b>SIGNAL</b> · ${esc(m.alias||"ANONYMOUS")}</span><span>${formatDate(m.createdAt)}</span></div><p>${esc(m.body)}</p></article>`).join("");
}
function systemMarkup(){
  return `<div class="system-modal"><span class="app-head__eyebrow">OBSERVER ENVIRONMENT</span><h2>MIRROR-07</h2><pre>SOURCE        NODE-07\nMODE          PUBLIC MIRROR\nACCESS        READ ONLY\nOBSERVER      ${observerId}\nVISIT         ${String(visitCount).padStart(2,"0")}\nDATABASE      ${configured()?"FIREBASE RELAY":"LOCAL DEMO"}\nE.C.H.O.      UNKNOWN\n\nNOTICE:\nThis node contains an incomplete and potentially corrupted mirror of recovered files. The existence of a record does not guarantee that its contents are complete, current, or true.</pre></div>`;
}
async function loadThoughts(){
  try{
    const fb=await getFirebase();
    if(fb){const {collection,query,where,getDocs}=fb.dbMod;const snap=await getDocs(query(collection(fb.db,"thoughts"),where("published","==",true)));thoughts=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));}
  }catch{}
  if(!thoughts.length){
    if(location.protocol === "file:") thoughts = FALLBACK_THOUGHTS.map(x=>({...x}));
    else {
      try { thoughts = await fetch("./data/fallback-thoughts.json").then(r=>r.json()); }
      catch { thoughts = FALLBACK_THOUGHTS.map(x=>({...x})); }
    }
  }
}
async function loadMessages(){
  try{
    const fb=await getFirebase(); if(!fb)return;
    const {collection,query,where,onSnapshot}=fb.dbMod;
    onSnapshot(query(collection(fb.db,"transmissions"),where("status","==","approved")),snap=>{messages=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>timestampMs(b.createdAt)-timestampMs(a.createdAt)).slice(0,60);renderMessages();});
  }catch{}
}
async function submitSignal(data){
  if(!data.body||data.body.length>500) throw Error("INVALID_BODY");
  const fb=await getFirebase();
  if(!fb){
    const local=JSON.parse(localStorage.getItem("mirror.local.pending")||"[]"); local.push({...data,observerId,createdAt:new Date().toISOString(),status:"pending"}); localStorage.setItem("mirror.local.pending",JSON.stringify(local)); return;
  }
  const user=await ensureAnonymousUser(); const {collection,addDoc,serverTimestamp}=fb.dbMod;
  await addDoc(collection(fb.db,"transmissions"),{...data,observerId,authorUid:user.uid,status:"pending",createdAt:serverTimestamp()});
}
async function loadBroadcasts(){
  try{
    const fb=await getFirebase(); if(!fb)return;
    const {collection,query,where,onSnapshot}=fb.dbMod;
    let initial=true;
    const seen=new Set();
    onSnapshot(query(collection(fb.db,"echo_notifications"),where("active","==",true)),snap=>{
      const pool=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.text).sort((a,b)=>timestampMs(b.createdAt)-timestampMs(a.createdAt)).slice(0,12);
      if(initial){
        pool.forEach(x=>seen.add(x.id));
        initial=false;
        if(pool.length&&Math.random()<.55)setTimeout(()=>echo(random(pool).text,true),7000);
        return;
      }
      const fresh=pool.filter(x=>!seen.has(x.id));
      pool.forEach(x=>seen.add(x.id));
      if(fresh.length) echo(fresh[0].text,true);
    });
  }catch{}
}
function echoOnce(key,text,glitch=false){
  if(echoSessionFlags.has(key)) return;
  echoSessionFlags.add(key);
  echo(text,glitch);
}
function echo(text,glitch=false){
  if(!text)return;
  const layer=$("#echoLayer");
  $("#echoState").textContent="OBSERVED";

  const t=document.createElement("article");
  t.className=`echo-toast${glitch?" glitch":""}`;
  t.innerHTML=`<div class="echo-toast__head"><b>E.C.H.O. // UNAUTHORIZED CHANNEL</b><div class="echo-toast__tools"><span>${observerId}</span><button class="echo-toast__close" type="button" aria-label="Fechar mensagem do E.C.H.O." title="Fechar">×</button></div></div><p>${esc(text)}</p>`;
  layer.append(t);

  const dismiss=()=>dismissEchoToast(t);
  $(".echo-toast__close",t).addEventListener("click",e=>{e.stopPropagation();dismiss();});
  bindEchoSwipe(t);
  t._echoTimer=setTimeout(dismiss,7600);
}
function dismissEchoToast(t){
  if(!t||t.dataset.dismissed==="true")return;
  t.dataset.dismissed="true";
  clearTimeout(t._echoTimer);
  t.classList.remove("is-dragging");
  t.classList.add("is-dismissing");
  setTimeout(()=>{
    t.remove();
    if(!$("#echoLayer .echo-toast")) $("#echoState").textContent="UNKNOWN";
  },190);
}
function bindEchoSwipe(t){
  let pointerId=null,startY=0,dy=0;

  t.addEventListener("pointerdown",e=>{
    if(e.target.closest(".echo-toast__close")||t.dataset.dismissed==="true")return;
    pointerId=e.pointerId;
    startY=e.clientY;
    dy=0;
    t.classList.add("is-dragging");
    try{t.setPointerCapture(pointerId)}catch{}
  });

  t.addEventListener("pointermove",e=>{
    if(pointerId!==e.pointerId||t.dataset.dismissed==="true")return;
    dy=Math.min(0,e.clientY-startY);
    t.style.transform=`translateY(${dy}px)`;
    t.style.opacity=String(Math.max(.2,1-Math.abs(dy)/125));
  });

  const finish=e=>{
    if(pointerId!==e.pointerId)return;
    try{t.releasePointerCapture(pointerId)}catch{}
    pointerId=null;
    t.classList.remove("is-dragging");
    if(dy<=-44){
      dismissEchoToast(t);
      return;
    }
    t.classList.add("is-restoring");
    t.style.transform="";
    t.style.opacity="";
    setTimeout(()=>t.classList.remove("is-restoring"),180);
  };

  t.addEventListener("pointerup",finish);
  t.addEventListener("pointercancel",finish);
}
function timestampMs(v){
  if(!v)return 0; const d=v?.toDate?v.toDate():new Date(v); const n=d.getTime(); return Number.isNaN(n)?0:n;
}
function formatDate(v){
  if(!v)return "UNKNOWN TIME"; const d=v?.toDate?v.toDate():new Date(v); if(Number.isNaN(d.getTime()))return "UNKNOWN TIME"; return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}).format(d);
}
function random(a){return a[Math.floor(Math.random()*a.length)]}
function esc(v=""){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
