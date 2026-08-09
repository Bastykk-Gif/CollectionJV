let currentGame = null;
let currentCandidates = [];
let selectedIndex = -1;

const el = id => document.getElementById(id);

async function api(method, url, body){
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if(!res.ok) throw new Error((await res.json().catch(()=>({}))).error || `Erreur ${res.status}`);
  return res.json();
}

async function refreshStats(){
  const s = await api('GET', '/api/stats');
  el('stats').textContent = `${s.withImage} avec image · ${s.remaining} restants · ${s.skipped} passés · ${s.total} au total`;
}

async function loadNext(){
  setMsg('');
  const data = await api('GET', '/api/next');
  if(data.done){
    el('gameCard').style.display = 'none';
    el('doneMsg').style.display = 'block';
    await refreshStats();
    return;
  }
  currentGame = data.game;
  currentCandidates = data.candidates;
  selectedIndex = -1;
  el('doneMsg').style.display = 'none';
  el('gameCard').style.display = 'block';
  el('searchInput').value = '';
  el('urlInput').value = '';
  renderGame();
  await refreshStats();
}

function renderGame(){
  const g = currentGame;
  el('gTitle').textContent = g.n || '(sans titre)';
  el('gPlatform').textContent = g.p || '—';
  el('gYear').textContent = g.y || '—';
  el('gRegion').textContent = g.r || '—';
  el('gFranchise').textContent = g.f || '—';
  el('gPub').textContent = g.pub || '—';
  renderCandidates();
  updateActionButtons();
}

function renderCandidates(){
  const box = el('candidates');
  box.innerHTML = '';
  if(currentCandidates.length === 0){
    box.innerHTML = '<div class="empty-cands">Aucune jaquette trouvée automatiquement. Essayez une autre recherche ou collez une URL.</div>';
    return;
  }
  currentCandidates.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'cand' + (i === selectedIndex ? ' selected' : '');
    const badge = c.platformMatch === true ? '<span class="badge match">plateforme ok</span>'
      : c.platformMatch === false ? '<span class="badge mismatch">autre plateforme</span>' : '';
    div.innerHTML = `${badge}<img src="${c.url}" loading="lazy" alt="">
      <div class="info">${escapeHtml(c.gameTitle || '')}${c.releaseDate ? ' · ' + escapeHtml(c.releaseDate) : ''}${c.platformName ? '<br>' + escapeHtml(c.platformName) : ''}</div>`;
    div.addEventListener('click', () => { selectedIndex = i; renderCandidates(); updateActionButtons(); });
    box.appendChild(div);
  });
}

function updateActionButtons(){
  const has = selectedIndex >= 0;
  el('acceptBtn').disabled = !has;
  el('acceptUrlBtn').disabled = !has;
}

function escapeHtml(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function setMsg(text, kind){
  const m = el('msg');
  m.textContent = text || '';
  m.className = 'msg' + (kind ? ' ' + kind : '');
}

/* ---------- compression client-side (même logique que l'appli principale) ---------- */
function compressImageFromUrl(url, maxDim=640, quality=0.72){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      if(width > height && width > maxDim){ height = Math.round(height * maxDim/width); width = maxDim; }
      else if(height > maxDim){ width = Math.round(width * maxDim/height); height = maxDim; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      let dataUrl;
      try{
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }catch(err){
        reject(Object.assign(new Error('tainted'), { tainted: true }));
        return;
      }
      if(dataUrl.length > 900000){ reject(new Error('Image trop volumineuse même après compression')); return; }
      resolve(dataUrl);
    };
    img.onerror = () => reject(Object.assign(new Error('Lecture de l\'image impossible'), { tainted: true }));
    img.src = url;
  });
}

async function accept(){
  if(selectedIndex < 0) return;
  const url = currentCandidates[selectedIndex].url;
  setMsg('Compression en cours…');
  try{
    const dataUrl = await compressImageFromUrl(url);
    await api('POST', '/api/save', { id: currentGame.id, img: dataUrl });
    await loadNext();
  }catch(err){
    if(err.tainted){
      setMsg("Cette image ne peut pas être téléchargée depuis le navigateur (restriction du site source). Utilisez plutôt « Garder juste l'URL externe ».", 'error');
    }else{
      setMsg(err.message, 'error');
    }
  }
}

async function acceptUrl(){
  if(selectedIndex < 0) return;
  const url = currentCandidates[selectedIndex].url;
  try{
    await api('POST', '/api/save', { id: currentGame.id, img: url });
    await loadNext();
  }catch(err){
    setMsg(err.message, 'error');
  }
}

async function skip(){
  try{
    await api('POST', '/api/skip', { id: currentGame.id });
    await loadNext();
  }catch(err){
    setMsg(err.message, 'error');
  }
}

async function search(){
  const q = el('searchInput').value.trim();
  if(!q) return;
  setMsg('Recherche…');
  try{
    const { candidates } = await api('POST', '/api/search', { id: currentGame.id, query: q });
    currentCandidates = candidates;
    selectedIndex = -1;
    renderCandidates();
    updateActionButtons();
    setMsg(candidates.length ? '' : 'Aucun résultat.', candidates.length ? '' : 'error');
  }catch(err){
    setMsg(err.message, 'error');
  }
}

function addUrlCandidate(){
  const url = el('urlInput').value.trim();
  if(!url) return;
  currentCandidates = [{ url, gameTitle: 'URL manuelle', releaseDate: '', platformName: '', platformMatch: null }, ...currentCandidates];
  selectedIndex = 0;
  el('urlInput').value = '';
  renderCandidates();
  updateActionButtons();
}

el('acceptBtn').addEventListener('click', accept);
el('acceptUrlBtn').addEventListener('click', acceptUrl);
el('skipBtn').addEventListener('click', skip);
el('searchBtn').addEventListener('click', search);
el('urlPreviewBtn').addEventListener('click', addUrlCandidate);
el('searchInput').addEventListener('keydown', e => { if(e.key === 'Enter') search(); });
el('urlInput').addEventListener('keydown', e => { if(e.key === 'Enter') addUrlCandidate(); });

document.addEventListener('keydown', e => {
  if(document.activeElement && ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
  if(e.key >= '1' && e.key <= '9'){
    const idx = Number(e.key) - 1;
    if(idx < currentCandidates.length){ selectedIndex = idx; renderCandidates(); updateActionButtons(); }
    return;
  }
  if(e.key.toLowerCase() === 's'){ skip(); return; }
  if(e.key.toLowerCase() === 'u'){ acceptUrl(); return; }
  if(e.key === 'Enter'){ accept(); return; }
});

loadNext();
