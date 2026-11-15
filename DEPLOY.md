# Deploy miễn phí: GitHub Pages + Render

| Phần | Dịch vụ | Địa chỉ |
|---|---|---|
| Frontend (`babything-ui`) | GitHub Pages | `https://lequyen17.github.io/Baby-Thing/` |
| Backend (`babything-api`) | Render, gói free | `https://<tên-service>.onrender.com` |
| PostgreSQL | Neon | |
| Redis | Upstash | |
| Ảnh | Cloudflare R2 | |

Lưu ý gói free:
- Render tắt server sau khoảng 15 phút không ai truy cập. Người đầu tiên vào sau đó phải chờ khoảng 1 phút để server khởi động lại.
- Ổ đĩa của Render bị xoá mỗi lần server khởi động lại, nên **bắt buộc dùng R2** để lưu ảnh.
- Frontend và API nằm ở hai domain khác nhau, nên server bật `REFRESH_TOKEN_IN_BODY=true`. Refresh token được lưu trong localStorage thay vì cookie HttpOnly. Lý do là Safari và iPhone chặn cookie bên thứ ba. Chạy bằng Docker Compose thì vẫn dùng cookie như cũ.

Làm lần lượt theo thứ tự dưới đây. Mật khẩu và khoá chỉ điền trên dashboard của từng dịch vụ, **không ghi vào repo**.

## 1. Neon (PostgreSQL)

1. Tạo project tại https://neon.tech, chọn region Singapore cho gần Việt Nam.
2. Vào **Connection Details**, **tắt "Connection pooling"** (Flyway cần kết nối trực tiếp, host không có chữ `-pooler`).
3. Chuỗi kết nối có dạng `postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require`. Tách ra thành:
   - `DB_URL` = `jdbc:postgresql://HOST/DBNAME?sslmode=require`
   - `DB_USERNAME` = `USER`
   - `DB_PASSWORD` = `PASSWORD`

Bảng được Flyway tự tạo ở lần chạy đầu tiên.

## 2. Upstash (Redis)

1. Tạo Redis database tại https://upstash.com, chọn region gần Singapore.
2. Lấy các giá trị sau:
   - **Endpoint** → `REDIS_HOST`
   - **Port** (6379) → `REDIS_PORT`
   - **Password** → `REDIS_PASSWORD`

## 3. Cloudflare R2 (ảnh)

1. Cloudflare Dashboard → R2 → tạo bucket.
2. Vào bucket → Settings → bật **Public Development URL** (`https://pub-xxx.r2.dev`). Giá trị này là `R2_PUBLIC_URL`, không có dấu `/` ở cuối.
3. R2 → **Manage API tokens** → tạo token quyền *Object Read & Write* cho bucket đó. Lấy `R2_ACCESS_KEY_ID` và `R2_SECRET_ACCESS_KEY`.
4. `R2_ACCOUNT_ID` lấy ở trang Overview, hoặc trên URL của dashboard.

## 4. Render (backend)

1. Đăng nhập https://render.com bằng GitHub. Render cần được cấp quyền đọc repo `lequyen17/Baby-Thing`. Repo thuộc tài khoản khác, nên chủ repo phải cho phép (hoặc bạn fork repo về tài khoản mình).
2. **New → Blueprint**, chọn repo. Render đọc file `render.yaml` ở thư mục gốc.
3. Điền các biến còn trống:
   - DB, Redis, R2: lấy từ các bước 1–3.
   - `APP_FRONTEND_URL` = `https://lequyen17.github.io/Baby-Thing`
   - `CORS_ALLOWED_ORIGINS` = `https://lequyen17.github.io` (chỉ phần origin, không có `/Baby-Thing`)
   - `GOOGLE_CLIENT_ID`: giống bản đang chạy, hoặc để trống để tắt đăng nhập Google.
   - `MAIL_*`: cấu hình SMTP như trong `.env`.
4. Đợi build xong, rồi mở `https://<tên-service>.onrender.com/api/products/categories`. Nếu thấy JSON là backend đã chạy.

Nếu email OTP không gửi được (có thể Render free chặn cổng SMTP), tạm đặt `MAIL_ENABLED=false`. Mã OTP khi đó sẽ in ra tab **Logs** trên Render.

## 5. GitHub Pages (frontend)

Cần quyền admin repo:
1. **Settings → Pages → Source**: chọn **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables** → New variable:
   - `VITE_API_URL` = `https://<tên-service>.onrender.com` (không có `/api`, không có `/` ở cuối)
3. Push lên `main` (hoặc vào tab **Actions → Deploy frontend to GitHub Pages → Run workflow**). Workflow `.github/workflows/deploy-pages.yml` sẽ build và đưa web lên Pages.

## 6. Google Sign-In (nếu dùng)

Google Cloud Console → Credentials → OAuth client → **Authorized JavaScript origins**: thêm `https://lequyen17.github.io`.

## 7. Kiểm tra

Mở web trên cả Chrome và Safari/iPhone, rồi kiểm tra lần lượt:
- Đăng ký
- Đăng nhập, F5 vẫn còn đăng nhập
- Đăng sản phẩm có ảnh
- Nhắn tin (realtime)
- Đăng xuất

## Đưa dữ liệu cũ lên (tuỳ chọn)

```bash
psql "postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require" -f backups/old-db-2026-11-08.sql
```

Chỉ nạp vào database trống, trước khi Render chạy lần đầu, để không xung đột với Flyway. Ảnh cũ lưu ở dạng `/api/uploads/...` trên máy cũ sẽ không hiển thị, vì file ảnh không nằm trên R2.
