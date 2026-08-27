export default function VideoPlayer({ video, title = video.title }) {
  if (video.sourceType === 'cloudinary') {
    return <video controls playsInline poster={video.posterUrl || undefined} preload="metadata" src={video.videoUrl}>Trình duyệt không hỗ trợ video HTML5.</video>;
  }
  return <iframe allow="fullscreen; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" src={video.embedUrl} title={title} />;
}
