# Social Media Builder

Social Media Builder là workspace giúp đội ngũ nội dung chuẩn bị, duyệt, dựng và đăng video lên TikTok theo một quy trình có kiểm soát. Người dùng luôn chủ động kết nối tài khoản, chọn quyền riêng tư và xác nhận trước khi gửi nội dung; hệ thống không tự động đăng bài ngoài các điều kiện đã được phê duyệt.

## Tính năng chính

- Kết nối TikTok qua OAuth/Login Kit; token được mã hóa và lưu phía máy chủ.
- Xem thông tin tài khoản và danh sách video TikTok gần đây.
- Tải video MP4/MOV, nhập caption, chọn bản nháp hoặc đăng trực tiếp và quyền riêng tư do TikTok trả về.
- Dựng video từ vựng dọc 1080 × 1920 bằng FFmpeg với template có phiên bản.
- Import và kiểm tra theme JSON cho template trên giao diện quản trị.
- Nhận nội dung từ Discord/Google Sheets và điều phối lịch dựng, lưu trữ, đăng bài bằng n8n.
- Chống đăng trùng bằng idempotency key; retry có giới hạn và hỗ trợ đối soát trạng thái không chắc chắn.
- Khóa các luồng tự động hóa ở chế độ dry-run mặc định để tránh phát hành ngoài ý muốn.

## Kiến trúc

```text
Người dùng ──> Next.js web/API ──> TikTok API
                    │
                    ├──> Renderer (Node.js + FFmpeg) ──> MP4
                    │
Discord/Sheets ──> n8n ──> Cloudflare R2 ──> API đăng bài nội bộ
```

| Thành phần | Vai trò |
| --- | --- |
| `src/app` | Giao diện Next.js, TikTok OAuth, Studio và API nội bộ |
| `renderer` | Dịch vụ dựng video đồng bộ, cache theo idempotency key |
| `templates` | Theme, schema, asset và quy tắc thiết kế có phiên bản |
| `n8n/workflows` | Workflow nhập nội dung, lập lịch, retry và xuất bản |
| `src/lib` | TikTok session, scheduler, vocabulary ledger và logic chống trùng |

## Yêu cầu

- Node.js 20 trở lên và npm.
- Docker + Docker Compose nếu chạy đầy đủ web và renderer.
- Ứng dụng TikTok Developer với redirect URI đã đăng ký nếu kiểm thử kết nối/đăng bài.
- Khi chạy renderer ngoài Docker: FFmpeg có `libx264` và bộ font Noto Sans cần thiết.
- n8n, Google Sheets, Discord và Cloudflare R2 chỉ cần cho luồng tự động hóa.

## Bắt đầu nhanh

### Chạy web để phát triển

```bash
git clone https://github.com/CalisJI/social-media-builder.git
cd social-media-builder
npm install
cp .env.example .env.local
npm run dev
```

Mở <http://localhost:3000>. Trang giới thiệu có thể xem ngay; tính năng TikTok chỉ hoạt động sau khi điền credential và redirect URI hợp lệ trong `.env.local`.

```bash
npm run dev       # development server
npm run lint      # kiểm tra ESLint
npm test          # toàn bộ test cục bộ
npm run build     # tạo production build
npm start         # chạy production build
npm run test:n8n  # chỉ test workflow n8n
```

### Chạy full stack bằng Docker

Tạo `.env` cạnh `compose.yaml`, điền các biến bắt buộc theo `.env.example` và `DEPLOYMENT.md`, sau đó thêm:

```dotenv
RENDER_TEMPLATE_ADMIN_TOKEN=generate-a-separate-random-value
```

Tạo các secret độc lập, tối thiểu 32 byte, bằng `openssl rand -hex 32`, rồi khởi động:

```bash
docker compose up --build
```

- Web: <http://localhost:3000>
- Renderer health check: <http://localhost:3100/healthz>

Không commit `.env`; không dùng lại `SESSION_SECRET`, `N8N_SERVICE_TOKEN` hoặc `RENDER_TEMPLATE_ADMIN_TOKEN` cho nhau.

## Cấu hình môi trường

| Biến | Mục đích |
| --- | --- |
| `TIKTOK_ENV` | Chọn `sandbox` hoặc `production` |
| `*_TIKTOK_CLIENT_KEY`, `*_TIKTOK_CLIENT_SECRET` | Credential TikTok theo môi trường |
| `TIKTOK_REDIRECT_URI` | Callback OAuth; phải khớp tuyệt đối với TikTok Developer Portal |
| `TIKTOK_ALLOW_PUBLIC_POSTS` | Cho phép quyền riêng tư công khai; mặc định nên là `false` |
| `SESSION_SECRET` | Mã hóa cookie/session TikTok |
| `N8N_SERVICE_TOKEN` | Xác thực các API nội bộ được n8n gọi |
| `N8N_MEDIA_ALLOWED_HOSTS` | Host HTTPS được phép cấp video cho TikTok |
| `N8N_MEDIA_ALLOWED_PREFIXES` | Giới hạn namespace object media, mặc định `/cal-3/` |
| `TIKTOK_SESSION_FILE` | Nơi lưu session OAuth đã mã hóa |
| `PUBLISH_IDEMPOTENCY_FILE` | Nơi lưu trạng thái chống đăng trùng |
| `RENDER_TEMPLATE_ADMIN_TOKEN` | Bảo vệ API import template |

Danh sách và hướng dẫn production đầy đủ nằm trong [`DEPLOYMENT.md`](DEPLOYMENT.md). Không đưa secret vào workflow export, log hoặc source control.

## Cách sử dụng

### Đăng video thủ công

1. Mở trang chủ và chọn **Connect TikTok**.
2. Cấp các quyền cần thiết và hoàn tất callback OAuth.
3. Trong Studio, kiểm tra tài khoản đích và lịch sử video gần đây.
4. Chọn MP4/MOV (tối đa 50 MB trên giao diện demo), nhập caption, chế độ và quyền riêng tư.
5. Chọn **Review and send**, sau đó xác nhận lần cuối.
6. Lưu `publishId` được trả về và kiểm tra thông báo TikTok khi video được xử lý.

Nếu kết nối bị ngắt sau khi gửi, hãy kiểm tra trạng thái TikTok trước khi thử lại để tránh tạo bài trùng.

### Dựng thử video từ vựng

```bash
docker compose up --build renderer
curl http://localhost:3100/healthz
curl -f -X POST http://localhost:3100/v1/renders \
  -H 'content-type: application/json' \
  -H 'idempotency-key: vocab-demo-001' \
  --data-binary @payload-one-word-e2e.json
```

Gửi lại cùng key và nội dung sẽ trả file đã cache. Dùng cùng key với nội dung khác sẽ nhận HTTP 409.

### Import template

Mở `/template-import`, đặt version ID theo mẫu `ten-template-v2`, rồi tải hoặc chỉnh theme JSON và chọn **Import template**. Import không tự kích hoạt: cần lần lượt **Validate**, **Preview fixtures**, rồi **Activate**. API cần `RENDER_TEMPLATE_ADMIN_TOKEN`; renderer chỉ nhận theme JSON đã được duyệt, không nhận trực tiếp ảnh tham chiếu.

### Thiết lập n8n

Import workflow trong `n8n/workflows` ở trạng thái **inactive**, gắn credential tối thiểu cần thiết và chạy dry-run trước khi bật lịch. Tài liệu:

- [`n8n/README.md`](n8n/README.md): tổng quan và cấu hình workflow.
- [`n8n/SCHEDULING_AUTOMATION.md`](n8n/SCHEDULING_AUTOMATION.md): điều kiện nhận job, safety gate và rollback.
- [`n8n/VOCABULARY_COPY.md`](n8n/VOCABULARY_COPY.md): quy tắc làm giàu nội dung từ vựng.

## Kiểm thử

```bash
npm run lint
npm test
npm run build
```

Test dùng fixture/fault injection cục bộ và không gọi TikTok, R2 hay dịch vụ production. Kiểm tra renderer riêng bằng `cd renderer && npm test`.

## Nguyên tắc an toàn khi phát hành

- Dùng `TIKTOK_ENV=sandbox` và `TIKTOK_ALLOW_PUBLIC_POSTS=false` đến khi TikTok phê duyệt.
- Giữ `SCHEDULER_DRY_RUN=true`; chỉ mở từng gate đăng bài sau phê duyệt riêng.
- Không đổi idempotency key để vượt qua trạng thái `in_progress` hoặc `reconcile_required`.
- Khi dừng khẩn cấp, tắt workflow n8n và gate publish trước; giữ session, idempotency record và execution log để đối soát.
- Luôn dùng privacy option do Creator Info API trả về và để người dùng xác nhận trước khi đăng.

## Tài liệu liên quan

- [`DEPLOYMENT.md`](DEPLOYMENT.md): triển khai, TikTok OAuth, R2, retry và rollback.
- [`renderer/README.md`](renderer/README.md): API renderer, cấu hình FFmpeg và kiểm tra output.
- [`templates/vocabulary-pastel-v1/README.md`](templates/vocabulary-pastel-v1/README.md): hợp đồng thiết kế template mẫu.

## Giấy phép và tài sản

Repository chưa khai báo giấy phép mã nguồn ở cấp dự án. Không mặc định sao chép hoặc phân phối lại mã nguồn khi chưa có sự cho phép của chủ sở hữu. Asset/font đi kèm template có thông tin nguồn và giấy phép riêng tại `templates/*/assets/LICENSE.md`.
