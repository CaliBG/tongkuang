/**
 * @typedef {Object} TestRelease
 * @property {string} url
 * @property {string} version
 * @property {string} sha256
 * @property {number} sizeBytes
 * @property {'apk'} format
 * @property {string} releaseNotesUrl
 */

// Match the original text rather than a normalized URL: encoded separators,
// credentials, dot segments and lookalike hosts must never become downloads.
const assetUrlPattern = /^https:\/\/github\.com\/CaliBG\/tongkuang\/releases\/download\/([A-Za-z0-9][A-Za-z0-9._-]*)\/([A-Za-z0-9][A-Za-z0-9._-]*)$/;
const mirrorUrlPattern = /^downloads\/([A-Za-z0-9][A-Za-z0-9._-]*)\/([A-Za-z0-9][A-Za-z0-9._-]*)$/;
const releaseNotesPrefix = 'https://github.com/CaliBG/tongkuang/releases/tag/';

/**
 * Accept this project's releases or verified copies under the site's downloads/.
 * Both entries are Android APKs; Harmony means APK-compatible systems only.
 *
 * @param {unknown} value One platform entry from downloads.json.
 * @param {'android' | 'harmony'} platform
 * @returns {TestRelease | null}
 */
export function parseTestRelease(value, platform) {
  if (platform !== 'android' && platform !== 'harmony') return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = /** @type {Record<string, unknown>} */ (value);
  const format = 'apk';
  if (item.status !== 'testing' || item.format !== format) return null;
  if (typeof item.version !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._+-]{0,79}$/.test(item.version)) return null;
  if (typeof item.sha256 !== 'string' || !/^[a-fA-F0-9]{64}$/.test(item.sha256)) return null;
  if (typeof item.sizeBytes !== 'number' || !Number.isSafeInteger(item.sizeBytes) || item.sizeBytes <= 0) return null;
  if (typeof item.url !== 'string') return null;
  const githubAsset = assetUrlPattern.exec(item.url);
  const asset = githubAsset || mirrorUrlPattern.exec(item.url);
  if (!asset) return null;
  const [, tag, filename] = asset;
  if (!filename.endsWith('.apk')) return null;
  const notesUrl = githubAsset ? `${releaseNotesPrefix}${tag}` : `downloads/${tag}/release-notes.html`;
  if (item.releaseNotesUrl !== notesUrl) return null;

  return {
    url: item.url,
    version: item.version,
    sha256: item.sha256.toLowerCase(),
    sizeBytes: item.sizeBytes,
    format,
    releaseNotesUrl: /** @type {string} */ (item.releaseNotesUrl),
  };
}
