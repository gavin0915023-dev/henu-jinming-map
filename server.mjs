import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
export function serve(port = 4173) {
  return createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const target = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!target.startsWith(resolve(root) + sep)) {
        response.writeHead(403).end();
        return;
      }
      const content = await readFile(target);
      response.writeHead(200, { 'Content-Type': types[extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
      response.end(content);
    } catch {
      response.writeHead(404).end('Not found');
    }
  }).listen(port, '127.0.0.1');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  serve(port).once('listening', () => console.log(`校园模型：http://127.0.0.1:${port}`));
}
