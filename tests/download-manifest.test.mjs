import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTestRelease} from '../src/download-manifest.js';

const root = 'https://github.com/CaliBG/tongkuang/releases';
const android = {
  status: 'testing',
  format: 'apk',
  version: '0.1.2-alpha',
  sha256: 'b244cf0608df658ed6da5cd7df1290f30c67d9275c1389c66458c9f8ed310e43',
  sizeBytes: 62914560,
  url: `${root}/download/public-test-0.1.2/Tongkuang-Android-0.1.2-alpha.apk`,
  releaseNotesUrl: `${root}/tag/public-test-0.1.2`,
};
const harmony = {...android};

test('accepts same-site mirrors at both root and GitHub Pages subpaths', () => {
  for (const [platform, item] of [['android', android], ['harmony', harmony]]) {
    const mirrored = {
      ...item,
      url: item.url.replace(`${root}/download/`, 'downloads/'),
      releaseNotesUrl: 'downloads/public-test-0.1.2/release-notes.html',
    };
    const parsed = parseTestRelease(mirrored, platform);
    assert.ok(parsed);
    for (const base of ['https://example.com/', 'https://example.com/tongkuang/']) {
      assert.equal(new URL(parsed.url, base).href, base + mirrored.url);
    }
  }
});

test('rejects ambiguous mirror paths, mixed origins and mismatched release notes', () => {
  const mirrored = {
    ...android,
    url: 'downloads/public-test-0.1.2/Tongkuang-Android-0.1.2-alpha.apk',
    releaseNotesUrl: 'downloads/public-test-0.1.2/release-notes.html',
  };
  for (const url of [
    `/${mirrored.url}`, `//evil.example/${mirrored.url}`, `../${mirrored.url}`,
    mirrored.url.replace('downloads/', 'downloads/../'),
    mirrored.url.replace('downloads/', 'downloads%2F'),
    mirrored.url.replace('downloads/', 'downloads\\'),
    `${mirrored.url}?redirect=1`, `${mirrored.url}#download`,
    `${mirrored.url}\n`, ` ${mirrored.url}`,
  ]) assert.equal(parseTestRelease({...mirrored, url}, 'android'), null, url);
  for (const releaseNotesUrl of [android.releaseNotesUrl, 'downloads/other/release-notes.html', '//evil.example/notes']) {
    assert.equal(parseTestRelease({...mirrored, releaseNotesUrl}, 'android'), null);
  }
  assert.equal(parseTestRelease({...android, releaseNotesUrl: mirrored.releaseNotesUrl}, 'android'), null);
});

test('accepts one Android APK for Android and APK-compatible Harmony', () => {
  for (const [platform, item] of [['android', android], ['harmony', harmony]]) {
    const {status, ...expected} = item;
    assert.deepEqual(parseTestRelease(item, platform), expected);
  }
  assert.ok(parseTestRelease(android, 'harmony'));
  assert.equal(parseTestRelease({...harmony, format: 'source-zip'}, 'harmony'), null);
});

test('future release tags work and only validated public metadata is returned', () => {
  const future = {
    ...android,
    version: '1.2.3-beta.2',
    url: `${root}/download/v1.2.3-beta.2/Tongkuang-Android-1.2.3-beta.2.apk`,
    releaseNotesUrl: `${root}/tag/v1.2.3-beta.2`,
    sha256: android.sha256.toUpperCase(),
    extra: '<script>untrusted metadata</script>',
  };
  const parsed = parseTestRelease(future, 'android');
  assert.equal(parsed.version, future.version);
  assert.equal(parsed.sha256, android.sha256);
  assert.equal(Object.hasOwn(parsed, 'extra'), false);
  assert.equal(Object.hasOwn(parsed, 'status'), false);
});

test('rejects untrusted hosts, repositories and ambiguous URL syntax', () => {
  const urls = [
    android.url.replace('https:', 'http:'),
    android.url.replace('github.com', 'github.com.evil.example'),
    android.url.replace('github.com', 'github.com@evil.example'),
    android.url.replace('github.com', 'user:secret@github.com'),
    android.url.replace('github.com', 'github.com:443'),
    android.url.replace('CaliBG', 'someone-else'),
    android.url.replace('/tongkuang/', '/tongkuang-copy/'),
    android.url.replace('/download/', '/download/../download/'),
    android.url.replace('/public-test-', '/%70ublic-test-'),
    android.url.replace('/download/', '/download%2F'),
    android.url.replace('/download/', '\\download\\'),
    `${android.url}?download=1`,
    `${android.url}#download`,
    ` ${android.url}`,
    `${android.url}\n`,
    '/Tongkuang-Android.apk',
    'javascript:alert(1)',
  ];
  for (const url of urls) {
    assert.equal(parseTestRelease({...android, url}, 'android'), null, url);
  }
});

test('requires matching release notes and the actual advertised artifact type', () => {
  for (const patch of [
    {status: 'development'},
    {status: 'ready'},
    {format: 'hap'},
    {format: 'source-zip'},
    {url: android.url.replace('.apk', '.zip')},
    {url: android.url.replace('.apk', '.apk.exe')},
    {releaseNotesUrl: `${root}/tag/a-different-release`},
    {releaseNotesUrl: `${android.releaseNotesUrl}?redirect=1`},
    {releaseNotesUrl: 'https://example.com/notes'},
  ]) {
    assert.equal(parseTestRelease({...android, ...patch}, 'android'), null);
  }
  for (const patch of [
    {format: 'hap'},
    {format: 'source-zip'},
    {url: harmony.url.replace('.apk', '.hap')},
    {url: harmony.url.replace('.apk', '-source.zip')},
  ]) {
    assert.equal(parseTestRelease({...harmony, ...patch}, 'harmony'), null);
  }
});

test('rejects missing, malformed and wrongly typed metadata', () => {
  for (const value of [null, undefined, false, 'testing', 123, [], {}]) {
    assert.equal(parseTestRelease(value, 'android'), null);
  }
  for (const key of Object.keys(android)) {
    const missing = {...android};
    delete missing[key];
    assert.equal(parseTestRelease(missing, 'android'), null, `missing ${key}`);
  }
  for (const patch of [
    {version: ''},
    {version: ' 0.1.2 '},
    {version: 123},
    {sha256: android.sha256.slice(1)},
    {sha256: 'z'.repeat(64)},
    {sha256: 123},
    {sizeBytes: '62914560'},
    {sizeBytes: 0},
    {sizeBytes: -1},
    {sizeBytes: 1.2},
    {sizeBytes: Number.MAX_SAFE_INTEGER + 1},
    {sizeBytes: Infinity},
    {sizeBytes: NaN},
    {url: {href: android.url}},
  ]) {
    assert.equal(parseTestRelease({...android, ...patch}, 'android'), null);
  }
  assert.equal(parseTestRelease(android, 'ios'), null);
});
