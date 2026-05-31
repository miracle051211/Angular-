import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const startUrl = process.argv[2] ?? 'https://nodcoding.com/';
const outputDir =
  process.argv[3] ?? path.resolve(__dirname, '../downloads/nodcoding-application-assets');
const maxFiles = Number(process.env.MAX_FILES ?? 600);
const fetchTimeoutMs = Number(process.env.FETCH_TIMEOUT_MS ?? 15000);
const includeResponsiveImages = process.env.INCLUDE_RESPONSIVE_IMAGES === '1';
const includeDeepImages = process.env.INCLUDE_DEEP_IMAGES === '1';
const includeLazyGalleryImages = process.env.INCLUDE_LAZY_GALLERY_IMAGES === '1';

const rootUrl = new URL(startUrl);
const queue = [rootUrl.href];
const seen = new Set();
const downloaded = [];

const categories = ['normal', 'CSS', 'Font', 'Image', 'JavaScript', 'Other'];

for (const category of categories) {
  await mkdir(path.join(outputDir, category), { recursive: true });
}

function normalizeUrl(value, baseUrl) {
  if (!value) {
    return null;
  }

  const cleaned = value
    .trim()
    .replace(/^url\((.*)\)$/i, '$1')
    .replace(/^['"]|['"]$/g, '');

  if (
    !cleaned ||
    cleaned.startsWith('#') ||
    cleaned.startsWith('data:') ||
    cleaned.startsWith('blob:') ||
    cleaned.startsWith('mailto:') ||
    cleaned.startsWith('tel:')
  ) {
    return null;
  }

  try {
    const url = new URL(cleaned, baseUrl);

    if (url.hostname !== rootUrl.hostname) {
      return null;
    }

    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

function isAssetUrl(url) {
  const parsed = new URL(url);
  const pathname = parsed.pathname.toLowerCase();

  return (
    pathname === '/' ||
    /\.(css|js|mjs|json|webmanifest|xml|txt|png|jpe?g|webp|gif|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|mov|lottie)$/i.test(
      pathname,
    )
  );
}

function isResponsiveVariant(url) {
  return /-\d+x\d+\.(?:png|jpe?g|webp|avif)$/i.test(new URL(url).pathname);
}

function isLazyGalleryImage(url) {
  return /\/home-(?:experience|accommodation|islands|more-ikea|foodies)-/i.test(
    new URL(url).pathname,
  );
}

function shouldKeepDiscoveredUrl(url, sourceKind) {
  if (!isAssetUrl(url)) {
    return false;
  }

  const category = classify(url);

  if (category !== 'Image') {
    return true;
  }

  if (sourceKind === 'srcset' && !includeResponsiveImages) {
    return false;
  }

  if (sourceKind === 'deep-text' && !includeDeepImages) {
    return false;
  }

  if (sourceKind !== 'html-direct' && isResponsiveVariant(url) && !includeResponsiveImages) {
    return false;
  }

  if (isLazyGalleryImage(url) && !includeLazyGalleryImages) {
    return false;
  }

  return true;
}

function classify(url, contentType = '') {
  const pathname = new URL(url).pathname.toLowerCase();

  if (contentType.includes('text/css') || pathname.endsWith('.css')) {
    return 'CSS';
  }

  if (
    contentType.includes('font/') ||
    /\.(woff2?|ttf|otf|eot)$/i.test(pathname)
  ) {
    return 'Font';
  }

  if (
    contentType.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|avif|svg|ico)$/i.test(pathname)
  ) {
    return 'Image';
  }

  if (
    contentType.includes('javascript') ||
    contentType.includes('ecmascript') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.mjs')
  ) {
    return 'JavaScript';
  }

  if (contentType.includes('text/html') || pathname === '/' || pathname.endsWith('.html')) {
    return 'normal';
  }

  return 'Other';
}

function safeName(url, category) {
  const parsed = new URL(url);
  let pathname = decodeURIComponent(parsed.pathname);

  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  if (!path.extname(pathname)) {
    pathname += category === 'normal' ? '.html' : '.bin';
  }

  const queryHash = parsed.search
    ? `__${createHash('sha1').update(parsed.search).digest('hex').slice(0, 8)}`
    : '';
  const ext = path.extname(pathname);
  const withoutExt = pathname.slice(0, -ext.length);
  const safePath = `${withoutExt}${queryHash}${ext}`
    .replace(/^\/+/, '')
    .replace(/[<>:"|?*]/g, '_');

  return path.join(outputDir, category, safePath);
}

function collectHtmlUrls(html, baseUrl) {
  const urls = new Set();
  const directAssetPattern =
    /\b(?:src|poster|data-src|data-lg-lottie)=["']([^"']+)["']/gi;
  const linkPattern = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
  const metaPattern = /<meta\b[^>]*\bcontent=["']([^"']+)["'][^>]*>/gi;
  const srcsetPattern = /\b(?:srcset|data-srcset)=["']([^"']+)["']/gi;
  const cssImportPattern = /@import\s+(?:url\()?["']?([^"')\s]+)["']?\)?/gi;
  const cssUrlPattern = /url\(([^)]+)\)/gi;

  for (const pattern of [directAssetPattern, cssImportPattern, cssUrlPattern]) {
    for (const match of html.matchAll(pattern)) {
      const url = normalizeUrl(match[1], baseUrl);
      if (url && shouldKeepDiscoveredUrl(url, 'html-direct')) {
        urls.add(url);
      }
    }
  }

  for (const match of html.matchAll(linkPattern)) {
    const tag = match[0].toLowerCase();
    const shouldKeep =
      tag.includes('stylesheet') ||
      tag.includes('preload') ||
      tag.includes('modulepreload') ||
      tag.includes('icon') ||
      tag.includes('manifest');
    const url = normalizeUrl(match[1], baseUrl);

    if (shouldKeep && url && shouldKeepDiscoveredUrl(url, 'html-direct')) {
      urls.add(url);
    }
  }

  for (const match of html.matchAll(metaPattern)) {
    const url = normalizeUrl(match[1], baseUrl);

    if (url && shouldKeepDiscoveredUrl(url, 'html-direct')) {
      urls.add(url);
    }
  }

  if (includeResponsiveImages) {
    for (const match of html.matchAll(srcsetPattern)) {
      for (const item of match[1].split(',')) {
        const url = normalizeUrl(item.trim().split(/\s+/)[0], baseUrl);
        if (url && shouldKeepDiscoveredUrl(url, 'srcset')) {
          urls.add(url);
        }
      }
    }
  }

  return urls;
}

function collectTextUrls(text, baseUrl) {
  const urls = new Set();
  const patterns = [
    /url\(([^)]+)\)/gi,
    /@import\s+(?:url\()?["']?([^"')\s]+)["']?\)?/gi,
    /["'`](https:\/\/nodcoding\.com\/[^"'`\s)]+\.(?:css|js|mjs|json|webmanifest|xml|txt|png|jpe?g|webp|gif|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|mov))["'`]/gi,
    /["'`](\/[^"'`\s)]+\.(?:css|js|json|png|jpe?g|webp|gif|avif|svg|ico|woff2?|ttf|otf|eot))["'`]/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const url = normalizeUrl(match[1], baseUrl);
      if (url && shouldKeepDiscoveredUrl(url, 'deep-text')) {
        urls.add(url);
      }
    }
  }

  return urls;
}

async function download(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  let response;

  try {
    response = await fetch(url, {
      headers: {
        accept: '*/*',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const finalUrl = response.url || url;
  const category = classify(finalUrl, contentType);
  const bytes = Buffer.from(await response.arrayBuffer());
  const filename = safeName(finalUrl, category);

  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, bytes);

  downloaded.push({
    url,
    finalUrl,
    category,
    contentType,
    bytes: bytes.length,
    file: path.relative(outputDir, filename).replaceAll(path.sep, '/'),
  });

  if (
    contentType.includes('text/html') ||
    contentType.includes('text/css') ||
    contentType.includes('javascript') ||
    contentType.includes('json')
  ) {
    const text = bytes.toString('utf8');
    const discovered = contentType.includes('text/html')
      ? collectHtmlUrls(text, finalUrl)
      : collectTextUrls(text, finalUrl);

    for (const discoveredUrl of discovered) {
      if (!seen.has(discoveredUrl) && queue.length + seen.size < maxFiles * 3) {
        queue.push(discoveredUrl);
      }
    }
  }
}

while (queue.length && downloaded.length < maxFiles) {
  const url = queue.shift();

  if (!url || seen.has(url)) {
    continue;
  }

  seen.add(url);

  try {
    await download(url);
    const latest = downloaded.at(-1);
    console.log(`[${latest.category}] ${latest.file}`);
  } catch (error) {
    downloaded.push({
      url,
      finalUrl: url,
      category: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    });
    console.warn(`[ERROR] ${url} - ${error instanceof Error ? error.message : String(error)}`);
  }
}

const manifestPath = path.join(outputDir, 'manifest.json');
await writeFile(manifestPath, JSON.stringify(downloaded, null, 2), 'utf8');

const summary = downloaded.reduce((result, item) => {
  result[item.category] = (result[item.category] ?? 0) + 1;
  return result;
}, {});

console.log('\nDone.');
console.log(`Output: ${outputDir}`);
console.log(`Manifest: ${manifestPath}`);
console.table(summary);
