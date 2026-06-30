const http = require('http');
const fs = require('fs');
const path = require('path');

const distDir = path.join('C:\\Users\\sy\\Documents\\Codex\\2026-06-29\\ai-1-2-ai-3-ai\\ai-clip-studio', 'apps', 'web', 'dist');
const backendPort = 3001;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2'
};

http.createServer((req, res) => {
  // API proxy
  if (req.url.startsWith('/api/')) {
    const options = {
      hostname: 'localhost', port: backendPort, path: req.url, method: req.method,
      headers: { ...req.headers, host: 'localhost:' + backendPort }
    };
    const proxy = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxy.on('error', () => { res.writeHead(502); res.end('Proxy error'); });
    req.pipe(proxy);
    return;
  }

  // Serve static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  let fullPath = path.join(distDir, filePath);

  // SPA fallback - serve index.html for all routes
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(fullPath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(fullPath, (err, data) => {
    if (err) { res.writeHead(500); res.end('Server error'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}).listen(5173);

console.log('Frontend server: http://localhost:5173');