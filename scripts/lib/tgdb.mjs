import { platformMatches } from './platformAliases.mjs';

const API_BASE = 'https://api.thegamesdb.net/v1';

export async function fetchPlatformNames(apiKey){
  const url = `${API_BASE}/Platforms?apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`TheGamesDB /Platforms a échoué (${res.status})`);
  const json = await res.json();
  const platforms = json?.data?.platforms || {};
  const idToName = {};
  for(const [id, p] of Object.entries(platforms)) idToName[id] = p.name || '';
  return idToName;
}

// Cherche un jeu par titre et renvoie les jaquettes candidates (recto), triées
// en mettant en premier celles dont la plateforme correspond à `ourPlatform`.
export async function searchCovers(apiKey, title, ourPlatform, platformIdToName){
  const url = `${API_BASE}/Games/ByGameName?apikey=${encodeURIComponent(apiKey)}&name=${encodeURIComponent(title)}&include=boxart&fields=platform,release_date`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`TheGamesDB /Games/ByGameName a échoué (${res.status})`);
  const json = await res.json();
  const games = json?.data?.games || [];
  const imagesByGameId = json?.include?.boxart?.data || {};
  const baseUrl = json?.include?.boxart?.base_url?.original || json?.include?.boxart?.base_url?.large || json?.include?.boxart?.base_url?.medium || '';

  const candidates = [];
  for(const g of games){
    const entry = imagesByGameId[String(g.id)];
    if(!entry) continue;
    const list = Array.isArray(entry) ? entry : Object.values(entry).flat();
    const fronts = list.filter(im => im && (im.side === 'front' || im.type === 'boxart') && im.side !== 'back');
    const platformName = platformIdToName?.[String(g.platform)] || '';
    const match = ourPlatform ? platformMatches(ourPlatform, platformName) : null;
    for(const im of fronts){
      const filename = im.filename || im.url;
      if(!filename) continue;
      candidates.push({
        url: filename.startsWith('http') ? filename : baseUrl + filename,
        gameTitle: g.game_title,
        releaseDate: g.release_date || '',
        platformName,
        platformMatch: match, // true, false, ou null (plateforme inconnue de la table d'alias)
        tgdbGameId: g.id,
      });
    }
  }

  candidates.sort((a, b) => {
    const score = c => c.platformMatch === true ? 0 : c.platformMatch === null ? 1 : 2;
    return score(a) - score(b);
  });
  return candidates;
}
