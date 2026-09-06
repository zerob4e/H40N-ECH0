let firebaseModulePromise = null;
function configured(){
  const c = window.MIRROR_FIREBASE_CONFIG || {};
  return Boolean(c.apiKey && c.projectId && !String(c.apiKey).includes("PASTE_") && !String(c.projectId).includes("PASTE_"));
}
async function getFirebase(){
  if(location.protocol === "file:" || !configured()) return null;
  if(!firebaseModulePromise) firebaseModulePromise = import("./firebase.js");
  const mod = await firebaseModulePromise;
  return mod.getFirebase();
}
const $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
const login=$("#login"), panel=$("#panel"), content=$("#adminContent"), logout=$("#logout");
let fb=null, user=null, activeTab="transmissions";
let transmissionCache=[], thoughtCache=[], echoCache=[];
let selectedThoughtId=null;
const routes={
  transmissions:["TRANSMISSIONS","FILTRA O RUÍDO. PRESERVA O QUE IMPORTA."],
  thoughts:["THOUGHTS","FRAGMENTOS. CONTEXTO. CONTINUIDADE."],
  echo:["E.C.H.O. / BROADCAST","VOZES ATRAVESSAM BARREIRAS."],
  system:["SYSTEM STATUS","NÓS EM SINCRONIA. IDEIAS SEM FRONTEIRAS."]
};

startClock();
if(!configured()) $("#loginStatus").textContent="FIREBASE_CONFIG_NOT_SET";

$("#loginForm").onsubmit=async e=>{
  e.preventDefault();
  const fd=new FormData(e.currentTarget), status=$("#loginStatus");
  status.textContent="AUTHENTICATING...";
  try{
    fb=await getFirebase();
    if(!fb) throw Error("FIREBASE_CONFIG_NOT_SET");
    const cred=await fb.authMod.signInWithEmailAndPassword(fb.auth,String(fd.get("email")),String(fd.get("password")));
    user=cred.user;
    if(!await isAdmin()){
      await fb.authMod.signOut(fb.auth);
      throw Error("ADMIN_CLEARANCE_REQUIRED");
    }
    status.textContent="ACCESS GRANTED";
    login.hidden=true;
    login.style.display="none";
    panel.hidden=false;
    panel.style.removeProperty("display");
    $("#syncLabel").textContent="SYNC: ACTIVE";
    $("#operatorTop").textContent="OPERATOR: AUTHORIZED";
    $("#bottomOperator").textContent="CONTROL NODE // AUTHORIZED";
    $("#firebaseState").textContent="ACTIVE";
    await refreshCaches();
    await render();
  }catch(err){
    status.textContent=humanError(err);
  }
};

logout.onclick=async()=>{ if(fb) await fb.authMod.signOut(fb.auth); location.reload(); };
$$('[data-tab]').forEach(b=>b.onclick=async()=>{
  $$('[data-tab]').forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  activeTab=b.dataset.tab;
  updateRoute();
  await render();
});

async function isAdmin(){
  const {doc,getDoc}=fb.dbMod;
  return (await getDoc(doc(fb.db,"admins",user.uid))).exists();
}

async function refreshCaches(){
  const {collection,getDocs}=fb.dbMod;
  const [tSnap,thSnap,eSnap]=await Promise.all([
    getDocs(collection(fb.db,"transmissions")),
    getDocs(collection(fb.db,"thoughts")),
    getDocs(collection(fb.db,"echo_notifications"))
  ]);
  transmissionCache=tSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>timestampMs(b.createdAt)-timestampMs(a.createdAt));
  thoughtCache=thSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
  echoCache=eSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>timestampMs(b.createdAt)-timestampMs(a.createdAt));
  updateCounts();
}

function updateCounts(){
  const pending=transmissionCache.filter(x=>x.status==="pending").length;
  const published=thoughtCache.filter(x=>x.published===true).length;
  const activeEcho=echoCache.filter(x=>x.active===true).length;
  $("#navPending").textContent=pending;
  $("#navThoughts").textContent=published;
  $("#navEcho").textContent=activeEcho;
}

function updateRoute(){
  const [name,motto]=routes[activeTab]||routes.transmissions;
  $("#workspaceRoute").textContent=name;
  $("#workspaceMotto").textContent=motto;
}

async function render(){
  content.innerHTML='<div class="control-loading">SYNCING CONTROL DATA...</div>';
  try{
    if(activeTab==="transmissions") renderTransmissions();
    else if(activeTab==="thoughts") renderThoughts();
    else if(activeTab==="echo") renderEcho();
    else renderSystem();
  }catch(err){ content.innerHTML=`<pre class="system-terminal">${esc(err.message||String(err))}</pre>`; }
}

function renderTransmissions(){
  const pending=transmissionCache.filter(x=>x.status==="pending").length;
  const approved=transmissionCache.filter(x=>x.status==="approved").length;
  const rejected=transmissionCache.filter(x=>x.status==="rejected").length;
  const archived=transmissionCache.filter(x=>x.status==="archived").length;
  content.innerHTML=`
    <div class="admin-kpis">
      ${kpi("PENDING TRANSMISSIONS",pending,"aguardando análise")}
      ${kpi("APPROVED",approved,"visíveis no SIGNAL")}
      ${kpi("REJECTED",rejected,"retidas pelo operador")}
      ${kpi("ARCHIVED",archived,"fora da fila ativa")}
    </div>
    <section class="operator-panel">
      <header class="operator-panel__head">
        <div><span class="operator-panel__eyebrow">COMMUNITY RELAY / MODERATION QUEUE</span><h2>TRANSMISSIONS // CONTROL</h2><p>SUBMISSÕES DOS OBSERVADORES — ACESSO DE OPERADOR</p></div>
        <div class="operator-tools"><input id="txSearch" placeholder="buscar transmissões..."><select id="txStatus"><option value="pending">PENDENTES</option><option value="all">TODAS</option><option value="approved">APROVADAS</option><option value="rejected">REJEITADAS</option><option value="archived">ARQUIVADAS</option></select></div>
      </header>
      <div id="txTable"></div>
    </section>`;
  const search=$("#txSearch"), status=$("#txStatus");
  const draw=()=>drawTransmissions(search.value,status.value);
  search.oninput=draw; status.onchange=draw; draw();
}

function drawTransmissions(term,status){
  const q=String(term||"").toLowerCase().trim();
  const rows=transmissionCache.filter(m=>(status==="all"||m.status===status)&&(!q||`${m.type} ${m.alias} ${m.observerId} ${m.body}`.toLowerCase().includes(q)));
  $("#txTable").innerHTML=rows.length?`<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>TIPO</th><th>ALIAS</th><th>OBSERVER ID</th><th>TRANSMISSÃO</th><th>DATA / HORA</th><th>STATUS</th><th>AÇÕES</th></tr></thead><tbody>${rows.map(m=>`<tr><td>${esc(m.type||"MESSAGE")}</td><td>${esc(m.alias||"ANONYMOUS")}</td><td>${esc(m.observerId||"UNKNOWN")}</td><td class="message-cell"><button class="message-open" data-view-tx="${m.id}" title="Abrir transmissão completa"><span>${esc(m.body||"")}</span><small>OPEN FULL MESSAGE</small></button></td><td>${formatDate(m.createdAt)}</td><td><span class="status-pill ${esc(m.status||"pending")}">${esc(String(m.status||"pending").toUpperCase())}</span></td><td><div class="row-actions"><button class="view" data-view-tx="${m.id}">OPEN</button>${m.status!=="approved"?`<button class="approve" data-mod="${m.id}" data-state="approved">APPROVE</button>`:""}${m.status!=="rejected"?`<button class="reject" data-mod="${m.id}" data-state="rejected">REJECT</button>`:""}${m.status!=="archived"?`<button data-mod="${m.id}" data-state="archived">ARCHIVE</button>`:""}<button class="delete" data-delete-tx="${m.id}">DELETE</button></div></td></tr>`).join("")}</tbody></table></div>`:'<div class="admin-empty">NO TRANSMISSIONS MATCH THIS FILTER</div>';
  $$('[data-mod]').forEach(b=>b.onclick=()=>moderate(b.dataset.mod,b.dataset.state));
  $$('[data-view-tx]').forEach(b=>b.onclick=()=>openTransmission(b.dataset.viewTx));
  $$('[data-delete-tx]').forEach(b=>b.onclick=()=>deleteTransmission(b.dataset.deleteTx));
}

function openTransmission(id){
  const m=transmissionCache.find(x=>x.id===id);
  if(!m) return;
  closeTransmissionReader();
  const modal=document.createElement("div");
  modal.id="transmissionReader";
  modal.className="transmission-reader-backdrop";
  modal.innerHTML=`
    <section class="app-window transmission-reader" role="dialog" aria-modal="true" aria-labelledby="txReaderTitle">
      <header class="window-titlebar">
        <div class="window-titlebar__title"><i class="window-led"></i><strong>TRANSMISSION READER</strong><small>${esc(m.id)}</small></div>
        <div class="window-controls"><button type="button" data-close-tx tabindex="-1">—</button><button type="button" tabindex="-1">□</button><button type="button" data-close-tx aria-label="Fechar">×</button></div>
      </header>
      <div class="transmission-reader__content">
        <div class="transmission-reader__heading">
          <div><span class="operator-panel__eyebrow">COMMUNITY RELAY / FULL PAYLOAD</span><h2 id="txReaderTitle">${esc(m.type||"MESSAGE")} // ${esc(m.alias||"ANONYMOUS")}</h2></div>
          <span class="status-pill ${esc(m.status||"pending")}">${esc(String(m.status||"pending").toUpperCase())}</span>
        </div>
        <div class="transmission-reader__meta">
          <div><span>ALIAS</span><b>${esc(m.alias||"ANONYMOUS")}</b></div>
          <div><span>OBSERVER ID</span><b>${esc(m.observerId||"UNKNOWN")}</b></div>
          <div><span>TYPE</span><b>${esc(m.type||"MESSAGE")}</b></div>
          <div><span>RECEIVED</span><b>${formatDate(m.createdAt)}</b></div>
        </div>
        <div class="transmission-reader__label">FULL TRANSMISSION</div>
        <div class="transmission-reader__message">${esc(m.body||"")}</div>
        <div class="transmission-reader__footer">
          <div class="transmission-reader__hint">Leia o payload completo antes de alterar o status da transmissão.</div>
          <div class="transmission-reader__actions">
            ${m.status!=="approved"?`<button class="admin-action primary" data-reader-state="approved">APPROVE</button>`:""}
            ${m.status!=="rejected"?`<button class="admin-action" data-reader-state="rejected">REJECT</button>`:""}
            ${m.status!=="archived"?`<button class="admin-action" data-reader-state="archived">ARCHIVE</button>`:""}
            <button class="admin-action danger" data-reader-delete>DELETE</button>
          </div>
        </div>
      </div>
    </section>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-close-tx]').forEach(b=>b.onclick=closeTransmissionReader);
  modal.addEventListener('mousedown',e=>{ if(e.target===modal) closeTransmissionReader(); });
  modal.querySelectorAll('[data-reader-state]').forEach(b=>b.onclick=async()=>{
    await moderate(id,b.dataset.readerState);
    closeTransmissionReader();
  });
  modal.querySelector('[data-reader-delete]').onclick=async()=>{
    const deleted=await deleteTransmission(id);
    if(deleted) closeTransmissionReader();
  };
  document.addEventListener('keydown',transmissionReaderEscape);
}

function transmissionReaderEscape(e){ if(e.key==="Escape") closeTransmissionReader(); }
function closeTransmissionReader(){
  document.removeEventListener('keydown',transmissionReaderEscape);
  document.getElementById('transmissionReader')?.remove();
}

async function deleteTransmission(id){
  const m=transmissionCache.find(x=>x.id===id);
  if(!m) return false;
  const label=`${m.type||"MESSAGE"} // ${m.alias||"ANONYMOUS"}`;
  if(!confirm(`DELETE TRANSMISSION PERMANENTLY?

${label}

Essa ação remove a mensagem inclusive do SIGNAL público caso ela já esteja aprovada.`)) return false;
  const {doc,deleteDoc}=fb.dbMod;
  await deleteDoc(doc(fb.db,"transmissions",id));
  await refreshCaches();
  if(activeTab==="transmissions") renderTransmissions();
  return true;
}

async function moderate(id,status){
  const {doc,updateDoc,serverTimestamp}=fb.dbMod;
  await updateDoc(doc(fb.db,"transmissions",id),{status,moderatedAt:serverTimestamp(),moderatedBy:user.uid});
  await refreshCaches(); renderTransmissions();
}

function renderThoughts(){
  if(selectedThoughtId && !thoughtCache.some(x=>x.id===selectedThoughtId)) selectedThoughtId=null;
  const selected=thoughtCache.find(x=>x.id===selectedThoughtId)||null;
  content.innerHTML=`<section class="operator-panel thought-admin">
    <aside class="thought-admin-listpane">
      <div class="thought-admin-listhead"><span class="operator-panel__eyebrow">NOAH COGNITIVE ARCHIVE</span><h2>THOUGHTS</h2><p>${thoughtCache.length} FRAGMENTOS NO NODE</p></div>
      <button id="newThought" class="thought-new">+ NOVO FRAGMENTO</button>
      <div class="thought-admin-list">${thoughtCache.length?thoughtCache.map(t=>`<button class="thought-admin-item ${t.id===selectedThoughtId?'active':''}" data-thought="${t.id}"><span><strong>${esc(t.title||"UNTITLED")}</strong><small>${esc(t.meta||"NO CLASSIFICATION")}</small></span><em>${t.published?'PUBLIC':'DRAFT'}</em></button>`).join(""):'<div class="admin-empty">NO COGNITIVE FRAGMENTS</div>'}</div>
    </aside>
    <article class="thought-admin-editor">
      <header class="thought-editor-head"><div><span>${selected?'EDITING FRAGMENT':'NEW FRAGMENT'}</span><h3 id="thoughtEditorTitle">${selected?esc(selected.title||selected.id):'UNSAVED MEMORY'}</h3></div><span>${selected?esc(selected.id):'LOCAL BUFFER'}</span></header>
      <form id="thoughtForm" class="thought-form">
        <div class="thought-form-grid">
          <div class="admin-field"><label>TITLE</label><input name="title" value="${escAttr(selected?.title||'')}" placeholder="Memory_0024" required></div>
          <div class="admin-field"><label>CLASSIFICATION</label><input name="meta" value="${escAttr(selected?.meta||'')}" placeholder="IDENTITY · 51%" required></div>
          <div class="admin-field"><label>ORDER</label><input name="order" type="number" value="${Number(selected?.order??100)}"></div>
        </div>
        <div class="admin-field thought-body-field"><label>BODY / COGNITIVE FRAGMENT</label><textarea name="body" placeholder="Digite o pensamento do Noah..." required>${esc(selected?.body||'')}</textarea></div>
        <div class="thought-editor-actions">
          ${selected?'<button type="button" class="admin-action danger" id="deleteThought">DELETE FRAGMENT</button>':''}
          <button type="button" class="admin-action" id="saveDraft">SALVAR RASCUNHO</button>
          <button type="button" class="admin-action primary" id="publishThought">PUBLICAR</button>
        </div>
      </form>
    </article>
  </section>`;
  $("#newThought").onclick=()=>{selectedThoughtId=null;renderThoughts();};
  $$('[data-thought]').forEach(b=>b.onclick=()=>{selectedThoughtId=b.dataset.thought;renderThoughts();});
  $("#saveDraft").onclick=()=>saveThought(false);
  $("#publishThought").onclick=()=>saveThought(true);
  if($("#deleteThought")) $("#deleteThought").onclick=()=>deleteThought(selectedThoughtId);
}

async function saveThought(published){
  const form=$("#thoughtForm");
  if(!form.reportValidity()) return;
  const fd=new FormData(form);
  const payload={title:String(fd.get("title")).trim(),meta:String(fd.get("meta")).trim(),body:String(fd.get("body")).trim(),order:Number(fd.get("order")||100),published,updatedAt:fb.dbMod.serverTimestamp()};
  const {collection,addDoc,doc,updateDoc,serverTimestamp}=fb.dbMod;
  if(selectedThoughtId){
    await updateDoc(doc(fb.db,"thoughts",selectedThoughtId),payload);
  }else{
    const ref=await addDoc(collection(fb.db,"thoughts"),{...payload,createdAt:serverTimestamp()}); selectedThoughtId=ref.id;
  }
  await refreshCaches(); renderThoughts();
}

async function deleteThought(id){
  if(!id||!confirm("DELETE THIS COGNITIVE FRAGMENT?")) return;
  const {doc,deleteDoc}=fb.dbMod;
  await deleteDoc(doc(fb.db,"thoughts",id)); selectedThoughtId=null; await refreshCaches(); renderThoughts();
}

function renderEcho(){
  const active=echoCache.filter(x=>x.active).length;
  content.innerHTML=`<div class="echo-admin">
    <section class="operator-panel echo-composer">
      <header class="operator-panel__head"><div><span class="operator-panel__eyebrow">UNAUTHORIZED CHANNEL CONTROL</span><h2>E.C.H.O. // BROADCAST</h2><p>CANAL DE INTERFERÊNCIA NO MIRROR-07</p></div><span class="status-pill ${active?'approved':'archived'}">CHANNEL: ${active?'ACTIVE':'SILENT'}</span></header>
      <div class="echo-composer__body">
        <div class="admin-field"><label>MESSAGE</label><textarea id="echoText" maxlength="240" placeholder="Você já tem informação suficiente para estar errado."></textarea></div>
        <div class="echo-composer__row"><select id="echoStateSelect"><option value="true">ACTIVE / PUBLIC RELAY</option><option value="false">DISABLED / ARCHIVE ONLY</option></select><button id="sendEcho" class="echo-transmit">TRANSMIT</button></div>
        <div class="echo-note">Mensagens marcadas como ACTIVE entram no pool público de interferências do E.C.H.O. O MIRROR pode exibi-las aos observadores durante a sessão.</div>
      </div>
    </section>
    <section class="operator-panel echo-history-panel">
      <header class="operator-panel__head"><div><span class="operator-panel__eyebrow">BROADCAST LOG</span><h2>TRANSMISSION HISTORY</h2><p>${echoCache.length} REGISTROS</p></div></header>
      <div class="echo-history">${echoCache.length?echoCache.map(e=>`<article class="echo-entry"><div class="echo-entry__meta"><span>${e.active?'ACTIVE':'DISABLED'} · ${esc(e.id)}</span><span>${formatDate(e.createdAt)}</span></div><p>${esc(e.text||'')}</p><div class="echo-entry__actions"><button data-toggle-echo="${e.id}" data-active="${e.active?'false':'true'}">${e.active?'DISABLE':'ENABLE'}</button><button data-delete-echo="${e.id}">DELETE</button></div></article>`).join(""):'<div class="admin-empty">NO BROADCASTS RECORDED</div>'}</div>
    </section>
  </div>`;
  $("#sendEcho").onclick=createEcho;
  $$('[data-toggle-echo]').forEach(b=>b.onclick=()=>toggleEcho(b.dataset.toggleEcho,b.dataset.active==="true"));
  $$('[data-delete-echo]').forEach(b=>b.onclick=()=>deleteEcho(b.dataset.deleteEcho));
}

async function createEcho(){
  const text=$("#echoText").value.trim(); if(!text) return;
  const active=$("#echoStateSelect").value==="true";
  const {collection,addDoc,serverTimestamp}=fb.dbMod;
  await addDoc(collection(fb.db,"echo_notifications"),{text,active,createdAt:serverTimestamp(),createdBy:user.uid});
  await refreshCaches(); renderEcho();
}
async function toggleEcho(id,active){
  const {doc,updateDoc}=fb.dbMod; await updateDoc(doc(fb.db,"echo_notifications",id),{active}); await refreshCaches(); renderEcho();
}
async function deleteEcho(id){
  if(!confirm("DELETE THIS BROADCAST?")) return;
  const {doc,deleteDoc}=fb.dbMod; await deleteDoc(doc(fb.db,"echo_notifications",id)); await refreshCaches(); renderEcho();
}

function renderSystem(){
  const pending=transmissionCache.filter(x=>x.status==="pending").length;
  const approved=transmissionCache.filter(x=>x.status==="approved").length;
  const published=thoughtCache.filter(x=>x.published).length;
  const activeEcho=echoCache.filter(x=>x.active).length;
  content.innerHTML=`<div class="admin-kpis">${kpi("PENDING",pending,"transmissions")}${kpi("PUBLIC SIGNAL",approved,"approved messages")}${kpi("PUBLISHED THOUGHTS",published,"cognitive fragments")}${kpi("E.C.H.O. SIGNAL",activeEcho,"active broadcasts")}</div>
  <div class="system-grid">
    <section class="operator-panel system-large"><header class="operator-panel__head"><div><span class="operator-panel__eyebrow">NODE TELEMETRY</span><h2>SYSTEM STATUS</h2><p>MONITORAMENTO DO CONTROL NODE</p></div><span class="status-pill approved">ONLINE</span></header><div class="system-list">
      ${systemLine("FIREBASE LINK","ACTIVE",window.MIRROR_FIREBASE_CONFIG?.projectId||"UNKNOWN")}
      ${systemLine("AUTHENTICATION","AUTHORIZED",user?.email||"OPERATOR")}
      ${systemLine("OPERATOR UID",user?.uid||"UNKNOWN","ADMIN CLEARANCE")}
      ${systemLine("PUBLIC MIRROR","CONNECTED","READ-ONLY NODE")}
      ${systemLine("TRANSMISSION QUEUE",String(pending).padStart(2,"0"),"PENDING REVIEW")}
      ${systemLine("E.C.H.O. CHANNEL",activeEcho?"ACTIVE":"SILENT",`${activeEcho} LIVE SIGNALS`)}
    </div></section>
    <section class="operator-panel system-log"><header class="operator-panel__head"><div><span class="operator-panel__eyebrow">CONTROL LOG</span><h2>NODE OUTPUT</h2><p>LOCAL OPERATOR SESSION</p></div></header><pre class="system-terminal">[ OK ] firebase relay linked
[ OK ] admin clearance validated
[ OK ] firestore collections mounted
[ OK ] observer transmissions indexed
[ OK ] cognitive archive available
[ ${activeEcho?'OK':'--'} ] echo broadcast channel ${activeEcho?'active':'silent'}

operator:// ${esc(user?.email||'unknown')}
node:// ${esc(window.MIRROR_FIREBASE_CONFIG?.projectId||'unknown')}
mode:// INTERNAL CONTROL

"Acesso não é conhecimento.
Conhecimento não é verdade."</pre></section>
  </div>`;
}

function kpi(label,value,note){return `<div class="admin-kpi"><span>${label}</span><b>${String(value).padStart(2,"0")}</b><small>${note}</small></div>`;}
function systemLine(label,value,note){return `<div class="system-line"><span>${label}</span><b>${esc(value)}</b><em>${esc(note)}</em></div>`;}
function startClock(){
  const tick=()=>{ const d=new Date(); $("#adminClock").textContent=d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}); };
  tick(); setInterval(tick,15000);
}
function humanError(err){
  const m=String(err?.message||err||"AUTH_FAILED");
  if(m.includes("invalid-credential")||m.includes("wrong-password")||m.includes("user-not-found")) return "ACCESS DENIED // INVALID CREDENTIALS";
  if(m.includes("ADMIN_CLEARANCE_REQUIRED")) return "ACCESS DENIED // ADMIN CLEARANCE REQUIRED";
  if(m.includes("FIREBASE_CONFIG_NOT_SET")) return "FIREBASE RELAY NOT CONFIGURED";
  return m.replace(/^Firebase:\s*/i,"").toUpperCase();
}
function timestampMs(v){ if(!v)return 0; const d=v.toDate?v.toDate():new Date(v); const n=d.getTime(); return Number.isNaN(n)?0:n; }
function formatDate(v){ if(!v)return"NO TIMESTAMP"; const d=v.toDate?v.toDate():new Date(v); return d.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}); }
function esc(v=""){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function escAttr(v=""){return esc(v).replace(/`/g,"&#96;");}
