import { usePageTitle } from '../../../hooks/usePageTitle.js';

export default function LoginPage() {
  usePageTitle('Đăng nhập');

  return (
    <section className="student-access-card" aria-labelledby="student-login-title">
      <p className="public-eyebrow">Không gian học viên</p>
      <h1 id="student-login-title">Đăng nhập Mandora</h1>
      <p>
        Cổng học viên sẽ được kết nối khi nền tảng tài khoản Mandora sẵn sàng trong V1.
      </p>
      <div className="student-access-card__notice" role="status">
        <span aria-hidden="true">学</span>
        <div>
          <strong>Chưa mở đăng nhập học viên</strong>
          <p>Không có tài khoản hoặc dữ liệu mẫu nào được tạo trong giai đoạn này.</p>
        </div>
      </div>
    </section>
  );
}
