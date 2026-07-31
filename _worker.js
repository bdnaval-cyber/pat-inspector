// _worker.js
// A single Cloudflare Worker that does two jobs:
//   1. Handles the app's tiny storage API (/api/kv/... and /api/kv-list),
//      backed by a KV namespace bound as PAT_KV.
//   2. Serves everything else (index.html, etc.) as static assets via the
//      ASSETS binding.
//
// This exists because Cloudflare's newer unified dashboard deploys
// "Connect to Git" projects as a static-assets Worker by default, which
// does NOT automatically execute a /functions folder the way classic Pages
// Functions did — so the API logic has to live in one explicit Worker
// script instead.

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleKey(request, env, key) {
  if (!env.PAT_KV) return json({ error: 'PAT_KV binding not configured' }, 500);
  try {
    if (request.method === 'GET') {
      const value = await env.PAT_KV.get(key);
      if (value === null) return json({ error: 'not found' }, 404);
      return json({ key, value });
    }
    if (request.method === 'PUT') {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: 'invalid JSON body' }, 400);
      }
      if (typeof body.value !== 'string') return json({ error: '"value" must be a string' }, 400);
      if (body.value.length > 24 * 1024 * 1024) return json({ error: 'value too large' }, 413);
      await env.PAT_KV.put(key, body.value);
      return json({ key, value: body.value });
    }
    if (request.method === 'DELETE') {
      await env.PAT_KV.delete(key);
      return json({ key, deleted: true });
    }
    return json({ error: 'method not allowed' }, 405);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}

async function handleList(request, env) {
  if (!env.PAT_KV) return json({ error: 'PAT_KV binding not configured' }, 500);
  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || '';
    const names = [];
    let cursor;
    do {
      const page = await env.PAT_KV.list({ prefix, cursor });
      page.keys.forEach((k) => names.push(k.name));
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
    return json({ keys: names });
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/kv-list') {
      return handleList(request, env);
    }
    const m = url.pathname.match(/^\/api\/kv\/(.+)$/);
    if (m) {
      return handleKey(request, env, decodeURIComponent(m[1]));
    }

    // Everything else: serve the static app files.
    return env.ASSETS.fetch(request);
  },
};
