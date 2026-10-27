import {readFile, writeFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import React from 'react';
import {renderToString} from 'react-dom/server';

// Ship the real page HTML: the first two photos are discovered by the browser
// without waiting for the React bundle. Hydration adds the existing interactions.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// This server only loads the SSR entry. Browser dependency scanning would race
// server.close() after rendering and log a misleading closed-server error.
const server = await createServer({root, server:{middlewareMode:true}, appType:'custom', optimizeDeps:{noDiscovery:true,include:[]}});
try {
  const {App} = await server.ssrLoadModule('/src/app.tsx');
  const html = await readFile(resolve(root, 'dist/index.html'), 'utf8');
  const content = renderToString(React.createElement(App));
  if (!content.includes('id="hero-title"') || !content.includes('hero-phone-front')) {
    throw new Error('The static first screen is missing');
  }
  if (!html.includes('<div id="root"></div>')) throw new Error('Root template changed');
  await writeFile(resolve(root, 'dist/index.html'), html.replace('<div id="root"></div>', `<div id="root">${content}</div>`));
  console.log('Rendered page HTML with responsive, high-priority hero photos.');
} finally {
  await server.close();
}
