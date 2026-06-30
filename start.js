const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = 'C:/Users/sy/Documents/Codex/2026-06-29/ai-1-2-ai-3-ai/ai-clip-studio';
const nodeExe = 'C:/Users/sy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe';
const distDir = path.join(rootDir, 'apps/web/dist');
const serverMain = path.join(rootDir, 'apps/server/dist/apps/server/src/main.js');
const serverCwd = path.join(rootDir, 'apps/server');
const backendPort = 3001;
const frontendPort = 5173;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2'
};

// 1. Start backend
const backend = spawn(nodeExe, [serverMain], {
  cwd: serverCwd, detached: true, stdio: ['ignore', 'ignore', 'ignore']
});
console.log('Backend started (PID: ' + backend.pid + ')');

// 2. Start frontend server
http.createServer((req, res) => {
  // API proxy
  if (req.url.startsWith('/api/')) {
    const opts = {
      hostname: 'localhost', port: backendPort, path: req.url, method: req.method,
      headers: Object.assign({}, req.headers, { host: 'localhost:' + backendPort })
    };
    const proxy = http.request(opts, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxy.on('error', () => { res.writeHead(502); res.end('Proxy Error'); });
    req.pipe(proxy);
    return;
  }

  // Static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  let fullPath = path.join(distDir, filePath);
  if (!fs.existsSync(fullPath)) fullPath = path.join(distDir, 'index.html');

  const ext = path.extname(fullPath);
  const ct = MIME[ext] || 'application/octet-stream';

  fs.readFile(fullPath, (err, data) => {
    if (err) { res.writeHead(500); res.end('Error'); return; }
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  });
}).listen(frontendPort, () => {
  console.log('Frontend: http://localhost:' + frontendPort);
});