function withAutoplay(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('autoplay', '1');
    parsed.searchParams.set('mute', '1');
    parsed.searchParams.set('muted', '1');
    parsed.searchParams.set('playsinline', '1');
    return parsed.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}autoplay=1&mute=1&muted=1&playsinline=1`;
  }
}

export default function VideoPlayer({ video, title = video.title }) {
  if (video.sourceType === 'cloudinary') {
    return (
      <video
        autoPlay
        controls
        muted
        playsInline
        poster={video.posterUrl || undefined}
        preload="metadata"
        src={video.videoUrl}
      >
        Trình duyệt không hỗ trợ video HTML5.
      </video>
    );
  }

  return (
    <iframe
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      src={withAutoplay(video.embedUrl)}
      title={title}
    />
  );
}
