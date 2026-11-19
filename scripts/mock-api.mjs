/**
 * Local mock API used by automated APIVue verification.
 *
 * Runs on 0.0.0.0:8788 so the Vite dev server can proxy /mock-api to it,
 * keeping every test request same-origin (no third-party traffic, no CORS
 * relaxation, no public proxy).
 */
import http from 'node:http';

const PORT = 8788;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': 'X-Request-Id',
};

function send(res, status, body, type = 'application/json', extra = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(payload),
    'X-Request-Id': 'mock-request-id',
    ...CORS,
    ...extra,
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString('utf8');

  if (url.pathname === '/json') {
    send(res, 200, {
      method: req.method,
      query: Object.fromEntries(url.searchParams),
      headers: {
        'content-type': req.headers['content-type'] ?? null,
        authorization: req.headers.authorization ?? null,
        'x-api-key': req.headers['x-api-key'] ?? null,
        'x-custom': req.headers['x-custom'] ?? null,
      },
      body: rawBody || null,
    });
    return;
  }

  if (url.pathname === '/text') {
    send(res, 200, 'plain text response body', 'text/plain');
    return;
  }

  if (url.pathname === '/empty') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (url.pathname === '/error') {
    send(res, 404, { error: 'Resource not found', code: 'NOT_FOUND' });
    return;
  }

  if (url.pathname === '/slow') {
    setTimeout(() => send(res, 200, { slow: true }), 60_000);
    return;
  }

  if (url.pathname === '/echo') {
    send(res, 201, { id: 'created-1', received: rawBody ? JSON.parse(rawBody) : null });
    return;
  }

  send(res, 200, { ok: true, path: url.pathname });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`mock api listening on http://0.0.0.0:${PORT}`);
});
