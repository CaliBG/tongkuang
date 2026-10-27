import {cp, mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {parseTestRelease} from '../src/download-manifest.js';

// Build a self-contained mirror from already published, checksum-verified files.
// Input folder: both release artifacts and <release-tag>.json from GitHub's API.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) throw new Error('Usage: node scripts/prepare-mirror.mjs <release-input-folder> <new-output-folder>');
const input = resolve(inputArg);
const output = resolve(outputArg);
const manifest = JSON.parse(await readFile(join(root, 'public/downloads.json'), 'utf8'));
const releases = new Map();
const files = [];
const escape = text => String(text).replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));

for (const platform of ['android', 'harmony']) {
  const entry = parseTestRelease(manifest[platform], platform);
  if (!entry || !entry.url.startsWith('https://github.com/CaliBG/tongkuang/releases/download/')) {
    throw new Error(`Expected a published GitHub release for ${platform}`);
  }
  const [tag, filename] = entry.url.split('/').slice(-2);
  const source = join(input, filename);
  const bytes = await readFile(source);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== entry.sizeBytes || sha256 !== entry.sha256) throw new Error(`Artifact checksum/size mismatch: ${filename}`);
  const release = JSON.parse(await readFile(join(input, `${tag}.json`), 'utf8'));
  if (release.tag_name !== tag || release.html_url !== entry.releaseNotesUrl || release.draft || typeof release.body !== 'string' || !release.body.trim()) {
    throw new Error(`Missing or mismatched published release notes: ${tag}`);
  }
  releases.set(tag, release);
  files.push({source, tag, filename, sha256, sizeBytes: bytes.length});
  manifest[platform] = {...manifest[platform], url: `downloads/${tag}/${filename}`, releaseNotesUrl: `downloads/${tag}/release-notes.html`};
  if (!parseTestRelease(manifest[platform], platform)) throw new Error(`Invalid mirror manifest: ${platform}`);
}

try { await stat(output); throw new Error(`Output already exists: ${output}`); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
execFileSync('npm', ['run', 'build'], {cwd: root, stdio: 'inherit'});
await mkdir(output, {recursive: true});
await cp(join(root, 'dist'), join(output, 'site'), {recursive: true});
const site = join(output, 'site');
for (const file of files) {
  await mkdir(join(site, 'downloads', file.tag), {recursive: true});
  await cp(file.source, join(site, 'downloads', file.tag, file.filename));
}
for (const [tag, release] of releases) {
  const html = `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(release.name)} — 同框</title><style>body{margin:0;background:#0c0c0c;color:#d7e2ea;font:16px/1.8 system-ui,sans-serif}main{max-width:850px;margin:auto;padding:48px 24px}a{color:inherit}h1{font-size:28px;line-height:1.4}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}small{color:#a2abb1}</style><main><a href="../../#download">← 返回同框下载</a><h1>${escape(release.name)}</h1><small>公开测试版本说明 · ${escape(tag)}</small><pre>${escape(release.body)}</pre></main></html>`;
  await writeFile(join(site, 'downloads', tag, 'release-notes.html'), html);
}
await writeFile(join(site, 'downloads.json'), JSON.stringify(manifest, null, 2) + '\n');
// The mirror must not fetch its social preview from GitHub. A known production
// URL can replace this site-relative image after the first deployment.
const index = await readFile(join(site, 'index.html'), 'utf8');
await writeFile(join(site, 'index.html'), index.replace('https://calibg.github.io/tongkuang/assets/icon.png', 'assets/icon.png'));
// Preserve public/_headers copied by Vite, including the performance policy.
await writeFile(join(output, 'verification.json'), JSON.stringify({createdAt:new Date().toISOString(), deployed:false, mainlandNetworkVerified:false, files: files.map(({source,...file}) => file)}, null, 2) + '\n');
console.log(`Mirror ready: ${site}`);
