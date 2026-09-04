/* ─────────────────────────────────────────────────────────
   Dictats en Català — Frontend principal (escriptori)
   La mecànica del dictat viu a /dictat.js, compartida amb /mobile.
   ───────────────────────────────────────────────────────── */

const LEVEL_LABELS = {
  basic: 'Nivell Bàsic',
  intermedi: 'Nivell Intermedi',
  avancat: 'Nivell Avançat',
  personal: 'Els meus textos',
};

const state = {
  email: '',
  firstName: '',
  level: 'basic',
  selectedText: null,
  dictationDone: false,
  mode: 'editor',   // editor | paper
  photoFile: null,
  dictaPuntuacio: false,
};

const motor = new Dictat.MotorDictat(pintaEstat);

const $ = id => document.getElementById(id);
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $('view-' + name).classList.add('active');
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Preferències i esborrany ──────────────────────────────
// Les preferències (velocitat, puntuació) van a localStorage: són ajustos, no
// contingut de ningú. L'esborrany del dictat va a sessionStorage i s'esborra
// en corregir i en tancar sessió, perquè això sí que és el que ha escrit una
// persona i aquesta app s'instal·la en mòbils compartits — la mateixa raó per
// la qual el service worker no cacheja res personal.
function llegeixPref(clau, perDefecte) {
  try { const v = localStorage.getItem('dictats:' + clau); return v === null ? perDefecte : JSON.parse(v); }
  catch { return perDefecte; }
}
function desaPref(clau, valor) {
  try { localStorage.setItem('dictats:' + clau, JSON.stringify(valor)); } catch { /* mode privat */ }
}
function clauEsborrany() {
  return 'dictats:esborrany:' + (state.selectedText?.id || 'cap');
}
function desaEsborrany() {
  if (!state.selectedText) return;
  try { sessionStorage.setItem(clauEsborrany(), $('user-text').value); } catch { /* ple o privat */ }
}
function recuperaEsborrany() {
  try { return sessionStorage.getItem(clauEsborrany()) || ''; } catch { return ''; }
}
function esborraEsborrany() {
  try { sessionStorage.removeItem(clauEsborrany()); } catch { /* res a fer */ }
}

// ── Init ─────────────────────────────────────────────────
async function init() {
  const res = await fetch('/api/me');
  if (!res.ok) { window.location.href = '/login'; return; }
  const { email, first_name } = await res.json();
  state.email = email;
  state.firstName = first_name || email;

  motor.velocitat = llegeixPref('velocitat', Dictat.VELOCITAT_PER_DEFECTE);
  state.dictaPuntuacio = llegeixPref('puntuacio', false);
  motor.dictaPuntuacio = state.dictaPuntuacio;

  $('header-avatar').textContent = (first_name || email).slice(0, 2).toUpperCase();
  $('avatar-email').textContent = email;

  $('header-avatar').addEventListener('click', (e) => {
    e.stopPropagation();
    $('avatar-dropdown').classList.toggle('open');
  });
  document.addEventListener('click', () => $('avatar-dropdown').classList.remove('open'));

  $('btn-logout').addEventListener('click', async () => {
    try { sessionStorage.clear(); } catch { /* res a fer */ }
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  });

  document.querySelectorAll('.level-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.level-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.level = card.dataset.level;
      loadTextList(state.level);
    });
  });

  $('mode-editor').addEventListener('click', () => setMode('editor'));
  $('mode-paper').addEventListener('click', () => setMode('paper'));
  $('photo-input').addEventListener('change', onPhotoSelected);
  $('btn-remove-photo').addEventListener('click', removePhoto);

  // Sortir del dictat el pausa. Abans es quedava sonant de fons i, en tornar,
  // s'havia de començar des de la primera frase.
  $('btn-back-select').addEventListener('click', () => { motor.pausa(); showView('select'); });
  $('btn-back-dictation').addEventListener('click', () => showView('dictation'));
  $('btn-new-dictation').addEventListener('click', () => { resetDictation(); showView('select'); });

  $('btn-start-dictation').addEventListener('click', iniciaDictat);
  $('btn-repeat-phrase').addEventListener('click', () => motor.repeteix());
  $('btn-pause-dictation').addEventListener('click', () => motor.alternaPausa());
  $('btn-next-phrase').addEventListener('click', () => motor.seguent());
  $('btn-extend-pause').addEventListener('click', () => motor.allarga());

  $('btn-clear-text').addEventListener('click', () => {
    $('user-text').value = '';
    esborraEsborrany();
    updateCorrectBtn();
  });
  $('btn-correct').addEventListener('click', submitCorrection);
  $('user-text').addEventListener('input', () => { updateCorrectBtn(); desaEsborrany(); });

  // La barra espaiadora no serveix de drecera: durant la pausa s'està escrivint
  // al textarea i el que faria és posar un espai. Ctrl+Enter no molesta ningú.
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && $('view-dictation').classList.contains('active')) {
      e.preventDefault();
      motor.seguent();
    }
  });

  const rang = $('speech-rate');
  rang.value = String(motor.velocitat);
  mostraVelocitat();
  rang.addEventListener('input', () => {
    motor.velocitat = parseFloat(rang.value);
    mostraVelocitat();
    desaPref('velocitat', motor.velocitat);
  });

  const casella = $('dictate-punctuation');
  casella.checked = state.dictaPuntuacio;
  casella.addEventListener('change', () => {
    state.dictaPuntuacio = casella.checked;
    motor.dictaPuntuacio = casella.checked;
    desaPref('puntuacio', state.dictaPuntuacio);
  });

  $('btn-add-text').addEventListener('click', () => { $('modal-add-text').style.display = 'flex'; });
  $('btn-cancel-add-text').addEventListener('click', () => { $('modal-add-text').style.display = 'none'; });
  $('btn-save-text').addEventListener('click', savePersonalText);

  comprovaVeu();
  await loadTextList('basic');
}

function mostraVelocitat() {
  $('speech-rate-value').textContent = motor.velocitat.toFixed(2).replace('.', ',') + '×';
}

// ── Veu (F21) ─────────────────────────────────────────────
// Si no hi ha veu catalana, la síntesi cau a una de castellana. Abans això
// passava en silenci: el dictat sonava amb fonètica castellana i qui el feia
// no tenia manera de saber-ho. És pitjor que no practicar.
function comprovaVeu() {
  if (!window.speechSynthesis) {
    return mostraAvisVeu('Aquest navegador no té síntesi de veu. Prova amb Chrome, Edge o Safari.');
  }
  const revisa = () => {
    if (!window.speechSynthesis.getVoices().length) return;   // encara no han carregat
    if (Dictat.veusCatalanes().length) { $('voice-warning').style.display = 'none'; return; }
    mostraAvisVeu(
      'No hi ha cap veu catalana instal·lada en aquest dispositiu: el dictat sonarà amb una veu castellana '
      + 'i pronunciarà malament el català. Android: Configuració → Sistema → Idiomes → Sortida de síntesi de veu. '
      + 'iOS: Configuració → Accessibilitat → Contingut parlat → Veus → Català. '
      + 'Windows: Configuració → Hora i idioma → Idioma i regió → afegeix el català.'
    );
  };
  revisa();
  window.speechSynthesis.onvoiceschanged = revisa;
  // Si al cap de 2,5 s encara no hi ha CAP veu, `revisa` no haurà dit res:
  // el dispositiu no té motor de síntesi i el dictat quedaria mut sense explicació.
  setTimeout(() => {
    if (!window.speechSynthesis.getVoices().length) {
      mostraAvisVeu('Aquest dispositiu no té cap veu de síntesi instal·lada: el dictat no sonarà. '
        + 'Android: Configuració → Sistema → Idiomes → Sortida de síntesi de veu.');
    }
  }, 2500);
}

function mostraAvisVeu(text) {
  $('voice-warning').textContent = text;
  $('voice-warning').style.display = '';
}

// ── Mode ──────────────────────────────────────────────────
function setMode(mode) {
  state.mode = mode;
  state.photoFile = null;
  $('mode-editor').classList.toggle('active', mode === 'editor');
  $('mode-paper').classList.toggle('active', mode === 'paper');
  $('editor-zone').style.display = mode === 'editor' ? '' : 'none';
  $('paper-zone').style.display = mode === 'paper' ? '' : 'none';
  $('photo-preview-wrap').style.display = 'none';
  $('photo-label-text').textContent = 'Pujar foto del paper (opcional)';
  $('photo-input').value = '';
  updateCorrectBtn();
}

function updateCorrectBtn() {
  $('btn-correct').disabled = state.mode === 'editor'
    ? $('user-text').value.trim().length < 3
    : !state.dictationDone;
}

function onPhotoSelected(e) {
  const file = e.target.files[0];
  if (!file) return;
  state.photoFile = file;
  $('photo-label-text').textContent = file.name;
  const reader = new FileReader();
  reader.onload = ev => {
    $('photo-preview').src = ev.target.result;
    $('photo-preview-wrap').style.display = '';
  };
  reader.readAsDataURL(file);
  updateCorrectBtn();
}

function removePhoto() {
  state.photoFile = null;
  $('photo-input').value = '';
  $('photo-preview-wrap').style.display = 'none';
  $('photo-label-text').textContent = 'Pujar foto del paper (opcional)';
  updateCorrectBtn();
}

// ── Llista de textos ──────────────────────────────────────
async function loadTextList(level) {
  const isPersonal = level === 'personal';
  $('text-list-title').textContent = `Textos disponibles — ${LEVEL_LABELS[level]}`;
  $('btn-add-text').style.display = isPersonal ? '' : 'none';
  $('text-list').innerHTML = '<div style="color:var(--text-muted);font-size:.875rem">Carregant textos…</div>';

  const res = await fetch(isPersonal ? '/api/user-texts' : `/api/texts/${level}`);
  if (!res.ok) { $('text-list').innerHTML = '<div style="color:var(--error)">Error carregant els textos</div>'; return; }
  const texts = await res.json();

  if (isPersonal && texts.length === 0) {
    $('text-list').innerHTML = '<div style="color:var(--text-muted);font-size:.875rem">No tens cap text personal. Usa el botó «+ Afegir text» per crear-ne un.</div>';
    return;
  }

  // El títol d'un text personal l'escriu qui l'ha creat: va escapat, com ja ho
  // anava la resta de la pantalla.
  $('text-list').innerHTML = texts.map(t => `
    <div class="text-item" data-id="${escapeHtml(t.id)}" data-dbid="${escapeHtml(t.dbId || '')}">
      <div style="flex:1">
        <div class="text-title">${escapeHtml(t.title)}</div>
        <div class="text-meta">${escapeHtml(t.description)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="text-words">${escapeHtml(t.wordCount)} paraules</div>
        ${isPersonal ? `<button class="btn btn-ghost btn-sm delete-personal" data-dbid="${escapeHtml(t.dbId)}" title="Eliminar">✕</button>` : ''}
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.text-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.classList.contains('delete-personal')) return;
      selectText(item.dataset.id, isPersonal);
    });
  });

  document.querySelectorAll('.delete-personal').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('Eliminar aquest text?')) return;
      await fetch(`/api/user-texts/${btn.dataset.dbid}`, { method: 'DELETE' });
      loadTextList('personal');
    });
  });
}

// ── Triar text ────────────────────────────────────────────
async function selectText(id, isPersonal) {
  let text;
  if (isPersonal) {
    const list = await (await fetch('/api/user-texts')).json();
    text = list.find(t => t.id === id);
  } else {
    const res = await fetch(`/api/texts/${state.level}/${id}`);
    if (!res.ok) return;
    text = await res.json();
  }
  if (!text) return;

  state.selectedText = text;
  $('dictation-title').textContent = text.title;
  $('dictation-level-badge').textContent = LEVEL_LABELS[state.level];
  resetDictationUI();
  motor.carrega(text.text.split('||').map(s => s.trim()).filter(Boolean));
  $('user-text').value = recuperaEsborrany();
  updateCorrectBtn();
  showView('dictation');
}

// ── Textos personals ──────────────────────────────────────
async function savePersonalText() {
  const title = $('new-text-title').value.trim();
  const text = $('new-text-body').value.trim();
  if (!title || !text) return alert('Cal títol i text');

  const res = await fetch('/api/user-texts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, text }),
  });
  if (res.ok) {
    $('modal-add-text').style.display = 'none';
    $('new-text-title').value = '';
    $('new-text-body').value = '';
    loadTextList('personal');
  }
}

// ── F44: que la pantalla no s'apagui a mitja frase i talli la veu ──
// Sense suport (navegador vell, connexió no segura) no fa res: tot sona igual.
const pantalla = {
  lock: null,
  volem: false,
  demanant: false,
  async agafa() {
    this.volem = true;
    if (!('wakeLock' in navigator) || this.lock || this.demanant) return;
    this.demanant = true;
    try {
      this.lock = await navigator.wakeLock.request('screen');
      this.lock.addEventListener('release', () => { pantalla.lock = null; });
      if (!this.volem) this.deixa(); // el dictat ha acabat mentre es demanava
    } catch { /* estalvi d'energia o permís denegat: el dictat segueix */ }
    this.demanant = false;
  },
  deixa() {
    this.volem = false;
    if (this.lock) { this.lock.release(); this.lock = null; }
  },
};
// El sistema allibera el lock en amagar la pestanya: en tornar, es recupera.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && pantalla.volem) pantalla.agafa();
});

// ── El dictat: només pintar el que diu el motor ───────────
function iniciaDictat() {
  if (!window.speechSynthesis) { alert('Aquest navegador no suporta la síntesi de veu. Prova amb Chrome.'); return; }
  $('btn-start-dictation').style.display = 'none';
  $('btn-repeat-phrase').style.display = '';
  $('btn-pause-dictation').style.display = '';
  $('btn-next-phrase').style.display = '';
  motor.inicia();
}

function pintaEstat(info) {
  $('progress-bar').style.width = info.progres + '%';
  state.dictationDone = info.estat === 'fet';

  // Pantalla encesa mentre el dictat corre (llegint o pausa d'escriptura)
  if (info.estat === 'llegint' || info.estat === 'pausa') pantalla.agafa();
  else pantalla.deixa();

  if (info.estat === 'llegint') {
    $('phrase-indicator').textContent = `Frase ${info.frase + 1} de ${info.total}`;
    $('status-badge').innerHTML = `<span class="speaking-badge"><span class="dot"></span>Llegint frase ${info.frase + 1} de ${info.total}</span>`;
    $('btn-extend-pause').style.display = 'none';
    $('btn-pause-dictation').textContent = '⏸ Pausar';
  } else if (info.estat === 'pausa') {
    $('status-badge').innerHTML = `<span class="pause-badge">⏸ ${info.segons} s per escriure</span>`;
    $('btn-extend-pause').style.display = '';
    $('btn-pause-dictation').textContent = '⏸ Pausar';
  } else if (info.estat === 'pausat') {
    $('status-badge').innerHTML = '<span class="pause-badge">⏹ Dictat aturat</span>';
    $('btn-extend-pause').style.display = 'none';
    $('btn-pause-dictation').textContent = '▶ Reprendre';
  } else if (info.estat === 'fet') {
    $('phrase-indicator').textContent = `Dictat complet (${info.total} frases)`;
    $('status-badge').innerHTML = '<span class="speaking-badge" style="background:var(--success-light);color:var(--success)">✓ Dictat completat</span>';
    ['btn-repeat-phrase', 'btn-pause-dictation', 'btn-next-phrase', 'btn-extend-pause']
      .forEach(id => { $(id).style.display = 'none'; });
  }

  updateCorrectBtn();
}

function resetDictationUI() {
  motor.atura(); // atura() no avisa el callback: el lock es deixa aquí
  pantalla.deixa();
  state.dictationDone = false;
  state.photoFile = null;
  $('progress-bar').style.width = '0%';
  $('phrase-indicator').textContent = '';
  $('status-badge').innerHTML = '';
  $('btn-start-dictation').style.display = '';
  ['btn-repeat-phrase', 'btn-pause-dictation', 'btn-next-phrase', 'btn-extend-pause']
    .forEach(id => { $(id).style.display = 'none'; });
  $('btn-correct').disabled = true;
  setMode('editor');
}

function resetDictation() {
  resetDictationUI();
  $('user-text').value = '';
  state.selectedText = null;
  motor.carrega([]);
}

// ── Correcció ─────────────────────────────────────────────
// La sessió dura 8 hores: qui torna l'endemà i prem «Corregir» rebia un
// «No autenticat» en un alert, sense cap manera de tornar a entrar.
function tornaAlLogin() {
  window.location.href = '/login';
}

async function submitCorrection() {
  if (!state.selectedText) return;

  $('btn-correct').disabled = true;
  $('correction-loading').style.display = '';
  motor.atura();

  try {
    let correction;

    if (state.mode === 'paper' && state.photoFile) {
      $('loading-msg').textContent = 'Llegint la foto i corregint…';
      const formData = new FormData();
      formData.append('photo', state.photoFile);
      formData.append('originalText', state.selectedText.text);
      formData.append('level', state.level);
      formData.append('textId', state.selectedText.id || 'unknown');
      formData.append('textTitle', state.selectedText.title || '');
      formData.append('punctuationDictated', String(state.dictaPuntuacio));

      const res = await fetch('/api/correct-image', { method: 'POST', body: formData });
      if (res.status === 401) return tornaAlLogin();
      if (!res.ok) throw new Error((await res.json()).error);
      correction = await res.json();
    } else if (state.mode === 'paper') {
      $('correction-loading').style.display = 'none';
      renderSenseCorreccio();
      showView('results');
      return;
    } else {
      $('loading-msg').textContent = 'Corregint el dictat…';
      const res = await fetch('/api/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText: state.selectedText.text,
          userText: $('user-text').value.trim(),
          level: state.level,
          textId: state.selectedText.id || 'unknown',
          textTitle: state.selectedText.title || '',
          punctuationDictated: state.dictaPuntuacio,
        }),
      });
      if (res.status === 401) return tornaAlLogin();
      if (!res.ok) throw new Error((await res.json()).error);
      correction = await res.json();
    }

    esborraEsborrany();
    $('correction-loading').style.display = 'none';
    renderResults(correction);
    showView('results');
    // La correcció ja es veu. Les explicacions arriben després i es torna a
    // pintar amb el mateix objecte, que ja les porta (F33).
    if (window.Explicacions) window.Explicacions.demana(correction, renderResults);
  } catch (err) {
    $('correction-loading').style.display = 'none';
    $('btn-correct').disabled = false;
    alert(err.message || 'Error de connexió. Torna a provar.');
  }
}

// ── Resultats ─────────────────────────────────────────────
// El separador de pauses es reemplaça per un espai, exactament com fa
// `tokenitza()` al servidor. Amb `''` un text personal escrit sense espais
// (`frase.||frase.`) donava una paraula menys al client que al servidor i
// totes les posicions posteriors marcaven la paraula equivocada.
function textNet() {
  return state.selectedText.text.replace(/\|\|/g, ' ').replace(/\s+/g, ' ').trim();
}

function renderSenseCorreccio() {
  $('result-scale-label').textContent = 'Dictat completat';
  $('result-scale-label').className = 'scale-label scale-good';
  $('result-scale-sub').textContent = 'Has fet el dictat en paper. Puja una foto per veure la correcció.';
  $('result-stats').textContent = '';
  $('result-transcription').style.display = 'none';
  $('errors-section').style.display = 'none';
  $('warnings-section').style.display = 'none';
  $('feedback-box').textContent = 'Bon treball! Has completat el dictat.';
  $('rank-block').style.display = 'none';
  $('original-marked').innerHTML = textNet().split(/\s+/).map(w => `<span class="word-ok">${escapeHtml(w)}</span>`).join(' ');
  $('user-marked-block').style.display = 'none'; // sense correcció no hi ha text de l'alumne
}

function fitxaError(err) {
  return `
    <div class="error-item">
      <span class="error-type">${escapeHtml(err.type || 'error')}</span>
      <div class="error-detail">
        <div class="error-words">
          <span class="wrong">${escapeHtml(err.userWrote || '(omès)')}</span>
          <span class="arrow">→</span>
          <span class="right">${escapeHtml(err.original || '(sobra)')}</span>
        </div>
        <div class="error-explanation">
          <span>${escapeHtml(err.explanation || '')}</span>
          ${window.Avisos ? window.Avisos.boto({
            generada: err.generada,
            kind: 'explicacio',
            content: err.explanation,
            context: `${err.type || ''}: ${err.original || ''} -> ${err.userWrote || ''}`,
          }) : ''}
        </div>
      </div>
    </div>`;
}

// El rang és l'altre eix del progrés: l'escala diu com ha anat aquest dictat,
// això diu on ets en conjunt i només es mou amb el temps.
function pintaRang(rank) {
  if (!rank || !rank.ultim) { $('rank-block').style.display = 'none'; return; }
  $('rank-block').style.display = '';

  const guanyats = rank.ultim.guanyats;
  $('rank-delta').textContent = (guanyats >= 0 ? '+' : '') + guanyats + ' punts';
  $('rank-delta').className = 'rank-delta ' + (guanyats >= 0 ? 'gain' : 'loss');
  $('rank-delta-note').textContent = guanyats >= 0
    ? 'Com més difícil és el text, més en val.'
    : 'A partir de sis errors es resten punts.';

  const canvi = $('rank-change');
  if (rank.ultim.haPujat) {
    canvi.style.display = '';
    canvi.className = 'rank-change up';
    canvi.textContent = `Has pujat a ${rank.rang.nom}!`;
  } else if (rank.ultim.haBaixat) {
    canvi.style.display = '';
    canvi.className = 'rank-change down';
    canvi.textContent = `Has baixat de ${rank.ultim.rangAnterior} a ${rank.rang.nom}.`;
  } else {
    canvi.style.display = 'none';
  }

  $('rank-name').textContent = rank.rang.nom;
  $('rank-step').textContent = `${rank.rang.nivell} de ${rank.rang.de}`;
  $('rank-what').textContent = rank.rang.que;
  $('rank-points').textContent = `${rank.punts} punts`;

  const pas = window.Rang.seguentPas(rank);
  $('rank-bar').style.width = pas.amplada + '%';
  $('rank-next').textContent = pas.text;
  $('rank-next').classList.toggle('rank-next-avis', pas.avis);
}

// F32: reconstrueix el que va escriure l'alumne, alineat amb l'original, a
// partir de position/span/userWrote que ja calcula el servidor. Les paraules
// de més no tenen posició a l'original i van al final, marcades.
function pintaElTeu(correction, paraules) {
  const avisos = correction.warnings || [];
  const tots = (correction.errors || []).concat(avisos);
  const perPosicio = {};
  tots.forEach(e => { if (e.position != null && !(e.position in perPosicio)) perPosicio[e.position] = e; });

  const trossos = [];
  for (let i = 0; i < paraules.length;) {
    const e = perPosicio[i];
    if (!e) { trossos.push(`<span class="word-ok">${escapeHtml(paraules[i])}</span>`); i++; continue; }
    const classe = avisos.includes(e) ? 'word-warning' : 'word-error';
    const titol = ` title="${escapeHtml('Tocava: ' + (e.original || '') + (e.explanation ? ' — ' + e.explanation : ''))}"`;
    trossos.push(e.userWrote
      ? `<span class="${classe}"${titol}>${escapeHtml(e.userWrote)}</span>`
      : `<span class="word-gap"${titol}>___</span>`);
    i += e.span || 1;
  }
  tots.filter(e => e.position == null && e.userWrote).forEach(e => {
    trossos.push(`<span class="word-error" title="Paraula de més">${escapeHtml(e.userWrote)}</span>`);
  });
  return trossos.join(' ');
}

function renderResults(correction) {
  const errors = correction.errors || [];
  const warnings = correction.warnings || [];
  const scale = correction.scale || { label: '—', sub: '', cls: 'scale-good' };

  $('result-scale-label').textContent = scale.label;
  $('result-scale-label').className = 'scale-label ' + scale.cls;
  $('result-scale-sub').textContent = scale.sub;
  // Les paraules afegides no ocupen cap posició de l'original, així que sense
  // dir-ho la línia quedava «3 de 3 paraules correctes · 3 errors».
  const afegides = errors.filter(e => e.position == null).length;
  $('result-stats').textContent =
    `${correction.correctWords ?? '—'} de ${correction.totalWords ?? '—'} paraules correctes · `
    + `${errors.length} error${errors.length !== 1 ? 's' : ''}`
    + (afegides ? ` · ${afegides} paraula${afegides !== 1 ? 'es' : ''} de més` : '');

  // Ratxa, comparació amb un mateix i fites (#23). Surt de dades que ja hi eren.
  window.Anim.pinta($('anim-block'), correction);

  if (correction.transcription) {
    $('result-transcription').style.display = '';
    $('result-transcription').innerHTML = `<strong>Text transcrit de la foto:</strong><br>${escapeHtml(correction.transcription)}`;
  } else {
    $('result-transcription').style.display = 'none';
  }

  // Les posicions les calcula ara el servidor i són exactes. Les paraules
  // afegides no en tenen —no eren a l'original— i només surten a la llista.
  // Un error pot abastar més d'una paraula de l'original (una contracció
  // desfeta), i llavors s'han de pintar totes, no només la primera.
  const marques = {};
  const explicacions = {};
  const pinta = (e, classe) => {
    if (e.position == null) return;
    for (let k = 0; k < (e.span || 1); k++) {
      const p = e.position + k;
      if (classe === 'word-error' || !marques[p]) marques[p] = classe;
      explicacions[p] = e.explanation || '';
    }
  };
  errors.forEach(e => pinta(e, 'word-error'));
  warnings.forEach(e => pinta(e, 'word-warning'));

  const paraules = textNet().split(/\s+/);
  $('original-marked').innerHTML = paraules.map((word, i) => {
    const titol = explicacions[i] ? ` title="${escapeHtml(explicacions[i])}"` : '';
    return `<span class="${marques[i] || 'word-ok'}"${titol}>${escapeHtml(word)}</span>`;
  }).join(' ');

  $('user-marked-block').style.display = '';
  $('user-marked').innerHTML = pintaElTeu(correction, paraules);

  $('errors-section').style.display = errors.length ? '' : 'none';
  if (errors.length) $('errors-list-items').innerHTML = errors.map(fitxaError).join('');

  // La puntuació que no s'ha dictat es veu, però no puntua.
  $('warnings-section').style.display = warnings.length ? '' : 'none';
  if (warnings.length) $('warnings-list-items').innerHTML = warnings.map(fitxaError).join('');

  // El missatge final també l'escriu el model quan l'API respon, així que
  // també ha de tenir la seva via d'avís (F64).
  $('feedback-box').innerHTML = escapeHtml(correction.feedback || '')
    + (window.Avisos ? window.Avisos.boto({
        generada: correction.feedbackGenerat,
        kind: 'feedback',
        content: correction.feedback,
      }) : '');
  pintaRang(correction.rank);
}

init();
