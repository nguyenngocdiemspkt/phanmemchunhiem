import Link from "next/link";
import { B, DocTitle, Path, Section, Tip, Toc, Warn } from "./_ui";
import { DOC_PAGES } from "./_pages";

export const metadata = { title: "Bắt đầu" };

export default function DocsHome() {
  return (
    <article>
      <DocTitle
        role="Hướng dẫn sử dụng"
        title="Class Master – Quản lý lớp chủ nhiệm"
        intro={
          <p>
            Class Master giúp giáo viên chủ nhiệm theo dõi lớp: học sinh tự đánh giá mỗi tuần, thi đua giữa các tổ, ghi nhận việc tốt, bình chọn và vườn
            lớp, nơi mỗi em chăm một cây lớn lên theo điểm rèn luyện của mình. Hãy chọn đúng vai trò của bạn để xem hướng dẫn.
          </p>
        }
      />

      <div className="mb-10 grid gap-3 sm:grid-cols-2">
        {DOC_PAGES.slice(1).map(([href, label, hint]) => (
          <Link key={href} href={href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow">
            <div className="font-semibold text-teal-800">{label} →</div>
            <div className="mt-1 text-sm text-slate-600">{hint}</div>
          </Link>
        ))}
      </div>

      <Toc
        items={[
          ["vai-tro", "Các vai trò trong hệ thống"],
          ["dang-nhap", "Đăng nhập"],
          ["tai-khoan", "Tài khoản: mật khẩu và ảnh đại diện"],
          ["thiet-bi", "Thiết bị và trình duyệt"],
          ["hoi-dap", "Câu hỏi thường gặp"],
        ]}
      />

      <Section id="vai-tro" title="Các vai trò trong hệ thống">
        <ul>
          <li>
            <B>Quản trị</B>: tạo năm học, tài khoản giáo viên, lớp học; phân công chủ nhiệm; xếp lớp năm mới; giữ bộ cấu hình chuẩn. Quản trị cũng làm
            được mọi việc của giáo viên ở tất cả các lớp.
          </li>
          <li>
            <B>Giáo viên chủ nhiệm (GVCN)</B>: quản lý lớp mình chủ nhiệm: học sinh, tổ, phiếu tự đánh giá, thi đua, việc tốt, bình chọn, vườn lớp, phòng
            chat. Giáo viên chỉ thấy lớp mình chủ nhiệm.
          </li>
          <li>
            <B>Tổ trưởng</B>: là học sinh được GVCN chọn làm tổ trưởng. Ngoài các việc của học sinh, tổ trưởng xem được phiếu tự chấm của các bạn{" "}
            <em>trong tổ mình</em> và ghi nhận thêm (nhận xét, vi phạm) để GVCN xác nhận.
          </li>
          <li>
            <B>Học sinh</B>: làm phiếu tự đánh giá hằng tuần, xem nhận xét của thầy cô, chăm cây trong vườn lớp, tạo phiếu việc tốt, bình chọn, đề xuất chức
            năng mới.
          </li>
        </ul>
        <p>
          Ngoài ra, phụ huynh có thể xem kết quả của con qua <B>đường link riêng</B> do GVCN gửi (không cần tài khoản).
        </p>
      </Section>

      <Section id="dang-nhap" title="Đăng nhập">
        <ol>
          <li>
            Mở địa chỉ trang web nhà trường gửi (hoặc bấm <B>Vào hệ thống</B> ở góc trên trang hướng dẫn này). Trang đăng nhập hiện ra.
          </li>
          <li>
            Nhập <B>Tên đăng nhập</B> và <B>Mật khẩu</B> được nhà trường cấp, bấm <B>Đăng nhập</B>.
          </li>
          <li>Hệ thống tự đưa bạn tới trang đúng với vai trò: quản trị, giáo viên hoặc học sinh.</li>
        </ol>
        <p>
          Phiên đăng nhập được giữ 7 ngày trên thiết bị đó. Dùng máy chung (phòng máy, máy của bạn) thì nhớ bấm <B>Đăng xuất</B> khi xong.
        </p>
        <Tip>
          Quên mật khẩu: học sinh nhờ GVCN cấp lại; giáo viên nhờ quản trị cấp lại. Hệ thống không có chức năng tự lấy lại mật khẩu qua email.
        </Tip>
      </Section>

      <Section id="tai-khoan" title="Tài khoản: mật khẩu và ảnh đại diện">
        <p>
          Bấm vào <B>tên của bạn</B> ở góc trên bên phải để mở <Path>Tài khoản của tôi</Path>.
        </p>
        <ul>
          <li>
            <B>Ảnh đại diện</B>: chọn ảnh từ máy. Ảnh được tự cắt vuông và thu nhỏ trước khi lưu; thầy cô và các bạn trong lớp nhìn thấy ảnh này.
          </li>
          <li>
            <B>Đổi mật khẩu</B>: nhập mật khẩu hiện tại, mật khẩu mới (ít nhất 6 ký tự) và nhập lại.
          </li>
        </ul>
        <p>
          Khi đăng nhập bằng mật khẩu do thầy cô/quản trị cấp, hệ thống sẽ hiện lời nhắc <B>Đổi mật khẩu / Để sau</B>. Bạn không bắt buộc đổi ngay, nhưng
          nên đổi sang mật khẩu riêng của mình.
        </p>
      </Section>

      <Section id="thiet-bi" title="Thiết bị và trình duyệt">
        <ul>
          <li>Dùng được trên máy tính, máy tính bảng và điện thoại, với trình duyệt Chrome, Edge, Safari, Firefox bản mới.</li>
          <li>
            Vườn lớp trên điện thoại: chạm vào bản đồ để nhân vật đi tới, hoặc dùng các nút mũi tên bên dưới bản đồ. Trên máy tính dùng phím mũi tên hoặc W
            A S D.
          </li>
          <li>
            Trò chuyện bằng giọng nói trong vườn cần <B>cho phép micro</B> khi trình duyệt hỏi. Nên đeo tai nghe để không bị vọng tiếng.
          </li>
        </ul>
      </Section>

      <Section id="hoi-dap" title="Câu hỏi thường gặp">
        <p>
          <B>Đăng nhập báo &quot;Tên đăng nhập hoặc mật khẩu không đúng&quot;?</B> Kiểm tra lại chữ hoa/thường và bộ gõ tiếng Việt (tắt Unikey/EVKey khi
          gõ mật khẩu). Nếu vẫn không được, có thể tài khoản đã bị khóa, bị xóa hoặc mật khẩu đã được đặt lại: hãy hỏi GVCN (học sinh) hoặc quản trị (giáo
          viên).
        </p>
        <p>
          <B>Học sinh có thấy điểm, nhận xét của bạn khác không?</B> Không. Mỗi em chỉ xem được phiếu, điểm và nhận xét của chính mình. Trong vườn lớp,
          các bạn chỉ xem được điểm vườn (điểm tuần đã duyệt và việc tốt), không thấy nhận xét của thầy cô. Tổ trưởng chỉ xem được phiếu tự chấm của các
          bạn trong tổ mình.
        </p>
        <p>
          <B>Bình chọn có lộ ai chọn gì không?</B> Học sinh chỉ thấy số phiếu của từng lựa chọn. Chỉ GVCN thấy từng em đã chọn gì.
        </p>
        <p>
          <B>Giọng nói trong vườn có bị ghi âm không?</B> Không. Âm thanh đi trực tiếp giữa các máy đang đứng gần nhau, không lưu ở đâu cả. Tin nhắn chat
          thì được lưu 3 ngày rồi tự xóa.
        </p>
        <Warn>
          Đây là dữ liệu cá nhân của học sinh. Không chia sẻ tài khoản, không chụp màn hình thông tin của các em đưa lên mạng xã hội.
        </Warn>
      </Section>
    </article>
  );
}
