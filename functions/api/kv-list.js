// functions/api/kv-list.js
// Lists key names under a prefix, backed by the same PAT_KV namespace.

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    if (!env.PAT_KV) return json({ error: 'PAT_KV binding not configured' }, 500);
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
