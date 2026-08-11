// Proxy CORS pour TheGamesDB, utilisé par index.html (recherche jaquette + infos
// depuis le titre en édition). TheGamesDB ne renvoie pas d'en-têtes CORS, un appel
// direct depuis le navigateur est donc bloqué — ce Worker relaie la requête côté
// serveur et garde la clé API secrète (jamais exposée au client).
const TGDB_BASE = 'https://api.thegamesdb.net/v1';

function corsHeaders(origin){
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env){
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';
    const headers = corsHeaders(origin);

    if(request.method === 'OPTIONS'){
      return new Response(null, { headers });
    }
    if(request.method !== 'GET' || !url.pathname.startsWith('/tgdb/')){
      return new Response('Not found', { status: 404, headers });
    }

    const upstreamUrl = new URL(TGDB_BASE + url.pathname.slice('/tgdb'.length));
    for(const [k, v] of url.searchParams) upstreamUrl.searchParams.set(k, v);
    upstreamUrl.searchParams.set('apikey', env.TGDB_API_KEY);

    const upstreamRes = await fetch(upstreamUrl.toString());
    const body = await upstreamRes.text();
    return new Response(body, {
      status: upstreamRes.status,
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
    });
  },
};
