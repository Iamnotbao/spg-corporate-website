# Mandora Frontend

Ứng dụng React cho nền tảng học tiếng Trung Mandora. Phase 1 gồm nền tảng website
công khai, điểm vào đăng nhập học viên và dashboard quản trị hiện có.

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
│   ├── blog/             Trang Blog
│   └── public/           Trang và component website công khai
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
