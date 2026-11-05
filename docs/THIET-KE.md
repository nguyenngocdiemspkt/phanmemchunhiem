# CLASS MASTER – Tài liệu phân tích & thiết kế

Tài liệu này mô tả hướng nâng cấp ứng dụng **Sổ chủ nhiệm** hiện có thành **CLASS MASTER – Hệ thống quản lý lớp chủ nhiệm thông minh**.
Hệ thống đang chạy thật với dữ liệu thật, nên mọi thay đổi cơ sở dữ liệu đều là migration **bổ sung, không phá hủy**.

---

## 1. Phân tích yêu cầu nghiệp vụ

### 1.1. Hiện trạng so với yêu cầu

| Nhóm chức năng | Đã có | Cần bổ sung |
|---|---|---|
| Đăng nhập, phân quyền | Đăng nhập tên/mật khẩu, bcrypt, cookie phiên ký HS256, bắt đổi mật khẩu lần đầu; 3 vai trò Admin/GV/HS; mỗi trang kiểm tra lại quyền trong DB | Nhật ký thao tác (audit log); khóa tạm khi đăng nhập sai nhiều lần |
| Quản lý giáo viên | Tạo, cấp lại mật khẩu, khóa/mở | Sửa thông tin, lọc/tìm kiếm |
| Năm học | Chỉ là chuỗi `schoolYear` gắn vào lớp | Thực thể Năm học: ngày bắt đầu, học kỳ II, kết thúc, năm hiện tại, khóa/lưu trữ; đánh số tuần học |
| Lớp học | Tạo, sửa, phân công GVCN, xóa lớp trống | Chọn năm học từ danh mục |
| Hồ sơ học sinh | Thêm, nhập Excel, sửa, khóa, xóa cứng, phân tổ | Trạng thái (đang học / đã chuyển lớp / đã nghỉ), chuyển lớp giữ lịch sử, ghi chú, tìm kiếm, lọc theo tổ, xuất Excel, cập nhật hàng loạt; chặn xóa cứng với GV |
| Phiếu tự đánh giá tuần | Mẫu phiếu tùy biến, đợt có giờ mở/đóng, HS nộp/sửa trước hạn, GV nhận xét nháp/gửi | Bộ tiêu chí A–D với 3 mức Tốt/Đạt/Cần cố gắng; 3 câu tự nhận xét; quy trình **Đã nộp → Đã duyệt / Yêu cầu sửa → Công bố → Khóa**; duyệt hàng loạt; HS không sửa được phiếu đã duyệt |
| Thi đua tổ | Phân tổ, cán sự ghi điểm, danh mục cộng/trừ, xếp hạng tuần và cả năm | Điểm tự động từ kết quả đánh giá (tỷ lệ nộp đúng hạn, học tập, nội quy, vệ sinh, đoàn kết, việc tốt) có trọng số GV tự đặt; xếp hạng tháng/học kỳ; lịch sử thứ hạng; biểu đồ so sánh |
| Tiến bộ cá nhân | Biểu đồ điểm qua các đợt, ghi nhận tích cực/tiến bộ/cần quan tâm, mục tiêu | Tổng hợp tháng/học kỳ, so sánh đầu–cuối kỳ, phát hiện xu hướng (tiến bộ liên tục, giảm sút, thường xuyên chưa nộp) |
| Phụ huynh | Link bí mật `/ph/<mã>` không cần đăng nhập; nút soạn sẵn SMS/sao chép | Mã QR, nhật ký gửi (chưa gửi/thành công/thất bại), kênh Email/Zalo ZNS tùy chọn; chỉ gửi kết quả đã duyệt |
| Dashboard, báo cáo | Tổng quan trường, tổng quan lớp | Thống kê Tốt/Đạt/Cần cố gắng, lọc tuần/tháng/học kỳ/năm học, xuất báo cáo |
| Sao lưu | Không có | Admin tải bản sao lưu JSON toàn hệ thống và phục hồi có kiểm soát |

### 1.2. Nguyên tắc nghiệp vụ xuyên suốt

1. **Lấy sự tiến bộ của học sinh làm trung tâm.** Hệ thống chỉ đưa *cảnh báo tham khảo* cho giáo viên, không tự gắn nhãn "yếu kém", không công khai xếp hạng cá nhân. Học sinh chỉ thấy thứ hạng tổ, không thấy thứ hạng cá nhân của bạn.
2. **Không có gì đến tay học sinh/phụ huynh khi giáo viên chưa duyệt.**
3. **Không mất lịch sử.** Phiếu đã duyệt không bị xóa cứng bởi giáo viên; chuyển lớp giữ nguyên phiếu cũ; mọi thao tác quan trọng được ghi nhật ký.
4. **Một học sinh – một tài khoản trong một năm học**: mã học sinh không trùng trong cùng năm học.

---

## 2. Kiến trúc hệ thống

### 2.1. Lựa chọn nền tảng: giữ PostgreSQL (Neon) + Prisma, không chuyển sang Firebase/Supabase

| Tiêu chí | Neon Postgres + Prisma (hiện tại) | Supabase | Firebase (Firestore) |
|---|---|---|---|
| Mô hình dữ liệu | Quan hệ: hợp với học sinh–lớp–tuần–tổ, báo cáo tổng hợp bằng SQL | Quan hệ (Postgres) | NoSQL: tổng hợp, xếp hạng, báo cáo khó và tốn lượt đọc |
| Gói miễn phí | 0,5 GB/dự án, tự ngủ khi rảnh, tự thức khi có truy cập | 500 MB, **dự án bị tạm dừng sau 7 ngày không hoạt động** (rủi ro dịp nghỉ hè/Tết) | Tính phí theo lượt đọc/ghi |
| Chi phí chuyển đổi | 0 (đang chạy, có dữ liệu thật) | Phải viết lại xác thực + chuyển dữ liệu | Viết lại gần như toàn bộ |
| Bảo mật | Mọi truy cập DB đi qua server, kiểm quyền trong từng action | RLS mạnh nhưng phải viết lại toàn bộ chính sách | Security Rules |

Ước tính dung lượng: 1.000 học sinh × 35 tuần × ~3 KB/phiếu ≈ 100 MB/năm, đủ nằm trong gói miễn phí vài năm. Khi vượt, có thể nâng cấp Neon hoặc chuyển sang bất kỳ Postgres nào (kể cả Supabase) bằng `pg_dump`, không phải sửa mã.

**Kết luận:** giữ kiến trúc hiện tại. Supabase/Firebase không mang lại lợi ích đủ lớn để bù cho rủi ro viết lại và chuyển dữ liệu thật.

### 2.2. Sơ đồ

```
 Trình duyệt (PC / điện thoại / máy tính bảng – giao diện responsive)
        │  HTTPS, cookie phiên httpOnly
        ▼
 Next.js 15 trên Vercel
   ├─ middleware.ts       chặn sớm theo vai trò (/admin, /gv, /hs)
   ├─ Server Components   đọc dữ liệu, luôn qua requireUser / requireClassAccess
   ├─ Server Actions      ghi dữ liệu, kiểm quyền + ghi nhật ký (audit)
   ├─ /ph/<mã>            trang phụ huynh (link bí mật / QR), chỉ đọc
   └─ /api/...            xuất Excel, sao lưu, cron nhắc việc (Vercel Cron)
        │  Prisma
        ▼
 PostgreSQL (Neon, region Singapore)
        │
        └─ Kênh thông báo (tùy chọn, giai đoạn 4): Email (SMTP/Resend), Zalo ZNS, SMS gateway
```

Thư mục mã nguồn:
- `src/lib/` – nghiệp vụ dùng chung (auth, audit, tính điểm, thi đua, phát hiện xu hướng).
- `src/app/admin`, `src/app/gv`, `src/app/hs`, `src/app/ph` – giao diện theo vai trò.
- `prisma/migrations` – lịch sử thay đổi cơ sở dữ liệu (chỉ thêm, không sửa migration cũ).

---

## 3. Thiết kế cơ sở dữ liệu

Bảng **in đậm** là bảng mới; các bảng khác giữ nguyên và chỉ thêm cột.

| Bảng | Vai trò | Cột chính |
|---|---|---|
| User | Tài khoản | username (duy nhất), passwordHash, fullName, role, active, mustChangePassword, phone, email |
| **SchoolYear** | Năm học | name "2026-2027" (duy nhất), startDate, semester2Start, endDate, isCurrent, locked |
| Classroom | Lớp | name, schoolYear → SchoolYear.name, homeroomTeacherId, groupCount |
| Student | Hồ sơ HS | userId, classId, studentCode, dateOfBirth, gender, address, parentName, parentPhone, groupNo, isMonitor, parentToken, **status**, **note** |
| **ClassTransfer** | Lịch sử chuyển lớp | studentId, fromClassId, toClassId, reason, actorId, createdAt |
| **AuditLog** | Nhật ký thao tác | actorId, action, entity, entityId, classId, summary, detail (JSON), createdAt |
| FormTemplate | Mẫu phiếu | questions (JSON: câu hỏi, lựa chọn, điểm, tiêu chí) |
| Survey | Đợt đánh giá (tuần) của lớp | classId, title, openAt, closeAt, questions (bản chụp), **weekNo**, **locked** |
| Response | Phiếu HS nộp | surveyId, studentId, answers, score, urgent, submittedAt, **status**, **reviewNote**, **reviewedAt**, **reviewerId** |
| Feedback | Nhận xét GV | content, goals, published, publishedAt, parentNotifiedAt |
| Note | Tuyên dương / tiến bộ / cần quan tâm / vi phạm | type, content, date, visibleToStudent |
| EmulationCategory, EmulationRecord | Thi đua thủ công | (như hiện tại) |
| **EmulationWeight** | Trọng số thi đua tự động | classId, criterion, weight |
| **Notification** | Nhật ký gửi phụ huynh | studentId, responseId, channel, recipient, status (PENDING/SENT/FAILED), error, sentAt |

Quy tắc toàn vẹn quan trọng:
- `Student → Classroom` vẫn cascade, nhưng **chỉ xóa được lớp trống**.
- Phiếu (`Response`) gắn với học sinh và đợt của *lớp cũ*. Khi chuyển lớp, `Student.classId` đổi nhưng phiếu cũ giữ nguyên, nên lịch sử tiến bộ không mất.
- Học sinh nghỉ học: `status = LEFT` và khóa tài khoản. Hồ sơ và phiếu vẫn còn. Xóa cứng chỉ dành cho Admin, có ghi nhật ký kèm bản chụp dữ liệu.
- Trạng thái phiếu (giai đoạn 2): `SUBMITTED → APPROVED | REVISION_REQUESTED → (HS sửa) SUBMITTED`. Phiếu đã `APPROVED` thì học sinh không sửa được. Đợt có `locked = true` thì không ai sửa phiếu được.

---

## 4. Sơ đồ phân quyền

| Tài nguyên / thao tác | Admin | GVCN | Học sinh | Phụ huynh (link/QR) |
|---|---|---|---|---|
| Tài khoản giáo viên: tạo, sửa, khóa, cấp lại mật khẩu | ✔ | – | – | – |
| Năm học, lớp, phân công GVCN | ✔ | – | – | – |
| Nhật ký thao tác, sao lưu/phục hồi | ✔ | – | – | – |
| Hồ sơ học sinh: xem, thêm, sửa, nhập/xuất Excel, phân tổ | ✔ mọi lớp | ✔ lớp được phân công | chỉ xem của mình | – |
| Nghỉ học / khóa tài khoản HS | ✔ | ✔ lớp mình | – | – |
| Chuyển lớp, xếp lớp năm học mới | ✔ | – | – | – |
| Xóa cứng học sinh | ✔ (ghi nhật ký) | ✔ lớp mình (ghi nhật ký kèm bản chụp) | – | – |
| Tạo/đặt tên/xóa tổ, thêm/bớt thành viên, chọn tổ trưởng | ✔ | ✔ lớp mình | – | – |
| Xem phần tự chấm điểm (số lần, điểm, trạng thái) của lớp | ✔ | ✔ lớp mình | tổ trưởng: chỉ tổ mình (không xem tổ khác, không xem câu tự nhận xét) | – |
| Nhận xét / đề xuất bổ sung vi phạm cho tổ viên | – | – | tổ trưởng: tổ mình, chờ GV xác nhận | – |
| Chấp nhận/bỏ qua bổ sung, chốt điểm, chấm thay | ✔ | ✔ lớp mình | – | – |
| Đợt đánh giá: tạo, sửa, khóa | ✔ | ✔ lớp mình | – | – |
| Phiếu tự đánh giá: nộp, sửa | – | – | ✔ của mình, khi đợt mở và chưa được duyệt | – |
| Duyệt / yêu cầu sửa / nhận xét | ✔ | ✔ lớp mình | – | – |
| Xem kết quả đã duyệt và nhận xét | ✔ | ✔ lớp mình | ✔ của mình | ✔ của con mình |
| Ghi chú "cần quan tâm" | ✔ | ✔ lớp mình | ✘ không thấy | ✘ không thấy |
| Thi đua tổ: cấu hình, trọng số | ✔ | ✔ lớp mình | – | – |
| Thi đua tổ: ghi điểm | ✔ | ✔ | cán sự lớp | – |
| Bảng xếp hạng tổ | ✔ | ✔ | ✔ lớp mình | – |

Cơ chế thực thi:
1. `middleware.ts` chặn sớm theo vai trò.
2. Mỗi trang/action gọi `requireUser`, `requireClassAccess` (GV chỉ vào lớp có `homeroomTeacherId = mình`), `requireStudentAccess` hoặc `requireStudent` (HS chỉ thấy bản ghi có `studentId = mình`). Hàm nào cũng tra lại DB, không tin cookie.
3. Phụ huynh không có tài khoản. Mỗi học sinh có một mã bí mật ngẫu nhiên 128-bit dùng trong link/QR, chỉ hiện kết quả **đã công bố**, và giáo viên có thể đổi mã khi bị lộ.

---

## 5. Quy trình hoạt động

### 5.1. Đầu năm học
Admin tạo năm học (ngày bắt đầu, ngày bắt đầu HK II, ngày kết thúc) → tạo lớp, phân công GVCN → tạo tài khoản GV → GV nhập danh sách HS từ Excel, phân tổ → phát tài khoản cho HS (HS đổi mật khẩu khi đăng nhập lần đầu).

### 5.2. Hằng tuần
```
GV tạo đợt (hoặc dùng lịch tự động)  →  đợt mở
   → HS làm phiếu và nộp                       [Response.status = SUBMITTED]
   → GV xem danh sách đã nộp / chưa nộp
       ├─ Yêu cầu sửa (kèm lời nhắn)           [REVISION_REQUESTED] → HS sửa và nộp lại
       └─ Duyệt (từng em hoặc hàng loạt) + nhận xét   [APPROVED, Feedback.published]
   → Công bố: HS thấy nhận xét; phụ huynh xem qua link/QR
   → Gửi thông báo phụ huynh (chỉ phiếu đã duyệt) → ghi nhật ký gửi
   → Hết hạn: khóa đợt [Survey.locked]  → dữ liệu vào thi đua tổ và hồ sơ tiến bộ
```

### 5.3. Cuối tháng / học kỳ / năm
Tổng hợp thi đua tổ theo tháng và học kỳ → báo cáo lớp → Admin khóa năm học (`SchoolYear.locked`), dữ liệu chuyển sang chỉ đọc và vẫn tra cứu được.

---

## 6. Thông báo phụ huynh – chi phí thực tế

| Kênh | Chi phí (tham khảo, cần kiểm tra báo giá khi triển khai) | Ghi chú |
|---|---|---|
| **Trang tra cứu phụ huynh (link/QR)** | **Miễn phí** | Phương án chính. GV phát mã QR một lần, phụ huynh lưu lại để xem mỗi tuần |
| **Nút "Nhắn SMS / Zalo" từ điện thoại GV** (đã có) | Theo gói cước cá nhân của GV, thường đã có tin nhắn miễn phí nội mạng | Không cần đăng ký dịch vụ; GV bấm gửi thủ công |
| Email (SMTP Gmail / Resend) | Miễn phí ở mức nhỏ (Resend ~3.000 email/tháng) | Nhiều phụ huynh không dùng email thường xuyên |
| Zalo ZNS (qua Zalo OA) | **Có phí**, khoảng vài trăm đồng/tin; cần OA đã xác thực và mẫu tin được duyệt | Tỷ lệ đọc cao nhất |
| SMS Brandname / SMS gateway | **Có phí**, khoảng 500–1.000 đ/tin; cần đăng ký brandname | Gửi tin đến số điện thoại thường **không miễn phí** |

Hệ thống được thiết kế theo dạng "kênh gửi" (`channel`): mặc định chỉ bật kênh miễn phí, còn kênh có phí chỉ hoạt động khi nhà trường cấu hình khóa API và đồng ý chi phí.

---

## 6b. Chấm điểm thi đua theo tiêu chí (đã triển khai)

- **Tiêu chí** riêng của từng lớp (GV tạo/sửa/xóa), mỗi tiêu chí có điểm cho một lần (+ cộng, − trừ). Khi tạo đợt, bộ tiêu chí và điểm gốc được chụp vào đợt.
- **Phiếu tuần gộp**: học sinh khai số lần theo từng tiêu chí + trả lời các câu tự nhận xét. Điểm tuần = điểm gốc + Σ(số lần × điểm). Xếp loại Tốt/Khá/Đạt/Cần cố gắng theo ngưỡng của lớp.
- **Tổ trưởng** (mỗi tổ một em) đề xuất bổ sung vi phạm hoặc nhận xét cho tổ viên; chỉ tính khi GV chấp nhận (`ScoreReport`).
- **GV**: chốt số lần (`Response.teacherCounts`), chấm thay cho em chưa nộp, **Duyệt & công bố** (khóa phiếu), **Yêu cầu sửa**, **Hủy duyệt**, **Duyệt tất cả** (bỏ qua phiếu còn bổ sung chờ).
- **Điểm tổ** = tổng điểm các phiếu đã duyệt của thành viên (tổ hiện tại của học sinh) + điểm GV/cán sự ghi thêm.
- **Xếp lớp theo năm học** (`Enrollment`, duy nhất theo học sinh + năm học): mỗi học sinh 1 lớp/năm, giữ tài khoản qua các năm; Admin tạo lớp năm mới từ năm trước (lên khối, giữ GVCN, chuyển học sinh) hoặc xếp lớp ở trang *Xếp lớp*.

## 7. Lộ trình triển khai

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Năm học; sửa giáo viên; trạng thái HS, chuyển lớp giữ lịch sử; tìm/lọc/xuất Excel/cập nhật hàng loạt; nhật ký thao tác; chặn xóa cứng với GV; mã HS không trùng trong năm học | **Hoàn thành**, kiểm thử E2E 59/59 |
| 2 | Phiếu tuần gộp (tiêu chí của lớp + 3 câu tự nhận xét); trạng thái phiếu, duyệt/yêu cầu sửa/duyệt hàng loạt; tổ trưởng; quản lý tổ; xếp lớp theo năm học | **Hoàn thành**, kiểm thử E2E 53/53 |
| 3 | Điểm tổ tự động từ phiếu đã duyệt (đã xong); còn lại: xếp hạng tháng/học kỳ, lịch sử thứ hạng; hồ sơ tiến bộ tháng/học kỳ, phát hiện xu hướng | Một phần |
| 4 | Mã QR phụ huynh; nhật ký gửi thông báo; kênh Email/Zalo ZNS cấu hình được | |
| 5 | Dashboard có bộ lọc; báo cáo, xuất Excel; sao lưu/phục hồi; nhắc HS chưa nộp (Vercel Cron) | |

Mỗi giai đoạn được kiểm thử trên cơ sở dữ liệu PostgreSQL cục bộ (áp toàn bộ migration lên bản sao có dữ liệu) trước khi commit và triển khai.
