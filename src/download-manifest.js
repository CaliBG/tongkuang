/**
 * @typedef {Object} TestRelease
 * @property {string} url
 * @property {string} version
 * @property {string} sha256
 * @property {number} sizeBytes
 * @property {'apk' | 'source-zip'} format
 * @property {string} releaseNotesUrl
 */

// Match the original text rather than a normalized URL: encoded separators,
// credentials, dot segments and lookalike hosts must never become downloads.
const assetUrlPattern = /^https:\/\/github\.com\/CaliBG\/tongkuang\/releases\/download\/([A-Za-z0-9][A-Za-z0-9._-]*)\/([A-Za-z0-9][A-Za-z0-9._-]*)$/;
const releaseNotesPrefix = 'https://github.com/CaliBG/tongkuang/releases/tag/';

/**
 * Accept only explicitly published testing artifacts from this project's releases.
 * Harmony source archives are intentionally distinct from installable packages.
 *
 * @param {unknown} value One platform entry from downloads.json.
 * @param {'android' | 'harmony'} platform
 * @returns {TestRelease | null}
 */
export function parseTestRelease(value, platform) {
  if (platform !== 'android' && platform !== 'harmony') return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = /** @type {Record<string, unknown>} */ (value);
  const format = platform === 'android' ? 'apk' : 'source-zip';
  if (item.status !== 'testing' || item.format !== format) return null;
  if (typeof item.version !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._+-]{0,79}$/.test(item.version)) return null;
  if (typeof item.sha256 !== 'string' || !/^[a-fA-F0-9]{64}$/.test(item.sha256)) return null;
  if (typeof item.sizeBytes !== 'number' || !Number.isSafeInteger(item.sizeBytes) || item.sizeBytes <= 0) return null;
  if (typeof item.url !== 'string') return null;
  const asset = assetUrlPattern.exec(item.url);
  if (!asset) return null;
  const [, tag, filename] = asset;
  if (platform === 'android' ? !filename.endsWith('.apk') : !filename.endsWith('-source.zip')) return null;
  if (item.releaseNotesUrl !== `${releaseNotesPrefix}${tag}`) return null;

  return {
    url: item.url,
    version: item.version,
    sha256: item.sha256.toLowerCase(),
    sizeBytes: item.sizeBytes,
    format,
    releaseNotesUrl: /** @type {string} */ (item.releaseNotesUrl),
  };
}
