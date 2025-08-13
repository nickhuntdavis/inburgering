export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const BASEROW_API = process.env.BASEROW_API || 'https://api.baserow.io';
  const TABLE_ID = process.env.BASEROW_SUGGESTIONS_TABLE_ID || process.env.BASEROW_SUGGESTIONS_TABLE_ID || '641020';
  const TOKEN = process.env.BASEROW_TOKEN;
  if (!TOKEN || !TABLE_ID) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing BASEROW_TOKEN/BASEROW_SUGGESTIONS_TABLE_ID' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const now = new Date();
    const pad = (n)=> String(n).padStart(2,'0');
    const timestamp = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const payload = {
      slug: body.slug || '',
      front: body.front ?? '',
      back: body.back ?? '',
      description: body.description ?? '',
      name: body.name ?? '',
      anything_else: body.anything_else ?? '',
      timestamp,
    };

    const url = `${BASEROW_API}/api/database/rows/table/${TABLE_ID}/?user_field_names=true`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const txt = await r.text().catch(()=> '');
      return { statusCode: r.status, body: txt };
    }
    const json = await r.json();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, id: json.id || null }) };
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: String(e) }) };
  }
}


