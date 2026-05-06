const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const port = process.env.PORT || 3000;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

function safeResolve(urlPath) {
  const normalized = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '');
  const resolved = path.normalize(path.join(rootDir, normalized));
  if (!resolved.startsWith(rootDir)) {
    return null;
  }
  return resolved;
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  const resolvedPath = safeResolve(req.url);
  if (!resolvedPath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
    sendFile(res, resolvedPath);
    return;
  }

  const fallback = path.join(rootDir, 'index.html');
  if (fs.existsSync(fallback)) {
    sendFile(res, fallback);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(port, () => {
  console.log(`Frontend server running on http://localhost:${port}`);
});