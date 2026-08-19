const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY || '';

function trustedEmbedUrl(value) {
  const source = String(value || '').trim();
  if (!source) return '';
  try {
    const url = new URL(source);
    const host = url.hostname.toLowerCase();
    const googleHost = host === 'google.com' || host === 'www.google.com' || host.endsWith('.google.com');
    return googleHost && url.pathname.startsWith('/maps/embed') ? url.href : '';
  } catch {
    return '';
  }
}

export function buildGoogleMapsEmbedUrl(location = {}) {
  const direct = trustedEmbedUrl(location.embedUrl);
  if (direct) return direct;
  if (!MAPS_KEY) return '';
  const query = String(location.address || location.name || '').trim();
  if (!query) return '';
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(MAPS_KEY)}&q=${encodeURIComponent(query)}`;
}

export default function GoogleMapEmbed({ location, name = '', address = '', title = 'Google Maps' }) {
  const resolved = location || { name, address };
  const src = buildGoogleMapsEmbedUrl(resolved);
  if (!src) return null;
  return (
    <div className="spg-map-embed">
      <iframe allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" src={src} title={title} />
    </div>
  );
}
