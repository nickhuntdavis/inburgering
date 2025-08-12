import http from 'node:http';

const PORT = process.env.PORT || 8788;
const BASEROW_API = process.env.BASEROW_API || 'https://api.baserow.io';
const TABLE_ID = process.env.BASEROW_TABLE_ID || '639964';
const TOKEN = process.env.BASEROW_TOKEN;

if (!TOKEN) {
  console.warn('[baserow-proxy] Missing BASEROW_TOKEN env var. Set it before starting.');
}

async function fetchAllRows() {
  const size = 200;
  let page = 1;
  let all = [];
  while (true) {
    const url = `${BASEROW_API}/api/database/rows/table/${TABLE_ID}/?user_field_names=true&page=${page}&size=${size}`;
    const res = await fetch(url, {
      headers: { Authorization: `Token ${TOKEN}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(()=> '');
      console.error('[baserow-proxy] Fetch failed', res.status, body);
      throw new Error(`Baserow ${res.status}`);
    }
    const json = await res.json();
    all = all.concat(json.results || []);
    if (!json.next) break;
    page += 1;
  }
  return all;
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.end();

  if (req.url.startsWith('/cards')) {
    try {
      const rows = await fetchAllRows();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ results: rows }));
    } catch (e) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: String(e) }));
    }
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
});

server.listen(PORT, () => console.log(`[baserow-proxy] Listening on http://localhost:${PORT}/cards (table ${TABLE_ID})`));


