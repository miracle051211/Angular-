import { API_ORIGIN } from '../services/api.config';

const DEFAULT_AVATAR_NAME = '\u6d1e\u5929';

export function mediaUrl(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  return `${API_ORIGIN}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

export function avatarUrl(value: string | null | undefined, username = DEFAULT_AVATAR_NAME): string {
  return mediaUrl(value) ?? fallbackAvatar(username);
}

function fallbackAvatar(username: string): string {
  const name = (username || DEFAULT_AVATAR_NAME).trim().slice(0, 2) || DEFAULT_AVATAR_NAME;
  const hue = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="hsl(${hue} 68% 84%)"/>
          <stop offset="100%" stop-color="hsl(${(hue + 24) % 360} 62% 76%)"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#g)"/>
      <text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle"
            fill="#231815" font-family="system-ui, sans-serif" font-size="40" font-weight="700">
        ${escapeSvg(name)}
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeSvg(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
