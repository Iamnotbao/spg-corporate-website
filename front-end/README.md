# Mandora Frontend

Ứng dụng React cho nền tảng học tiếng Trung Mandora. Frontend hiện có trải nghiệm công
khai cho Home, Courses, Course Detail, Lesson, HSK, Vocabulary, Characters, Practice và
Blog; cùng điểm vào đăng nhập học viên và dashboard quản trị hiện có.

Mandora Admin có điều hướng theo URL, sidebar responsive và các khu vực Dashboard,
Learning, Content, Users và System. Blog, Media, Chuyên mục Blog và tài khoản CMS tiếp tục
dùng API hiện có. Các trang quản trị học tập, Học viên, Tiến độ và Cài đặt chỉ là UI
foundation được gắn nhãn rõ ràng, chưa gửi yêu cầu lưu dữ liệu.

Các miền học tập chưa có API. Dữ liệu dùng để dựng giao diện nằm trong những module
`demo*` riêng và được gắn nhãn minh họa trên trang. Blog sử dụng Posts API hiện có nhưng
chỉ hiển thị bài thuộc các chuyên mục Mandora được cho phép.

## Chạy local

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Mở `http://localhost:5173`. Dashboard nằm tại `/admin`.

`VITE_API_URL` có thể là origin của backend (`http://localhost:10000`) hoặc URL
đầy đủ có `/api` (`http://localhost:10000/api`). Client sẽ chuẩn hóa hai dạng này.

## Scripts

```powershell
npm run dev          # Vite development server
npm run build        # Production build
npm run preview      # Xem production build local
npm run lint         # Kiểm tra JavaScript/React hooks
npm run format       # Format toàn bộ source
npm run format:check # Kiểm tra format trong CI
```

## Cấu trúc `src`

```text
src/
├── app/                  Router cấp ứng dụng và khai báo route
├── components/           Thành phần giao diện dùng chung
├── constants/            Điều hướng và hằng số giao diện
├── features/
│   ├── admin/            Dashboard, hooks và component quản trị hiện có
│   ├── auth/             Điểm vào xác thực học viên
│   ├── blog/             Blog công khai và lớp lọc Posts Mandora
│   ├── courses/          Course, Unit, Lesson UI và dữ liệu minh họa
│   ├── learning/         HSK, Vocabulary, Characters và Practice UI
│   └── public/           Home và component khung website công khai
├── hooks/                Hook dùng chung
├── layouts/              Public, Auth và Admin layouts
├── services/             HTTP client và API theo từng miền nghiệp vụ
├── styles/               Design tokens, public và admin styles
└── main.jsx              Entry point
```

Component chỉ xử lý trình bày và tương tác. Mọi lời gọi backend nằm trong
`services/`; state lấy dữ liệu dùng hook theo từng feature.

## Biến môi trường

Xem `.env.example`. Không commit `.env.local`.

- `VITE_API_URL`: backend API.
- `VITE_GOOGLE_MAPS_EMBED_KEY`: khóa bản đồ chỉ dùng cho module cấu hình trang cũ
  trong dashboard hiện có; có thể để trống.
- Ảnh từ editor admin được gửi qua API đã xác thực; khóa Cloudinary chỉ nằm ở
  back-end.
