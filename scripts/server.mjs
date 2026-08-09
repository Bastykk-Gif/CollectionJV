import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { loadEnv } from './lib/env.mjs';
import { fetchPlatformNames, searchCovers } from './lib/tgdb.mjs';
import { platformMatches } from './lib/platformAliases.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

loadEnv(ROOT);

const TGDB_API_KEY = process.env.TGDB_API_KEY;
const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT || './serviceAccountKey.json';
const PORT = Number(process.env.PORT || 5173);

if(!TGDB_API_KEY){
  console.error("TGDB_API_KEY manquant. Copiez .env.example vers .env et renseignez votre clé TheGamesDB.");
  process.exit(1);
}
const serviceAccountFullPath = path.isAbsolute(SERVICE_ACCOUNT_PATH) ? SERVICE_ACCOUNT_PATH : path.join(ROOT, SERVICE_ACCOUNT_PATH);
if(!fs.existsSync(serviceAccountFullPath)){
  console.error(`Fichier de clé de service Firebase introuvable : ${serviceAccountFullPath}`);
  console.error("Générez-le depuis la console Firebase (Paramètres du projet > Comptes de service > Générer une nouvelle clé privée).");
  process.exit(1);
}

await fsp.mkdir(DATA_DIR, { recursive: true });
const CACHE_PATH = path.join(DATA_DIR, 'cache.json');
const SKIPPED_PATH = path.join(DATA_DIR, 'skipped.json');
const PLATFORMS_PATH = path.join(DATA_DIR, 'platforms.json');

function readJsonFile(p, fallback){
  try{ return JSON.parse(fs.readFileSync(p, 'utf8')); }catch{ return fallback; }
}
async function writeJsonFile(p, data){
  await fsp.writeFile(p, JSON.stringify(data, null, 2), 'utf8');
}

const coverCache = readJsonFile(CACHE_PATH, {});
const skipped = new Set(readJsonFile(SKIPPED_PATH, []));
const GAMES_CACHE_PATH = path.join(DATA_DIR, 'games-cache.json');
const forceRefresh = process.argv.includes('--refresh-games');

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(serviceAccountFullPath, 'utf8'))),
});
const db = admin.firestore();

let games = !forceRefresh ? readJsonFile(GAMES_CACHE_PATH, null) : null;
if(games){
  console.log(`${games.length} jeux chargés depuis le cache local (0 lecture Firestore). Lancez avec --refresh-games pour forcer une relecture.`);
}else{
  console.log('Chargement du catalogue depuis Firestore…');
  const snap = await db.collection('games').get();
  games = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  console.log(`${games.length} jeux chargés (${games.length} lectures Firestore).`);
  await writeJsonFile(GAMES_CACHE_PATH, games);
}

let platformIdToName = readJsonFile(PLATFORMS_PATH, null);
if(!platformIdToName){
  console.log('Récupération de la liste des plateformes TheGamesDB…');
  platformIdToName = await fetchPlatformNames(TGDB_API_KEY);
  await writeJsonFile(PLATFORMS_PATH, platformIdToName);
}

function remainingQueue(){
  return games.filter(g => !g.img && !skipped.has(g.id));
}

async function getCandidates(title, ourPlatform){
  const key = String(title || '').toLowerCase().trim();
  if(!key) return [];
  let candidates = coverCache[key];
  if(!candidates){
    candidates = await searchCovers(TGDB_API_KEY, title, null, platformIdToName);
    coverCache[key] = candidates;
    writeJsonFile(CACHE_PATH, coverCache).catch(()=>{});
  }
  return sortForPlatform(candidates, ourPlatform);
}
function sortForPlatform(list, ourPlatform){
  const scored = list.map(c => ({ ...c, platformMatch: ourPlatform ? platformMatches(ourPlatform, c.platformName) : c.platformMatch }));
  const score = c => c.platformMatch === true ? 0 : c.platformMatch === null ? 1 : 2;
  return scored.sort((a, b) => score(a) - score(b));
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function readJsonBody(req){
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if(data.length > 5_000_000) req.destroy(); });
    req.on('end', () => { try{ resolve(data ? JSON.parse(data) : {}); }catch(e){ reject(e); } });
    req.on('error', reject);
  });
}
function sendJson(res, status, obj){
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

async function serveStatic(req, res, urlPath){
  const rel = urlPath === '/' ? '/review.html' : urlPath;
  const filePath = path.join(PUBLIC_DIR, rel);
  if(!filePath.startsWith(PUBLIC_DIR)){ res.writeHead(403); res.end(); return; }
  try{
    const data = await fsp.readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  }catch{
    res.writeHead(404); res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try{
    if(req.method === 'GET' && url.pathname === '/api/stats'){
      const total = games.length;
      const withImage = games.filter(g => g.img).length;
      return sendJson(res, 200, { total, withImage, skipped: skipped.size, remaining: total - withImage - skipped.size });
    }

    if(req.method === 'GET' && url.pathname === '/api/next'){
      const queue = remainingQueue();
      if(queue.length === 0) return sendJson(res, 200, { done: true });
      const g = queue[0];
      const candidates = await getCandidates(g.n, g.p);
      const { id, n, p, cat, y, g: genre, pub, dev, f, ed, r } = g;
      return sendJson(res, 200, {
        done: false,
        remaining: queue.length,
        game: { id, n, p, cat, y, g: genre, pub, dev, f, ed, r },
        candidates,
      });
    }

    if(req.method === 'POST' && url.pathname === '/api/search'){
      const { id, query } = await readJsonBody(req);
      const g = games.find(x => x.id === id);
      if(!g) return sendJson(res, 404, { error: 'Jeu inconnu' });
      const candidates = await searchCovers(TGDB_API_KEY, query, g.p, platformIdToName);
      return sendJson(res, 200, { candidates });
    }

    if(req.method === 'POST' && url.pathname === '/api/save'){
      const { id, img } = await readJsonBody(req);
      const g = games.find(x => x.id === id);
      if(!g) return sendJson(res, 404, { error: 'Jeu inconnu' });
      await db.collection('games').doc(id).set({ img }, { merge: true });
      g.img = img;
      skipped.delete(id);
      await writeJsonFile(SKIPPED_PATH, [...skipped]);
      await writeJsonFile(GAMES_CACHE_PATH, games);
      return sendJson(res, 200, { ok: true });
    }

    if(req.method === 'POST' && url.pathname === '/api/skip'){
      const { id } = await readJsonBody(req);
      skipped.add(id);
      await writeJsonFile(SKIPPED_PATH, [...skipped]);
      return sendJson(res, 200, { ok: true });
    }

    if(req.method === 'GET'){
      return serveStatic(req, res, url.pathname);
    }

    res.writeHead(404); res.end();
  }catch(err){
    console.error(err);
    sendJson(res, 500, { error: err.message || 'Erreur serveur' });
  }
});

server.listen(PORT, () => {
  console.log(`Outil de revue des jaquettes : http://localhost:${PORT}`);
});
