# SPG Corporate Website

Website giới thiệu doanh nghiệp, tin tức, tuyển dụng và trang quản trị nội dung
của SPG.

## Cấu trúc dự án

```text
spg-corporate-website/
├── front-end/   React + Vite
└── back-end/    Express + MongoDB
```

## Chạy local

1. Tạo `back-end/.env` từ `back-end/.env.example` và điền các biến cần thiết.
2. Tạo `front-end/.env.local` từ `front-end/.env.example`.
3. Mở hai terminal:

```powershell
cd back-end
npm install
npm run dev
```

```powershell
cd front-end
npm install
npm run dev
```

Mặc định:

- Website: `http://localhost:5173`
- API: `http://localhost:10000/api`
- Admin: `http://localhost:5173/admin`
- Health check: `http://localhost:10000/health`

## Kiểm tra trước khi đẩy GitHub

```powershell
cd back-end
npm test

cd ..\front-end
npm run lint
npm run format:check
npm run build
```

Không commit `.env`, `.env.local` hoặc bất kỳ khóa bí mật nào.
