# SPG Frontend

Ứng dụng React gồm website công khai và dashboard quản trị nội dung.

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
├── app/                  Router cấp ứng dụng
├── features/
│   ├── admin/            Dashboard, hooks và component quản trị
│   └── public/           Trang công khai, detail và component website
├── services/             HTTP client và API theo từng miền nghiệp vụ
├── styles/               Global, public và admin styles
└── main.jsx              Entry point
```

Component chỉ xử lý trình bày và tương tác. Mọi lời gọi backend nằm trong
`services/`; state lấy dữ liệu dùng hook theo từng feature.

## Biến môi trường

Xem `.env.example`. Không commit `.env.local`.

- `VITE_API_URL`: backend API.
- `VITE_LOGO_URL`: logo công khai, có thể để trống để dùng wordmark SPG.
- Ảnh từ editor admin được gửi qua API đã xác thực; khóa Cloudinary chỉ nằm ở
  back-end.
