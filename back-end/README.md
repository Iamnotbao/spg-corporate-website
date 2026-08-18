# SPG Backend

REST API Express cho nội dung công khai, tuyển dụng và dashboard quản trị. Dữ
liệu được lưu trong MongoDB; ảnh/CV có thể được lưu trên Cloudinary.

## Chạy local

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

API mặc định chạy tại `http://localhost:10000`.

## Scripts

```powershell
npm run dev # Nodemon, tự khởi động lại khi source thay đổi
npm start   # Chạy production-style
npm test    # Node test runner
```

## Cấu trúc `src`

```text
src/
├── config/       Cấu hình môi trường và MongoDB
├── controllers/  Xử lý nghiệp vụ/request
├── middleware/   Xác thực, upload và error handling
├── routes/       Public/admin API routes
├── utils/        Helper dùng chung
├── app.js        Khai báo Express app
└── server.js     Entry point lắng nghe cổng
```

## Endpoint chính

- `GET /health`
- `GET /api/posts`, `GET /api/posts/:id`
- `GET /api/jobs`, `GET /api/jobs/:id`
- `POST /api/applications`
- `POST /api/admin/verify`
- `/api/admin/*` yêu cầu JWT dạng `Authorization: Bearer <token>`

## Môi trường

Xem `.env.example`. Tối thiểu cần `MONGODB_URI`, `ADMIN_PASSWORD` và
`JWT_SECRET`. Không dùng giá trị mặc định của `ADMIN_PASSWORD` hoặc `JWT_SECRET`
trên môi trường production, và không commit `.env`.
