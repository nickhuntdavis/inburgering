export async function handler() {
  const BASEROW_API = process.env.BASEROW_API || 'https://api.baserow.io';
  const TABLE_ID = process.env.BASEROW_TABLE_ID; // e.g., 640052
  const TOKEN = process.env.BASEROW_TOKEN;
  if (!TOKEN || !TABLE_ID) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing BASEROW_TOKEN/BASEROW_TABLE_ID' }) };
  }

  try {
    const size = 200; let page = 1; let all = [];
    while (true) {
      const url = `${BASEROW_API}/api/database/rows/table/${TABLE_ID}/?user_field_names=true&page=${page}&size=${size}`;
      const r = await fetch(url, { headers: { Authorization: `Token ${TOKEN}` } });
      if (!r.ok) return { statusCode: r.status, body: await r.text() };
      const j = await r.json();
      all = all.concat(j.results || []);
      if (!j.next) break;
      page += 1;
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300' },
      body: JSON.stringify({ results: all })
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: String(e) }) };
  }
}

