function withAmbientPlayback(url) {
  if (!url) return '';

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    parsed.searchParams.set('autoplay', '1');
    parsed.searchParams.set('mute', '1');
    parsed.searchParams.set('muted', '1');
    parsed.searchParams.set('playsinline', '1');
    parsed.searchParams.set('loop', '1');
    parsed.searchParams.set('controls', '0');

    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      parsed.searchParams.set('disablekb', '1');
      parsed.searchParams.set('fs', '0');
      parsed.searchParams.set('modestbranding', '1');
      parsed.searchParams.set('rel', '0');

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const videoId = host.includes('youtu.be')
        ? pathParts[0]
        : pathParts[pathParts.indexOf('embed') + 1] || parsed.searchParams.get('v');
      if (videoId) parsed.searchParams.set('playlist', videoId);
    }

    if (host.includes('vimeo.com')) {
      parsed.searchParams.set('background', '1');
      parsed.searchParams.set('title', '0');
      parsed.searchParams.set('byline', '0');
      parsed.searchParams.set('portrait', '0');
    }

    return parsed.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}autoplay=1&mute=1&muted=1&playsinline=1&loop=1&controls=0`;
  }
}

export default function VideoPlayer({ video, title = video.title }) {
  if (video.sourceType === 'cloudinary') {
    return (
      <video
        aria-label={title}
        autoPlay
        disablePictureInPicture
        loop
        muted
        playsInline
        poster={video.posterUrl || undefined}
        preload="auto"
        src={video.videoUrl}
        tabIndex="-1"
      >
        Trình duyệt không hỗ trợ video HTML5.
      </video>
    );
  }

  return (
    <iframe
      allow="autoplay; encrypted-media"
      loading="eager"
      referrerPolicy="strict-origin-when-cross-origin"
      src={withAmbientPlayback(video.embedUrl)}
      tabIndex="-1"
      title={title}
    />
  );
}
