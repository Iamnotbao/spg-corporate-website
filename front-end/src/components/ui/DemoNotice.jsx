export default function DemoNotice({ children }) {
  return (
    <aside className="demo-notice">
      <span aria-hidden="true">预</span>
      <p>
        <strong>Bản xem trước giao diện</strong>
        {children ||
          ' Nội dung minh họa này sẽ được thay thế khi API học tập được triển khai.'}
      </p>
    </aside>
  );
}
