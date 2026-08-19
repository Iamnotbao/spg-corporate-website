const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY || '';

export function buildGoogleMapsEmbedUrl(location = {}) {
  if (!MAPS_KEY) return '';
  const query = String(location.address || location.name || '').trim();
  if (!query) return '';
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(MAPS_KEY)}&q=${encodeURIComponent(query)}`;
}

export default function GoogleMapEmbed({ location, title = 'Google Maps' }) {
  const src = buildGoogleMapsEmbedUrl(location);
  if (!src) return null;
  return (
    <div className="spg-map-embed">
      <iframe
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        src={src}
        title={title}
      />
    </div>
  );
}
