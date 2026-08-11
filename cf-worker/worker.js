// Proxy CORS pour index.html : TheGamesDB (jaquette + infos depuis le titre) et
// UPCitemdb (devine un titre depuis un code-barres scanné). Aucune des deux API
// ne renvoie d'en-têtes CORS, un appel direct depuis le navigateur est donc
// bloqué — ce Worker relaie la requête côté serveur et garde les clés secrètes.
const TGDB_BASE = 'https://api.thegamesdb.net/v1';
const UPC_BASE = 'https://api.upcitemdb.com/prod/trial/lookup';

function corsHeaders(origin){
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

async function proxyJson(upstreamUrl, headers){
  const upstreamRes = await fetch(upstreamUrl.toString());
  const body = await upstreamRes.text();
  return new Response(body, {
    status: upstreamRes.status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default {
  async fetch(request, env){
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';
    const headers = corsHeaders(origin);

    if(request.method === 'OPTIONS'){
      return new Response(null, { headers });
    }
    if(request.method !== 'GET'){
      return new Response('Not found', { status: 404, headers });
    }

    if(url.pathname.startsWith('/tgdb/')){
      const upstreamUrl = new URL(TGDB_BASE + url.pathname.slice('/tgdb'.length));
      for(const [k, v] of url.searchParams) upstreamUrl.searchParams.set(k, v);
      upstreamUrl.searchParams.set('apikey', env.TGDB_API_KEY);
      return proxyJson(upstreamUrl, headers);
    }

    if(url.pathname === '/upc'){
      const code = url.searchParams.get('code');
      if(!code) return new Response(JSON.stringify({ error: 'code manquant' }), { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } });
      const upstreamUrl = new URL(UPC_BASE);
      upstreamUrl.searchParams.set('upc', code);
      return proxyJson(upstreamUrl, headers);
    }

    return new Response('Not found', { status: 404, headers });
  },
};
