# Class Master – Hệ thống quản lý lớp chủ nhiệm

Web app quản lý lớp chủ nhiệm và phiếu tự đánh giá tuần của học sinh.
Tài liệu phân tích, thiết kế và lộ trình: [docs/THIET-KE.md](docs/THIET-KE.md).
Công nghệ: Next.js 15, PostgreSQL (Neon) + Prisma, Tailwind CSS. Triển khai trên Vercel.

## Vai trò

| Vai trò | Làm được gì |
|---|---|
| **Quản trị** | Quản lý năm học (mốc thời gian, khóa năm học, tạo lớp năm mới từ năm trước), xếp lớp học sinh theo năm học (mỗi học sinh 1 lớp/năm), tạo/sửa/khóa tài khoản giáo viên, tạo lớp, phân công GVCN, chuyển lớp cho học sinh, xóa cứng học sinh (có lưu vết), xem nhật ký thao tác, xem tổng quan toàn trường, tạo mẫu phiếu dùng chung |
| **Giáo viên** | Đặt lại mật khẩu chung cho cả lớp, tiêu chí xếp hạng tổ (tự động hoặc chấm tay, mỗi tiêu chí cộng/trừ sao, 1 sao quy ra điểm), quản lý tổ (tạo, đặt tên, thêm/bớt học sinh, chọn tổ trưởng), tiêu chí chấm điểm của lớp, duyệt phiếu tuần (duyệt & công bố, yêu cầu sửa, duyệt tất cả, chốt điểm, chấm thay), xác nhận bổ sung của tổ trưởng, xóa hẳn học sinh lớp mình (có lưu vết), nhập/xuất danh sách học sinh Excel, tìm kiếm và lọc theo tổ/trạng thái, cập nhật hàng loạt (phân tổ, nghỉ học, chuyển trường), cấp lại mật khẩu, soạn mẫu phiếu, tạo đợt tự đánh giá (tự đặt giờ mở/đóng), theo dõi tỷ lệ nộp, xem học sinh cần quan tâm, viết nhận xét và mục tiêu tuần tới, ghi nhận hành động tích cực, xem biểu đồ tiến bộ |
| **Học sinh** | Đăng nhập, làm phiếu tuần (tự khai số lần theo tiêu chí + tự nhận xét), xem điểm và xếp loại sau khi được duyệt, sửa phiếu khi GV yêu cầu; **tổ trưởng** xem phần tự chấm của các bạn trong tổ mình (không xem tổ khác) và đề xuất bổ sung vi phạm/nhận xét cho tổ viên, nhận phản hồi, xem hành trình tiến bộ và các mục tiêu, tự cập nhật địa chỉ |

## Không dùng AI: gợi ý theo quy tắc

Trong mẫu phiếu, mỗi lựa chọn trắc nghiệm có:
- **Điểm**: dùng để vẽ biểu đồ tiến bộ (quy về thang 0–100).
- **Cần quan tâm**: học sinh chọn ý này thì giáo viên thấy cảnh báo.
- **Mục tiêu gợi ý**: được đề xuất làm thử thách tuần tới.

Khi nhận xét, giáo viên bấm **"Điền gợi ý từ câu trả lời"** để có bản nháp, chỉnh sửa rồi mới gửi.
Học sinh chỉ thấy nhận xét **sau khi giáo viên bấm Gửi**.

Học sinh được hệ thống đánh dấu **cần quan tâm** khi có một trong các dấu hiệu sau:
- Mức tự đánh giá dưới 50%.
- Giảm từ 20 điểm trở lên so với đợt trước.
- Chọn ý được đánh dấu cần quan tâm.
- Không nộp phiếu 2 đợt liên tiếp.
- **Khẩn**: câu tự luận có từ khóa như *bắt nạt, bị đánh, tự tử, muốn chết...*. Danh sách từ khóa nằm ở `src/lib/questions.ts`.

## Triển khai lên Vercel

1. **Đưa mã nguồn lên GitHub.** Tạo một repo riêng tư rồi chạy:
   ```
   git remote add origin https://github.com/<tai-khoan>/<repo>.git
   git push -u origin main
   ```
2. **Tạo project trên Vercel.** Vào vercel.com → *Add New → Project* → chọn repo vừa tạo.
3. **Tạo cơ sở dữ liệu.** Trong project: *Storage → Create Database → Neon (Postgres)* → *Connect*.
   Vercel tự thêm các biến `DATABASE_URL` và `DATABASE_URL_UNPOOLED`. Nên chọn region Singapore cho gần Việt Nam.
4. **Thêm biến môi trường.** Vào *Settings → Environment Variables* và thêm:
   - `AUTH_SECRET`: chuỗi ngẫu nhiên từ 32 ký tự trở lên. Có thể tạo bằng lệnh `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   - `SETUP_KEY`: mật mã tự đặt, dùng một lần để tạo tài khoản quản trị.
5. **Deploy** (hoặc *Redeploy* nếu đã deploy trước đó). Lệnh build tự tạo các bảng trong cơ sở dữ liệu (`prisma migrate deploy`).
6. **Tạo tài khoản quản trị.** Mở `https://<ten-mien>/cai-dat`, nhập `SETUP_KEY` và thông tin quản trị viên.
   Bước này tạo luôn mẫu "Phiếu tự đánh giá tuần" dùng chung cho toàn trường.

## Quy trình sử dụng

1. **Quản trị:** kiểm tra mục *Năm học* (ngày khai giảng, bắt đầu học kỳ II, kết thúc); tạo tài khoản giáo viên (mật khẩu tạm hiện ra một lần), tạo lớp và chọn GVCN.
2. **Giáo viên:** vào *Lớp → Học sinh → Nhập danh sách từ Excel* (có file mẫu để tải).
   Bấm **Tải danh sách tài khoản** để lấy tên đăng nhập và mật khẩu tạm phát cho học sinh.
3. **Giáo viên:** tạo *Đợt tự đánh giá*, chọn mẫu phiếu và giờ mở/đóng. Có thể tạo cùng lúc cho nhiều lớp mình chủ nhiệm.
4. **Học sinh:** đăng nhập, đổi mật khẩu ở lần đầu, rồi làm phiếu. Được sửa phiếu trước giờ đóng.
5. **Giáo viên:** xem đợt, nhận xét từng em (có nút chuyển sang học sinh trước/sau) và theo dõi tổng quan lớp.

## Chạy trên máy

```
npm install
copy .env.example .env      # rồi điền DATABASE_URL... (có thể dùng chuỗi kết nối Neon)
npx prisma migrate deploy
npm run dev                 # http://localhost:3000
```

Khi thay đổi `prisma/schema.prisma`, chạy `npx prisma migrate dev --name <ten>` để tạo migration mới.

## Bảo mật và dữ liệu

- Mật khẩu được mã hóa bằng bcrypt. Phiên đăng nhập là cookie httpOnly, hết hạn sau 7 ngày.
  Mỗi trang đều kiểm tra lại quyền trong cơ sở dữ liệu.
- Giáo viên chỉ xem được lớp mình chủ nhiệm. Ghi chú loại "Cần quan tâm" học sinh không thấy được.
- Học sinh nghỉ học/chuyển trường được đổi trạng thái (tài khoản bị khóa, hồ sơ và phiếu vẫn giữ). Chỉ quản trị được xóa cứng, và bản chụp dữ liệu được lưu trong *Nhật ký thao tác*.
- Đăng nhập bằng mật khẩu được cấp (tạo tài khoản, cấp lại, đặt lại cả lớp) không bị bắt đổi ngay: hệ thống chỉ nhắc "Đổi mật khẩu / Để sau".
- Mọi người dùng tự cập nhật ảnh đại diện ở trang *Tài khoản*; ảnh được thu nhỏ trên máy (~256px) và lưu trong cơ sở dữ liệu, chỉ người đã đăng nhập mới xem được.
- Mã học sinh không được trùng trong cùng một năm học (mỗi học sinh một tài khoản/năm học).
- Các thao tác quan trọng (đăng nhập GV/quản trị, đăng nhập sai, cấp lại mật khẩu, khóa tài khoản, thêm/sửa/chuyển/xóa học sinh, xuất Excel...) được ghi vào *Nhật ký thao tác*.
- Đây là dữ liệu cá nhân của học sinh (Nghị định 13/2023/NĐ-CP).
  Nhà trường nên thông báo cho phụ huynh về việc thu thập dữ liệu, và không chia sẻ tài khoản quản trị.
