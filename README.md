# BabyThing

Trang thương mại điện tử BabyThing gồm:

| Service    | Image                    | Vai trò                                        |
| ---------- | ------------------------ | ---------------------------------------------- |
| `nginx`    | `nginx:1.27-alpine`      | Cổng duy nhất mở ra ngoài (port 80)            |
| `ui`       | `103487/babything-ui:v1.0`    | Giao diện React                                |
| `api`      | `103487/babything-api:v1.0`   | Backend Spring Boot                            |
| `postgres` | `postgres:17-alpine`     | Cơ sở dữ liệu                                  |
| `redis`    | `redis:7-alpine`         | OTP, rate limit, danh sách token đã thu hồi    |

Request vào `http://<host>/api/...` được chuyển sang `api`, còn lại được chuyển sang `ui`.

## Dùng thử không cần cài đặt

Bản demo: **https://navigate-backward-sage.ngrok-free.dev**

- Demo chạy trên máy cá nhân của tác giả và được mở ra Internet qua ngrok, nên **chỉ truy cập được khi máy đó đang bật**. Nếu gặp lỗi `ERR_NGROK_3200` (endpoint offline) thì máy đang tắt, hãy thử lại sau hoặc tự chạy theo hướng dẫn bên dưới.
- Lần đầu vào, ngrok hiện trang cảnh báo "You are about to visit...". Bấm **Visit Site** để vào ứng dụng.

## Yêu cầu

- Docker và Docker Compose v2 (`docker compose version`)
- Port 80 trên máy đang trống

## Cách 1: Chạy bằng image có sẵn trên Docker Hub

Không cần mã nguồn. Chỉ cần 3 file sau trong cùng một thư mục:

```
babything/
├── docker-compose.yml
├── .env                 # tạo từ .env.example
└── nginx/
    └── nginx.conf
```

Các bước:

```bash
# 1. Tạo file cấu hình rồi sửa giá trị (xem mục "Cấu hình .env")
cp .env.example .env

# 2. Tải image về
docker compose pull

# 3. Chạy (--no-build: không build lại vì máy không có mã nguồn)
docker compose up -d --no-build
```

Mở http://localhost.

## Cách 2: Build từ mã nguồn

Dùng khi bạn sửa code và muốn chạy bản vừa sửa:

```bash
cp .env.example .env
docker compose up -d --build
```

Để đẩy image mới lên Docker Hub: tăng tag trong `docker-compose.yml` (vd. `v1.0` → `v1.1`), rồi chạy:

```bash
docker login
docker compose build api ui
docker compose push api ui
```

Phải ghi rõ `api ui`. Nếu không, lệnh `push` sẽ cố đẩy cả các image chính thức `postgres`, `redis`, `nginx` và báo lỗi.

## Cấu hình `.env`

| Biến                | Bắt buộc | Ý nghĩa |
| ------------------- | -------- | ------- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Có | Tài khoản database. Postgres chỉ dùng các giá trị này **lần chạy đầu tiên** (xem phần Xử lý sự cố) |
| `JWT_SECRET`        | Có | Chuỗi ngẫu nhiên ≥ 32 ký tự, tạo bằng `openssl rand -base64 48` |
| `APP_FRONTEND_URL`  | Có | URL người dùng mở trên trình duyệt (vd. `http://localhost`), dùng để tạo link đặt lại mật khẩu trong email |
| `LOGIN_OTP_ENABLED` | Không | `true` (mặc định): đăng nhập phải nhập thêm mã OTP gửi qua email. `false`: chỉ cần email + mật khẩu |
| `MAIL_ENABLED`      | Có | `false`: không gửi email thật, mã OTP và link reset được in ra log (tiện khi chạy thử) |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | Khi `MAIL_ENABLED=true` | Thông tin SMTP. Với Gmail: `smtp.gmail.com`, port `587`, mật khẩu là [App Password](https://myaccount.google.com/apppasswords) |
| `GOOGLE_CLIENT_ID`  | Không | Để trống thì ẩn nút "Sign in with Google" |

### Bật đăng nhập Google

1. Vào [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), tạo **OAuth client ID** loại **Web application**.
2. Ở **Authorized JavaScript origins**, thêm đúng URL bạn mở ứng dụng, vd. `http://localhost`. Khi deploy lên domain thật thì thêm cả `https://your-domain.com`.
3. Điền client ID vào `GOOGLE_CLIENT_ID` trong `.env` rồi chạy `docker compose up -d` để áp dụng.

## Quản lý sản phẩm

Sau khi đăng nhập, header có hai mục:

- **Products** (`/products`): danh sách sản phẩm, có tìm theo tên/SKU, lọc theo danh mục, sắp xếp theo giá/tên/mới nhất và phân trang. Bấm vào sản phẩm để xem chi tiết.
- **History** (`/history`): những sản phẩm bạn đã mở, mới nhất ở trên, kèm số lần xem. Xoá được từng mục hoặc xoá hết.

Tài khoản **ADMIN** có thêm:

- Nút **New product**, **Edit**, **Delete** (xoá mềm: sản phẩm biến mất khỏi danh sách và lịch sử xem, SKU được dùng lại được).
- Trạng thái **Hidden** để ẩn sản phẩm khỏi khách mà không xoá.
- Mục **View history** ở trang chi tiết: tổng lượt xem và danh sách ai đã xem.

Ứng dụng chưa có trang phân quyền, nên cấp quyền ADMIN cho một tài khoản đã đăng ký bằng SQL (đăng nhập lại để quyền có hiệu lực):

```bash
docker compose exec postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> \
  -c "UPDATE users SET role = 'ADMIN' WHERE email = 'ban@example.com';"
```

API (chi tiết xem Swagger):

| Method | Đường dẫn | Quyền |
| ------ | --------- | ----- |
| `GET` | `/api/products?q=&category=&status=&minPrice=&maxPrice=&sort=&page=&size=` | Đã đăng nhập (`status` chỉ có tác dụng với ADMIN) |
| `GET` | `/api/products/categories` | Đã đăng nhập |
| `GET` | `/api/products/{id}` (đồng thời ghi một lượt xem) | Đã đăng nhập |
| `POST` / `PUT` / `DELETE` | `/api/products`, `/api/products/{id}` | ADMIN |
| `GET` | `/api/products/{id}/views` | ADMIN |
| `GET` / `DELETE` | `/api/users/me/product-history`, `/api/users/me/product-history/{productId}` | Đã đăng nhập |

`sort` nhận `newest` (mặc định), `oldest`, `price_asc`, `price_desc`, `name_asc`, `name_desc`. `page` bắt đầu từ 0, `size` tối đa 50.

## Quản lý đơn hàng

Mục **Orders** (`/orders`) trên header:

- **Danh sách đơn**: khách thấy đơn của mình, ADMIN thấy tất cả. Tìm theo mã đơn (`#12`), tên người nhận, số điện thoại (ADMIN tìm được cả email khách), lọc theo trạng thái, sắp xếp theo ngày/tổng tiền.
- **Tạo đơn**: nút **New order** hoặc **Order now** ở trang chi tiết sản phẩm. Chọn sản phẩm, số lượng, nhập thông tin giao hàng. Tồn kho bị trừ ngay khi đặt; không đủ hàng thì báo lỗi.
- **Xem đơn**: dòng hàng (tên, giá được lưu lại lúc đặt), tổng tiền, thông tin giao hàng, tiến trình xử lý.
- **Sửa đơn**: chỉ khi đơn còn **Pending**. Sửa được sản phẩm, số lượng và thông tin giao hàng; giá được cập nhật theo giá hiện tại.
- **Huỷ đơn**: khách huỷ được khi **Pending**, ADMIN huỷ được cả khi **Confirmed**. Huỷ thì hàng được cộng lại vào kho.
- ADMIN chuyển trạng thái theo thứ tự **Pending → Confirmed → Shipping → Delivered**.

| Method | Đường dẫn | Quyền |
| ------ | --------- | ----- |
| `GET` | `/api/orders?q=&status=&sort=&page=&size=` | Đã đăng nhập (khách chỉ thấy đơn của mình) |
| `GET` | `/api/orders/{id}` | Chủ đơn hoặc ADMIN |
| `POST` | `/api/orders` | Đã đăng nhập |
| `PUT` | `/api/orders/{id}` | Chủ đơn hoặc ADMIN, đơn đang `PENDING` |
| `POST` | `/api/orders/{id}/cancel` (body tuỳ chọn `{"reason": "..."}`) | Chủ đơn (`PENDING`) hoặc ADMIN (`PENDING`/`CONFIRMED`) |
| `PATCH` | `/api/orders/{id}/status` (body `{"status": "CONFIRMED"}`) | ADMIN |

`status` nhận `PENDING`, `CONFIRMED`, `SHIPPING`, `DELIVERED`, `CANCELLED`. `sort` nhận `newest` (mặc định), `oldest`, `total_desc`, `total_asc`.

## Lệnh thường dùng

```bash
docker compose ps                 # trạng thái các container
docker compose logs -f api        # xem log backend (cả OTP khi MAIL_ENABLED=false)
docker compose restart api        # khởi động lại một service
docker compose down               # dừng và xoá container (dữ liệu vẫn giữ)
docker compose down -v            # dừng và XOÁ LUÔN dữ liệu postgres + redis
```

Tài liệu API (Swagger): http://localhost/api/swagger-ui.html

### Cập nhật lên phiên bản mới

1. Sửa tag image trong `docker-compose.yml`.
2. Chạy:

```bash
docker compose pull
docker compose up -d --no-build
```

Schema database được tạo và cập nhật tự động khi `api` khởi động, không cần chạy migration bằng tay.

## Chia sẻ ra Internet bằng ngrok

Bản demo ở đầu README được mở ra Internet theo cách này. Nó dùng được khi máy chạy Docker không có IP public hay tên miền.

1. Cài [ngrok](https://ngrok.com/download) rồi đăng nhập: `ngrok config add-authtoken <token>`.
2. Lấy tên miền miễn phí cố định ở [Dashboard → Domains](https://dashboard.ngrok.com/domains). Nếu không có tên miền cố định, mỗi lần chạy ngrok sẽ ra URL mới và bạn phải sửa lại cấu hình ở bước 3.
3. Cập nhật cấu hình cho đúng URL ngrok:
   - Trong `.env`: `APP_FRONTEND_URL=https://<ten-mien>.ngrok-free.dev` (dùng để tạo link đặt lại mật khẩu trong email), rồi chạy `docker compose up -d`.
   - Nếu bật đăng nhập Google: thêm `https://<ten-mien>.ngrok-free.dev` vào **Authorized JavaScript origins** của OAuth client.
4. Sau khi `docker compose up -d` đã chạy, mở tunnel tới port 80:

   ```bash
   ngrok http 80 --url=https://<ten-mien>.ngrok-free.dev
   ```

Ứng dụng chỉ truy cập được khi cả Docker và lệnh `ngrok` đều đang chạy. Tắt cửa sổ ngrok hoặc tắt máy thì link ngừng hoạt động.

## Xử lý sự cố

**Không mở được http://localhost / lỗi `port is already allocated`**
Port 80 đang bị chương trình khác dùng (IIS, Skype, một web server khác...). Có thể đổi sang port khác, vd. trong `docker-compose.yml` sửa `"80:80"` thành `"8080:80"`. Khi đó cũng phải cập nhật `APP_FRONTEND_URL` và Google JavaScript origin thành `http://localhost:8080`.

**`api` khởi động lỗi hoặc liên tục restart**
Xem `docker compose logs api`. Nguyên nhân hay gặp:
- Thiếu biến trong `.env`.
- `JWT_SECRET` ngắn hơn 32 ký tự.
- Postgres chưa sẵn sàng. Lỗi này tự hết sau vài giây, chạy lại `docker compose up -d`.

**Đổi `POSTGRES_PASSWORD` xong thì `api` không kết nối được database**
Postgres chỉ đọc tài khoản trong `.env` khi tạo dữ liệu lần đầu. Có hai cách:
- Đặt lại mật khẩu cũ trong `.env`.
- Chạy `docker compose down -v` rồi chạy lại. Cách này **xoá toàn bộ dữ liệu**.

**Không nhận được email OTP**
Kiểm tra cấu hình SMTP trong `.env` và log `docker compose logs api`. Nếu chỉ chạy thử, đặt `MAIL_ENABLED=false` rồi lấy mã OTP trong log.

**Không thấy nút Google / bấm vào báo lỗi `origin_mismatch`**
- Không thấy nút: kiểm tra `GOOGLE_CLIENT_ID` đã được điền và đã chạy lại `docker compose up -d`.
- Lỗi `origin_mismatch`: URL trên thanh địa chỉ (gồm cả port) chưa được thêm vào Authorized JavaScript origins.
