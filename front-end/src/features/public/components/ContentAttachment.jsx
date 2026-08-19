export default function ContentAttachment({ item, label = 'Tài liệu đính kèm' }) {
  if (!item?.attachmentUrl) return null;

  return (
    <section className="public-content-attachment" aria-label={label}>
      <div>
        <span className="public-content-attachment__icon" aria-hidden="true">PDF</span>
        <div>
          <strong>{label}</strong>
          <span>{item.attachmentName || 'Xem tài liệu PDF'}</span>
        </div>
      </div>
      <a href={item.attachmentUrl} target="_blank" rel="noreferrer">
        Mở PDF
        <span aria-hidden="true">↗</span>
      </a>
    </section>
  );
}
