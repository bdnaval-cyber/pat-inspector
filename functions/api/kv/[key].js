// functions/api/kv/[key].js
// GET/PUT/DELETE a single key, backed directly by a Cloudflare KV namespace
// bound to this Pages project as PAT_KV. No external API, no credentials.

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestGet(context) {
  const { params, env } = context;
  try {
    if (!env.PAT_KV) return json({ error: 'PAT_KV binding not configured' }, 500);
    const key = decodeURIComponent(params.key);
    const value = await env.PAT_KV.get(key);
    if (value === null) return json({ error: 'not found' }, 404);
    return json({ key, value });
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}

export async function onRequestPut(context) {
  const { params, env, request } = context;
  try {
    if (!env.PAT_KV) return json({ error: 'PAT_KV binding not configured' }, 500);
    const key = decodeURIComponent(params.key);
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
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}

export async function onRequestDelete(context) {
  const { params, env } = context;
  try {
    if (!env.PAT_KV) return json({ error: 'PAT_KV binding not configured' }, 500);
    const key = decodeURIComponent(params.key);
    await env.PAT_KV.delete(key);
    return json({ key, deleted: true });
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}
