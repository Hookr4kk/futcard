/* =========================================================
   FUTCARD — mini-gacha de futebol
   Dados: football-data.org · Login: Google (Firebase Auth) · BD: Firestore
   ---------------------------------------------------------
   PREENCHA O TOKEN ABAIXO ANTES DE HOSPEDAR (a config do Firebase já está preenchida):
========================================================= */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDQP_E9uyZpAbxW6DWDHL2ISQ4tskuj7kI",
  authDomain: "futcard-f42da.firebaseapp.com",
  projectId: "futcard-f42da",
  storageBucket: "futcard-f42da.firebasestorage.app",
  messagingSenderId: "92904162319",
  appId: "1:92904162319:web:c1edadecfb352bef348f7a"
};
// O token da football-data.org NÃO fica mais aqui — ele mora só no servidor
// (variável de ambiente FOOTBALL_DATA_TOKEN na Vercel). O front-end chama a
// function de proxy abaixo em API_BASE.
// Preencha com a URL do seu projeto na Vercel (ex: https://futcard.vercel.app)
const API_BASE = "https://futcard-seven.vercel.app";
/* ========================================================= */

const COMPETITIONS = [
  { code:'PL',  name:'Premier League' },
  { code:'PD',  name:'La Liga' },
  { code:'BL1', name:'Bundesliga' },
  { code:'SA',  name:'Serie A' },
  { code:'FL1', name:'Ligue 1' },
  { code:'BSA', name:'Brasileirão Série A' },
  { code:'DED', name:'Eredivisie' },
  { code:'PPL', name:'Primeira Liga' },
];

const LENDARIO_SET = ['real madrid','barcelona','manchester city','manchester united','manchester utd','liverpool','bayern','paris saint-germain','psg','juventus'];
const GOLD_SET = ['arsenal','chelsea','tottenham','atlético de madrid','atletico madrid','atlético madrid','borussia dortmund','internazionale','inter milan','ac milan',' milan','napoli','marseille','ajax','porto','benfica','sporting cp','flamengo','palmeiras','corinthians','são paulo','sao paulo','sevilla','roma','lazio','newcastle','west ham','villarreal','bayer leverkusen','rb leipzig','monaco','olympique lyonnais','lyon'];

const TIER_LABEL = { bronze:'Bronze', silver:'Prata', gold:'Ouro', lendario:'Lendário' };
const TIER_ORDER = ['lendario','gold','silver','bronze'];
const TIER_COIN_VALUE = { bronze:10, silver:25, gold:75, lendario:300 };
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

const FLAGS = {
  brazil:'🇧🇷', argentina:'🇦🇷', france:'🇫🇷', germany:'🇩🇪', spain:'🇪🇸', england:'🏴', portugal:'🇵🇹', italy:'🇮🇹',
  netherlands:'🇳🇱', belgium:'🇧🇪', croatia:'🇭🇷', uruguay:'🇺🇾', colombia:'🇨🇴', senegal:'🇸🇳', morocco:'🇲🇦',
  nigeria:'🇳🇬', ghana:'🇬🇭', cameroon:'🇨🇲', 'ivory coast':'🇨🇮', "côte d'ivoire":'🇨🇮', egypt:'🇪🇬', algeria:'🇩🇿',
  tunisia:'🇹🇳', poland:'🇵🇱', serbia:'🇷🇸', switzerland:'🇨🇭', austria:'🇦🇹', denmark:'🇩🇰', sweden:'🇸🇪', norway:'🇳🇴',
  wales:'🏴', scotland:'🏴', 'republic of ireland':'🇮🇪', ireland:'🇮🇪', turkey:'🇹🇷', ukraine:'🇺🇦', 'czech republic':'🇨🇿',
  japan:'🇯🇵', 'south korea':'🇰🇷', korea:'🇰🇷', usa:'🇺🇸', 'united states':'🇺🇸', mexico:'🇲🇽', chile:'🇨🇱', paraguay:'🇵🇾',
  ecuador:'🇪🇨', peru:'🇵🇪', venezuela:'🇻🇪', canada:'🇨🇦', australia:'🇦🇺', greece:'🇬🇷', hungary:'🇭🇺', romania:'🇷🇴',
  slovakia:'🇸🇰', slovenia:'🇸🇮', 'bosnia and herzegovina':'🇧🇦', albania:'🇦🇱', iceland:'🇮🇸', finland:'🇫🇮', russia:'🇷🇺',
  mali:'🇲🇱', guinea:'🇬🇳', gabon:'🇬🇦', zambia:'🇿🇲', 'south africa':'🇿🇦', 'dr congo':'🇨🇩', 'cape verde':'🇨🇻',
};

const SLOTS_442 = [
  { key:'GK',  bucket:'GK',  label:'GOL', x:50, y:92 },
  { key:'DEF1',bucket:'DEF', label:'ZAG', x:20, y:74 },
  { key:'DEF2',bucket:'DEF', label:'ZAG', x:40, y:78 },
  { key:'DEF3',bucket:'DEF', label:'ZAG', x:60, y:78 },
  { key:'DEF4',bucket:'DEF', label:'ZAG', x:80, y:74 },
  { key:'MID1',bucket:'MID', label:'MEI', x:25, y:50 },
  { key:'MID2',bucket:'MID', label:'MEI', x:50, y:46 },
  { key:'MID3',bucket:'MID', label:'MEI', x:75, y:50 },
  { key:'FWD1',bucket:'FWD', label:'ATA', x:22, y:20 },
  { key:'FWD2',bucket:'FWD', label:'ATA', x:50, y:14 },
  { key:'FWD3',bucket:'FWD', label:'ATA', x:78, y:20 },
];

const state = {
  db: null,
  user: null,
  teamPool: [],
  collection: [],
  squad: {},
  coins: 0,
  activeTab: 'pack',
  collectionFilter: 'all',
  collectionSearch: '',
  collectionSort: 'recent',
  busy: false,
  ready: false,
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31 + s.charCodeAt(i))|0; } return Math.abs(h); }

function isConfigured(){
  return !FIREBASE_CONFIG.apiKey.includes('COLE_') && !API_BASE.includes('COLE_');
}

function computeTier(name){
  const n = name.toLowerCase();
  if (LENDARIO_SET.some(k => n.includes(k))) return 'lendario';
  if (GOLD_SET.some(k => n.includes(k))) return 'gold';
  return (hashStr(name) % 10 < 4) ? 'silver' : 'bronze';
}

function flagFor(nationality){
  if(!nationality) return '⚽';
  return FLAGS[nationality.toLowerCase()] || '⚽';
}

function bucketFor(position){
  if(!position) return 'FWD';
  const p = position.toLowerCase();
  if (p.includes('goal')) return 'GK';
  if (p.includes('back') || p.includes('defence') || p.includes('defender') || p.includes('centre-back')) return 'DEF';
  if (p.includes('midfield')) return 'MID';
  return 'FWD';
}

// O front-end nunca fala direto com a football-data.org: ele chama a Vercel
// Function em API_BASE, que guarda o token no servidor e repassa a chamada.
async function fdFetch(path){
  const res = await fetch(API_BASE + '/api/football?path=' + encodeURIComponent(path));
  if (res.status === 429) throw new Error('limite de chamadas da API atingido, espera um pouco');
  if (res.status === 403) throw new Error('não disponível no plano gratuito');
  if (!res.ok) throw new Error('erro HTTP ' + res.status);
  return res.json();
}

async function buildTeamPoolFromApi(log){
  let pool = [];
  for(const comp of COMPETITIONS){
    try{
      const data = await fdFetch('/competitions/' + comp.code + '/teams');
      const teams = (data.teams || []).map(t => ({
        id: t.id, name: t.name, crest: t.crest || '', competition: comp.name, tier: computeTier(t.name)
      }));
      pool = pool.concat(teams);
      log('✓ ' + comp.name + ': ' + teams.length + ' times');
    }catch(e){
      log('✗ ' + comp.name + ' indisponível (' + e.message + ')');
    }
    await sleep(500);
  }
  return pool;
}

// Cache compartilhado no Firestore — evita todo mundo bater na API toda vez
async function getTeamPool(log){
  const metaRef = state.db.collection('meta').doc('teamPool');
  try{
    const snap = await metaRef.get();
    if(snap.exists && snap.data().teams && snap.data().teams.length && (Date.now() - snap.data().updatedAt < CACHE_TTL_MS)){
      log('✓ Usando lista de times em cache (compartilhada)');
      return snap.data().teams;
    }
  }catch(e){ log('⚠ Sem acesso ao cache de times (' + e.message + ')'); }

  log('Cache vencido ou vazio — buscando elencos das ligas...');
  const pool = await buildTeamPoolFromApi(log);
  if(pool.length){
    try{ await metaRef.set({ teams: pool, updatedAt: Date.now() }); }
    catch(e){ log('⚠ Não consegui salvar o cache (' + e.message + ')'); }
  }
  return pool;
}

// Cache do elenco de cada clube — só busca de novo depois de 7 dias
async function getTeamSquad(team, log){
  const ref = state.db.collection('squadCache').doc(String(team.id));
  try{
    const snap = await ref.get();
    if(snap.exists && snap.data().squad && snap.data().squad.length && (Date.now() - snap.data().updatedAt < CACHE_TTL_MS)){
      return snap.data();
    }
  }catch(e){ /* segue pro fetch */ }

  const data = await fdFetch('/teams/' + team.id);
  const squad = (data.squad || []).filter(p => p.position).map(p => ({
    id: p.id, name: p.name, position: p.position, nationality: p.nationality || ''
  }));
  const payload = { squad, crest: data.crest || team.crest || '', updatedAt: Date.now() };
  try{ await ref.set(payload); }catch(e){ /* cache é best-effort */ }
  return payload;
}

function rollTier(){
  const r = Math.random() * 100;
  if (r < 3) return 'lendario';
  if (r < 15) return 'gold';
  if (r < 45) return 'silver';
  return 'bronze';
}

function pickTierWithFallback(){
  let idx = TIER_ORDER.indexOf(rollTier());
  while(idx < TIER_ORDER.length){
    if (state.teamPool.some(t => t.tier === TIER_ORDER[idx])) return TIER_ORDER[idx];
    idx++;
  }
  return 'bronze';
}

function pickRandomFromTier(tier){
  const pool = state.teamPool.filter(t => t.tier === tier);
  return pool[Math.floor(Math.random() * pool.length)];
}

async function loadCollection(){
  const snap = await state.db.collection('pulls').where('owner', '==', state.user.uid).get();
  state.collection = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.pulledAt - a.pulledAt);
}

async function loadSquad(){
  const doc = await state.db.collection('squads').doc(state.user.uid).get();
  state.squad = doc.exists ? (doc.data().slots || {}) : {};
}

async function saveSquad(){
  await state.db.collection('squads').doc(state.user.uid).set({ slots: state.squad });
}

async function loadProfile(){
  const doc = await state.db.collection('profiles').doc(state.user.uid).get();
  state.coins = doc.exists ? (doc.data().coins || 0) : 0;
}

async function addCoins(amount){
  state.coins += amount;
  try{ await state.db.collection('profiles').doc(state.user.uid).set({ coins: state.coins }); }
  catch(e){ /* best-effort */ }
}

/* ---------------- Auth flow ---------------- */
async function loginWithGoogle(){
  const errEl = document.getElementById('setupError');
  const btn = document.getElementById('googleBtn');
  if(errEl) errEl.textContent = '';
  if(btn) btn.disabled = true;
  try{
    const provider = new firebase.auth.GoogleAuthProvider();
    await firebase.auth().signInWithPopup(provider);
    // onAuthStateChanged cuida do resto
  }catch(e){
    if(errEl) errEl.textContent = 'Não consegui entrar com o Google: ' + e.message;
    if(btn) btn.disabled = false;
  }
}

function logout(){
  firebase.auth().signOut();
}

async function bootAfterLogin(user){
  state.user = user;
  const app = document.getElementById('app');
  app.innerHTML = '<div class="setup-card"><div class="setup-eyebrow">Carregando</div><h1 class="setup-title">Montando o <span>vestiário</span>...</h1><div class="setup-status" id="setupStatus"></div></div>';
  const statusEl = document.getElementById('setupStatus');
  const log = (msg) => { statusEl.innerHTML += '<div class="log-line">' + escapeHtml(msg) + '</div>'; statusEl.scrollTop = statusEl.scrollHeight; };

  state.teamPool = await getTeamPool(log);
  if(state.teamPool.length === 0){
    document.getElementById('app').innerHTML += '<div class="setup-error">Nenhuma liga carregou. Confira o FOOTBALL_DATA_TOKEN no código.</div>';
    return;
  }
  await loadCollection();
  await loadSquad();
  await loadProfile();
  state.ready = true;
  renderMain();
}

/* ---------------- Pack opening ---------------- */
async function openPack(){
  if(state.busy) return;
  state.busy = true;
  const btn = document.getElementById('packBtn');
  const revealArea = document.getElementById('revealArea');
  if(btn){ btn.disabled = true; btn.classList.add('rolling'); }
  revealArea.innerHTML = '<div class="rolling-msg">Abrindo o pacote...</div>';

  try{
    const tier = pickTierWithFallback();
    const team = pickRandomFromTier(tier);
    const teamData = await getTeamSquad(team, ()=>{});
    const squad = teamData.squad;
    if(!squad || squad.length === 0) throw new Error('elenco vazio, tenta de novo');
    const player = squad[Math.floor(Math.random() * squad.length)];

    const alreadyOwned = state.collection.some(c => c.playerId === player.id);

    if(alreadyOwned){
      const coinValue = TIER_COIN_VALUE[tier] || 10;
      await addCoins(coinValue);
      renderDuplicateReveal({ playerName: player.name, tier, coinValue });
      renderTabs();
      return;
    }

    const pull = {
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      nationality: player.nationality || '',
      teamId: team.id,
      teamName: team.name,
      teamCrest: teamData.crest || team.crest || '',
      competition: team.competition,
      tier: tier,
      owner: state.user.uid,
      pulledAt: Date.now(),
    };
    const ref = await state.db.collection('pulls').add(pull);
    pull.id = ref.id;
    state.collection.unshift(pull);
    renderReveal(pull);
    renderTabs();
  }catch(e){
    revealArea.innerHTML = '<div class="error-msg">Ih, deu ruim: ' + escapeHtml(e.message) + '</div>';
  }finally{
    if(btn){ btn.disabled = false; btn.classList.remove('rolling'); }
    state.busy = false;
  }
}

function cardHtml(p){
  return '' +
    '<div class="card tier-' + p.tier + '">' +
      '<div class="card-inner">' +
        '<div class="card-tier-label">' + TIER_LABEL[p.tier] + '</div>' +
        (p.teamCrest ? '<img class="card-crest" src="' + escapeHtml(p.teamCrest) + '" onerror="this.style.display=\'none\'">' : '') +
        '<div class="card-flag">' + flagFor(p.nationality) + '</div>' +
        '<div class="card-name">' + escapeHtml(p.playerName) + '</div>' +
        '<div class="card-pos">' + escapeHtml(p.position) + '</div>' +
        '<div class="card-foot"><span>' + escapeHtml(p.teamName) + '</span><b>' + escapeHtml(p.competition || '') + '</b></div>' +
      '</div>' +
    '</div>';
}

function renderReveal(pull){
  const revealArea = document.getElementById('revealArea');
  revealArea.innerHTML = cardHtml(pull) +
    '<div class="pull-again-row"><button class="btn btn-primary" id="againBtn">Abrir outro pacote</button></div>';
  document.getElementById('againBtn').addEventListener('click', openPack);
}

function renderDuplicateReveal(info){
  const revealArea = document.getElementById('revealArea');
  revealArea.innerHTML = '' +
    '<div class="dup-card tier-' + info.tier + '">' +
      '<div class="dup-card-inner">' +
        '<div class="dup-icon">🪙</div>' +
        '<div class="dup-title">Já tinha esse!</div>' +
        '<div class="dup-name">' + escapeHtml(info.playerName) + '</div>' +
        '<div class="dup-coins">+' + info.coinValue + ' moedas</div>' +
      '</div>' +
    '</div>' +
    '<div class="pull-again-row"><button class="btn btn-primary" id="againBtn">Abrir outro pacote</button></div>';
  document.getElementById('againBtn').addEventListener('click', openPack);
}

/* ---------------- Collection tab ---------------- */
const SORT_OPTIONS = [
  { key:'recent', label:'Mais recentes' },
  { key:'az', label:'Nome (A-Z)' },
  { key:'za', label:'Nome (Z-A)' },
  { key:'tier', label:'Raridade' },
  { key:'competition', label:'Campeonato' },
  { key:'team', label:'Clube (A-Z)' },
];
const TIER_RANK = { lendario:0, gold:1, silver:2, bronze:3 };

function sortCollectionList(list, sortKey){
  const sorted = list.slice();
  switch(sortKey){
    case 'az':
      sorted.sort((a,b) => a.playerName.localeCompare(b.playerName)); break;
    case 'za':
      sorted.sort((a,b) => b.playerName.localeCompare(a.playerName)); break;
    case 'tier':
      sorted.sort((a,b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9) || a.playerName.localeCompare(b.playerName)); break;
    case 'competition':
      sorted.sort((a,b) => (a.competition||'').localeCompare(b.competition||'') || a.playerName.localeCompare(b.playerName)); break;
    case 'team':
      sorted.sort((a,b) => (a.teamName||'').localeCompare(b.teamName||'') || a.playerName.localeCompare(b.playerName)); break;
    default: // 'recent'
      sorted.sort((a,b) => b.pulledAt - a.pulledAt);
  }
  return sorted;
}

function renderCollectionTab(container){
  const filters = [
    { key:'all', label:'Todos' }, { key:'lendario', label:'Lendário' },
    { key:'gold', label:'Ouro' }, { key:'silver', label:'Prata' }, { key:'bronze', label:'Bronze' },
  ];

  let list = state.collectionFilter === 'all' ? state.collection : state.collection.filter(p => p.tier === state.collectionFilter);

  const q = state.collectionSearch.trim().toLowerCase();
  if(q){
    list = list.filter(p =>
      (p.playerName||'').toLowerCase().includes(q) ||
      (p.teamName||'').toLowerCase().includes(q) ||
      (p.competition||'').toLowerCase().includes(q)
    );
  }

  list = sortCollectionList(list, state.collectionSort);

  let html = '<div class="collection-toolbar">' +
    '<input type="text" id="collectionSearchInput" class="search-input" placeholder="Buscar jogador, clube ou campeonato..." value="' + escapeHtml(state.collectionSearch) + '">' +
    '<div class="sort-row"><label for="collectionSortSelect" class="sort-label">Ordenar por</label><select id="collectionSortSelect" class="sort-select">' +
      SORT_OPTIONS.map(o => '<option value="' + o.key + '"' + (state.collectionSort === o.key ? ' selected' : '') + '>' + o.label + '</option>').join('') +
    '</select></div>' +
    '<div class="filter-row">';
  filters.forEach(f => {
    html += '<button class="chip' + (state.collectionFilter === f.key ? ' active' : '') + '" data-filter="' + f.key + '">' + f.label + '</button>';
  });
  html += '</div></div>';

  if(list.length === 0){
    html += '<div class="empty-state"><span class="ball">⚽</span>' +
      (state.collection.length === 0
        ? 'Nenhuma carta ainda por aqui.<br>Vai lá na aba "Pacote" e abre a sorte.'
        : 'Nenhuma carta encontrada com esses filtros.') +
      '</div>';
  } else {
    html += '<div class="collection-grid">';
    list.forEach(p => {
      html += '' +
        '<div class="mini-card tier-' + p.tier + '">' +
          '<div class="mini-card-inner">' +
            (p.teamCrest ? '<img class="mini-crest" src="' + escapeHtml(p.teamCrest) + '" onerror="this.style.display=\'none\'">' : '') +
            '<div class="mini-name">' + escapeHtml(p.playerName) + '</div>' +
            '<div class="mini-pos">' + escapeHtml(p.position) + '</div>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
  }
  container.innerHTML = html;
  container.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => { state.collectionFilter = btn.dataset.filter; renderCollectionTab(container); });
  });

  const searchInput = container.querySelector('#collectionSearchInput');
  if(searchInput){
    searchInput.addEventListener('input', () => {
      state.collectionSearch = searchInput.value;
      const activeEl = document.activeElement;
      renderCollectionTab(container);
      const newInput = container.querySelector('#collectionSearchInput');
      if(newInput && activeEl && activeEl.id === 'collectionSearchInput'){
        newInput.focus();
        newInput.setSelectionRange(newInput.value.length, newInput.value.length);
      }
    });
  }
  const sortSelect = container.querySelector('#collectionSortSelect');
  if(sortSelect){
    sortSelect.addEventListener('change', () => { state.collectionSort = sortSelect.value; renderCollectionTab(container); });
  }
}

/* ---------------- Squad tab ---------------- */
function renderSquadTab(container){
  let html = '<div class="squad-empty-note">Toque num espaço vazio pra escalar, e num preenchido pra ver ou tirar o jogador.</div>';
  html += '<div class="pitch-wrap"><div class="pitch">';
  SLOTS_442.forEach(slot => {
    const filled = state.squad[slot.key];
    html += '<div class="slot' + (filled ? ' filled' : '') + '" data-slot="' + slot.key + '" style="left:' + slot.x + '%; top:' + slot.y + '%;">';
    if(filled){
      html += (filled.teamCrest ? '<img src="' + escapeHtml(filled.teamCrest) + '" onerror="this.style.display=\'none\'">' : '') +
              '<div class="slot-name">' + escapeHtml((filled.playerName||'').split(' ').slice(-1)[0]) + '</div>';
    } else {
      html += slot.label;
    }
    html += '</div>';
  });
  html += '</div></div>';
  container.innerHTML = html;
  container.querySelectorAll('[data-slot]').forEach(el => {
    el.addEventListener('click', () => openSlotModal(el.dataset.slot));
  });
}

function openSlotModal(slotKey){
  const slot = SLOTS_442.find(s => s.key === slotKey);
  const current = state.squad[slotKey];
  const usedIds = new Set(Object.values(state.squad).filter(Boolean).map(p => p.pullId));
  const allCandidates = state.collection.filter(p => bucketFor(p.position) === slot.bucket && (!usedIds.has(p.id) || (current && current.pullId === p.id)));

  let modalSearch = '';

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  document.body.appendChild(backdrop);

  function renderModalBody(){
    const q = modalSearch.trim().toLowerCase();
    const candidates = q
      ? allCandidates.filter(p => (p.playerName||'').toLowerCase().includes(q) || (p.teamName||'').toLowerCase().includes(q))
      : allCandidates;

    let html = '<div class="modal">' +
      '<div class="modal-head"><div class="modal-title">Escalar — ' + slot.label + '</div><button class="modal-close" id="modalCloseBtn">✕</button></div>';

    if(allCandidates.length > 4){
      html += '<input type="text" id="modalSearchInput" class="search-input" style="margin-bottom:12px;" placeholder="Buscar jogador ou clube..." value="' + escapeHtml(modalSearch) + '">';
    }

    if(allCandidates.length === 0){
      html += '<div class="empty-state" style="padding:30px 10px;"><span class="ball">🎟️</span>Nenhuma carta dessa posição na sua coleção ainda.</div>';
    } else if(candidates.length === 0){
      html += '<div class="empty-state" style="padding:30px 10px;"><span class="ball">🔍</span>Nenhum jogador encontrado.</div>';
    } else {
      candidates.forEach(p => {
        html += '<div class="modal-list-item" data-pick="' + p.id + '">' +
          (p.teamCrest ? '<img src="' + escapeHtml(p.teamCrest) + '" onerror="this.style.display=\'none\'">' : '') +
          '<div><div class="mi-name">' + escapeHtml(p.playerName) + '</div><div class="mi-sub">' + escapeHtml(p.teamName) + ' · ' + escapeHtml(p.position) + '</div></div>' +
          '<div class="tier-dot dot-' + p.tier + '"></div>' +
        '</div>';
      });
    }
    if(current){
      html += '<div class="remove-row"><button class="btn btn-ghost" id="removeSlotBtn">Tirar jogador desse espaço</button></div>';
    }
    html += '</div>';
    backdrop.innerHTML = html;

    backdrop.querySelector('#modalCloseBtn').addEventListener('click', () => backdrop.remove());
    backdrop.querySelectorAll('[data-pick]').forEach(item => {
      item.addEventListener('click', async () => {
        const p = state.collection.find(c => c.id === item.dataset.pick);
        state.squad[slotKey] = { pullId: p.id, playerName: p.playerName, teamName: p.teamName, teamCrest: p.teamCrest, position: p.position, tier: p.tier };
        await saveSquad();
        backdrop.remove();
        renderTabs();
      });
    });
    const removeBtn = backdrop.querySelector('#removeSlotBtn');
    if(removeBtn){
      removeBtn.addEventListener('click', async () => {
        delete state.squad[slotKey];
        await saveSquad();
        backdrop.remove();
        renderTabs();
      });
    }
    const searchInput = backdrop.querySelector('#modalSearchInput');
    if(searchInput){
      searchInput.addEventListener('input', () => {
        modalSearch = searchInput.value;
        renderModalBody();
        const newInput = backdrop.querySelector('#modalSearchInput');
        if(newInput){ newInput.focus(); newInput.setSelectionRange(newInput.value.length, newInput.value.length); }
      });
    }
  }

  renderModalBody();
  backdrop.addEventListener('click', (e) => { if(e.target === backdrop) backdrop.remove(); });
}

/* ---------------- Render shell ---------------- */
function renderTabs(){
  const content = document.getElementById('tabContent');
  if(!content) return;
  if(state.activeTab === 'pack'){
    content.innerHTML = '' +
      '<div class="pack-zone">' +
        '<button class="pack-btn" id="packBtn"><span class="ball">⚽</span><span class="label">ABRIR PACOTE</span><span class="sub">1 jogador por pacote</span></button>' +
        '<div id="revealArea"></div>' +
      '</div>';
    document.getElementById('packBtn').addEventListener('click', openPack);
  } else if(state.activeTab === 'collection'){
    renderCollectionTab(content);
  } else if(state.activeTab === 'squad'){
    renderSquadTab(content);
  }
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === state.activeTab));
  const countEl = document.getElementById('collectionCount');
  if(countEl) countEl.textContent = state.collection.length;
  const coinsEl = document.querySelector('.coins-tag');
  if(coinsEl) coinsEl.textContent = '🪙 ' + state.coins;
}

function renderMain(){
  const app = document.getElementById('app');
  const u = state.user;
  app.innerHTML = '' +
    '<div class="brandbar">' +
      '<div class="brand"><div class="brand-badge">FC</div><div class="brand-name">FUT<span>CARD</span></div></div>' +
      '<div class="user-tag">' + (u.photoURL ? '<img src="' + escapeHtml(u.photoURL) + '">' : '') + '<span>' + escapeHtml(u.displayName || u.email || 'Treinador') + '</span><span class="coins-tag">🪙 ' + state.coins + '</span><button class="logout-btn" id="logoutBtn">Sair</button></div>' +
    '</div>' +
    '<div class="tabs">' +
      '<button class="tab" data-tab="pack">Pacote</button>' +
      '<button class="tab" data-tab="collection">Coleção <span class="count" id="collectionCount">0</span></button>' +
      '<button class="tab" data-tab="squad">Escalação</button>' +
    '</div>' +
    '<div id="tabContent"></div>' +
    '<div class="footer-note">Dados de jogadores e clubes via football-data.org · Progresso salvo na sua conta Google · Raridade baseada no prestígio do clube (heurística simples, edite o código pra ajustar)</div>';

  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => { state.activeTab = t.dataset.tab; renderTabs(); });
  });
  document.getElementById('logoutBtn').addEventListener('click', logout);
  renderTabs();
}

function renderLogin(){
  const app = document.getElementById('app');
  app.innerHTML = '' +
    '<div class="brandbar">' +
      '<div class="brand"><div class="brand-badge">FC</div><div class="brand-name">FUT<span>CARD</span></div></div>' +
    '</div>' +
    '<div class="setup-card">' +
      '<div class="setup-eyebrow">Gacha de futebol</div>' +
      '<h1 class="setup-title">Abre o pacote, monta o <span>time</span>.</h1>' +
      '<p class="setup-desc">Cada pacote sorteia um clube (times grandes são mais raros) e depois um jogador aleatório do elenco dele, puxado ao vivo da football-data.org. Entra com sua conta Google pra guardar sua coleção e sua escalação.</p>' +
      '<button class="btn btn-google" id="googleBtn"><svg class="g-icon" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.3 29.4 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l6-6C34.3 6 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.6 18.9 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l6-6C34.3 6 29.4 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/><path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.4l-6.3-5.3C29.4 35 26.9 35.5 24 35.5c-5.3 0-9.8-3.2-11.4-7.7l-6.5 5C9.5 39.5 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 4.9l6.3 5.3C41.4 35.9 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>Entrar com Google</button>' +
      '<div class="setup-error" id="setupError"></div>' +
    '</div>' +
    '<div class="footer-note">Progresso salvo no Firestore, associado à sua conta Google.</div>';
  document.getElementById('googleBtn').addEventListener('click', loginWithGoogle);
}

function renderConfigMissing(){
  const app = document.getElementById('app');
  app.innerHTML = '' +
    '<div class="brandbar"><div class="brand"><div class="brand-badge">FC</div><div class="brand-name">FUT<span>CARD</span></div></div></div>' +
    '<div class="setup-card">' +
      '<div class="setup-eyebrow">Configuração pendente</div>' +
      '<h1 class="setup-title">Falta preencher <span>o token</span> no código.</h1>' +
      '<p class="setup-desc">Abra o app.js num editor de texto e preencha, lá no topo:</p>' +
      '<div class="code-block">const API_BASE = "...url do seu projeto na Vercel...";</div>' +
      '<p class="setup-desc" style="margin-top:16px;">Veja o passo a passo completo na mensagem do Claude.</p>' +
    '</div>';
}

function init(){
  if(!isConfigured()){ renderConfigMissing(); return; }
  firebase.initializeApp(FIREBASE_CONFIG);
  state.db = firebase.firestore();
  firebase.auth().onAuthStateChanged((user) => {
    if(user){ bootAfterLogin(user); }
    else{ state.user = null; state.ready = false; renderLogin(); }
  });
}

init();
