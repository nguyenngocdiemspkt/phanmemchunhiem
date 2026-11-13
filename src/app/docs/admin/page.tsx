import { B, DocTitle, Path, SeeAlso, Section, Sub, Tip, Toc, Warn } from "../_ui";

export const metadata = { title: "Quản trị" };

export default function AdminDocs() {
  return (
    <article>
      <DocTitle
        role="Hướng dẫn cho Quản trị"
        title="Quản trị hệ thống"
        intro={
          <p>
            Quản trị chuẩn bị khung cho cả trường: năm học, tài khoản giáo viên, lớp học và người chủ nhiệm. Sau đó GVCN tự quản lý lớp của mình. Tài khoản
            quản trị cũng làm được mọi việc của giáo viên ở tất cả các lớp.
          </p>
        }
      />
      <Toc
        items={[
          ["thu-tu", "Thứ tự chuẩn bị đầu năm"],
          ["nam-hoc", "Năm học"],
          ["giao-vien", "Tài khoản giáo viên"],
          ["lop-hoc", "Lớp học và phân công chủ nhiệm"],
          ["xep-lop", "Xếp lớp năm học mới"],
          ["lop-chu-nhiem", "Làm việc trong một lớp"],
          ["mau-phieu", "Mẫu phiếu dùng chung"],
          ["cau-hinh-vuon", "Cấu hình chuẩn vườn lớp"],
          ["de-xuat", "Đề xuất chức năng của học sinh"],
          ["nhat-ky", "Nhật ký thao tác"],
          ["an-toan", "Lưu ý an toàn dữ liệu"],
        ]}
      />

      <Section id="thu-tu" title="Thứ tự chuẩn bị đầu năm">
        <ol>
          <li>
            Tạo <B>năm học</B> mới (mục <Path>Năm học</Path>).
          </li>
          <li>
            Tạo hoặc kiểm tra <B>tài khoản giáo viên</B> (mục <Path>Giáo viên</Path>).
          </li>
          <li>
            Tạo <B>lớp</B> của năm học đó và chọn <B>GV chủ nhiệm</B> (mục <Path>Lớp học</Path>), hoặc tạo nhanh từ các lớp năm trước.
          </li>
          <li>
            Đưa <B>học sinh</B> vào lớp: chuyển học sinh cũ lên lớp mới (mục <Path>Xếp lớp</Path>), còn học sinh mới thì GVCN nhập từ Excel.
          </li>
          <li>GVCN tự chia tổ, chọn tổ trưởng, cài đặt thi đua, vườn lớp và tạo đợt tự đánh giá.</li>
        </ol>
        <Tip>Mỗi học sinh trong một năm học chỉ thuộc một lớp. Mã học sinh không được trùng trong cùng năm học.</Tip>
      </Section>

      <Section id="nam-hoc" title="Năm học">
        <p>
          Mở <Path>Năm học</Path>, điền ở phần <B>Tạo năm học mới</B>:
        </p>
        <ul>
          <li>
            <B>Năm học</B>: dạng <code>2026-2027</code>.
          </li>
          <li>
            <B>Ngày khai giảng</B>, <B>Bắt đầu học kỳ II</B>, <B>Kết thúc năm học</B>. Các mốc này dùng để chia học kỳ (ví dụ chu kỳ trồng cây của vườn lớp
            theo học kỳ).
          </li>
        </ul>
        <p>
          Năm học đang diễn ra được đánh dấu <B>Hiện tại</B>. Hết năm, bấm <B>Khóa</B>: giáo viên vẫn xem được nhưng không thêm/sửa học sinh của các lớp năm đó nữa;
          cần chỉnh lại thì bấm <B>Mở khóa</B>.
        </p>
        <Sub title="Tạo lớp từ năm trước">
          <p>
            Trong <Path>Năm học</Path>, phần <B>Tạo lớp từ năm trước</B>: chọn năm nguồn ở ô <B>Lấy các lớp của năm học</B>, tick <B>Lên khối</B> (7A1 → 8A1,
            bỏ qua lớp 9) nếu cần. Tick <B>Chuyển luôn học sinh đang học sang lớp mới</B> để các em dùng lại tài khoản cũ. GVCN được giữ như năm trước;
            đổi lại ở mục Lớp học nếu cần.
          </p>
        </Sub>
      </Section>

      <Section id="giao-vien" title="Tài khoản giáo viên">
        <p>
          Mở <Path>Giáo viên</Path> › <B>+ Thêm tài khoản giáo viên</B>: nhập <B>Họ và tên</B>, <B>Tên đăng nhập</B>, email, số điện thoại và chọn{" "}
          <B>Vai trò</B> (Giáo viên hoặc Quản trị). Bấm <B>Tạo tài khoản</B>; hệ thống hiện <B>Mật khẩu tạm</B>. Hãy ghi lại và gửi riêng cho giáo viên.
        </p>
        <p>Ở mỗi dòng giáo viên có các nút:</p>
        <ul>
          <li>
            <B>Sửa</B>: đổi họ tên, liên hệ, vai trò.
          </li>
          <li>
            <B>Cấp lại MK</B>: tạo mật khẩu tạm mới khi giáo viên quên.
          </li>
          <li>
            <B>Khóa / Mở khóa</B>: giáo viên nghỉ thì khóa tài khoản (không đăng nhập được), dữ liệu vẫn được giữ.
          </li>
        </ul>
        <Tip>
          Tên đăng nhập 3–40 ký tự, chỉ gồm chữ thường không dấu, số, dấu chấm, gạch. Ô tìm kiếm tìm được theo tên, tên đăng nhập hoặc số điện thoại. Không
          tự bỏ được quyền quản trị của chính mình.
        </Tip>
      </Section>

      <Section id="lop-hoc" title="Lớp học và phân công chủ nhiệm">
        <p>
          Mở <Path>Lớp học</Path> › <B>Tạo lớp mới</B>: nhập <B>Tên lớp</B> (vd 8A1), chọn <B>Năm học</B> và <B>GV chủ nhiệm</B>, bấm <B>Tạo lớp</B>. Lớp
          mới tự nhận bộ cấu hình chuẩn của vườn lớp.
        </p>
        <p>
          Danh sách lớp lọc được theo năm học. Trên mỗi dòng sửa trực tiếp tên lớp, năm học hoặc chọn <B>GV chủ nhiệm</B> khác rồi bấm <B>Lưu</B>. Lớp
          chưa có người chủ nhiệm hiện <em>— Chưa phân công —</em>. Nút <B>Xóa</B> chỉ hiện với lớp còn trống (chưa có học sinh, chưa có đợt).
        </p>
      </Section>

      <Section id="xep-lop" title="Xếp lớp năm học mới">
        <p>Dùng khi lên năm mới mà học sinh cũ vẫn học tiếp (giữ tài khoản, giữ lịch sử các năm trước).</p>
        <ol>
          <li>
            Mở <Path>Xếp lớp</Path>, chọn <B>Lớp nguồn</B> (lớp năm cũ), bấm <B>Xem học sinh</B>.
          </li>
          <li>
            Tick các em cần chuyển (hoặc <B>Chọn tất cả</B>), chọn lớp đích ở ô <B>Xếp vào lớp</B>.
          </li>
          <li>
            Bấm <B>Xếp lớp các học sinh đã chọn</B>. Em nào đã được xếp sẽ có nhãn <B>Đã xếp lớp năm sau</B>.
          </li>
        </ol>
      </Section>

      <Section id="lop-chu-nhiem" title="Làm việc trong một lớp">
        <p>
          Mục <Path>Lớp chủ nhiệm</Path> của quản trị hiện <em>tất cả</em> các lớp. Bấm vào một lớp để làm mọi việc như GVCN: thêm học sinh, nhập Excel, đặt
          lại mật khẩu, chia tổ, tạo đợt tự đánh giá, duyệt phiếu, việc tốt, bình chọn, vườn lớp, chat.
        </p>
        <p>
          Trang <Path>Tổng quan</Path> cho thấy toàn trường: số lớp, giáo viên, học sinh, đợt đang mở và tỷ lệ nộp phiếu của từng lớp.
        </p>
        <Tip>
          Cách làm từng việc trong lớp xem ở <a href="/docs/giao-vien">Hướng dẫn cho giáo viên chủ nhiệm</a>.
        </Tip>
      </Section>

      <Section id="mau-phieu" title="Mẫu phiếu dùng chung">
        <p>
          Mẫu phiếu là bộ câu hỏi tự đánh giá (trắc nghiệm hoặc tự luận). Mẫu do quản trị tạo được đánh dấu <B>Dùng chung</B>, mọi giáo viên đều chọn được
          khi tạo đợt. Giáo viên có thể <B>Nhân bản</B> mẫu chung để chỉnh theo lớp mình.
        </p>
      </Section>

      <Section id="cau-hinh-vuon" title="Cấu hình chuẩn vườn lớp">
        <p>
          Mở <Path>Cấu hình vườn</Path> (chỉ quản trị thấy). Đây là bộ số liệu mặc định về cách cây lớn lên theo điểm. Mỗi lớp mới tạo sẽ nhận bộ này;
          GVCN có thể chỉnh riêng cho lớp mình hoặc bấm <B>Dùng lại bộ chuẩn của hệ thống</B>.
        </p>
        <ul>
          <li>
            <B>Điểm khởi đầu</B>: điểm của mỗi em đầu chu kỳ, lúc này cây còn là hạt giống (mặc định 100).
          </li>
          <li>
            <B>Héo khi dưới</B> / <B>Khô lá khi dưới</B>: điểm thấp hơn các mức này thì cây héo / khô lá.
          </li>
          <li>
            <B>Nảy mầm từ</B>, <B>Có 2 lá từ</B>, <B>Thêm 1 lá mỗi</B> (số điểm), <B>Trưởng thành, ra trái từ (N)</B>, <B>Thêm 1 trái mỗi (M)</B>.
          </li>
        </ul>
        <p>
          Bấm <B>Lưu bộ chuẩn</B>. Thay đổi chỉ áp cho lớp tạo sau; lớp đã có giữ cài đặt riêng của mình.
        </p>
      </Section>

      <Section id="de-xuat" title="Đề xuất chức năng của học sinh">
        <p>
          Học sinh gửi ý tưởng chức năng mới cho phần mềm. Mở <Path>Đề xuất</Path> để xem danh sách, đổi <B>Trạng thái</B> (Chờ xem xét, Đã đưa vào kế hoạch, Đã làm, Chưa thực
          hiện) và viết <B>Phản hồi cho học sinh</B>; em gửi đề xuất sẽ thấy phản hồi này.
        </p>
      </Section>

      <Section id="nhat-ky" title="Nhật ký thao tác">
        <p>
          <Path>Nhật ký</Path> ghi lại các thao tác quan trọng: đăng nhập của giáo viên/quản trị, đăng nhập sai, cấp lại mật khẩu, khóa tài khoản, thêm,
          sửa, chuyển, xóa học sinh, xuất Excel, xóa tin chat... Lọc theo <B>Nhóm</B>, <B>Lớp</B> hoặc tìm theo tên. Bấm <B>Chi tiết</B> để xem bản chụp dữ
          liệu trước khi xóa.
        </p>
        <p>Nhật ký không sửa hay xóa được từ giao diện; dùng để đối chiếu khi có thắc mắc (ví dụ: ai đã xóa học sinh, lúc nào).</p>
      </Section>

      <Section id="an-toan" title="Lưu ý an toàn dữ liệu">
        <Warn>
          <B>Xóa vĩnh viễn</B> học sinh sẽ xóa luôn tài khoản và toàn bộ phiếu của em đó, không khôi phục được từ giao diện. Học sinh nghỉ học hoặc chuyển
          trường thì nên đổi <B>Trạng thái</B> (tài khoản bị khóa, dữ liệu vẫn giữ) thay vì xóa. Khi chọn nhiều học sinh để xóa cùng lúc, hãy kiểm tra kỹ
          danh sách đã tick.
        </Warn>
        <ul>
          <li>Không dùng chung tài khoản quản trị. Mỗi người quản trị nên có tài khoản riêng để nhật ký ghi đúng người.</li>
          <li>Đổi mật khẩu quản trị định kỳ và khi có người thôi phụ trách.</li>
          <li>
            Đây là dữ liệu cá nhân của học sinh (Nghị định 13/2023/NĐ-CP); nhà trường nên thông báo cho phụ huynh về việc thu thập và sử dụng dữ liệu.
          </li>
        </ul>
      </Section>

      <SeeAlso
        links={[
          ["/docs/giao-vien", "Giáo viên chủ nhiệm"],
          ["/docs/to-truong", "Tổ trưởng"],
          ["/docs/hoc-sinh", "Học sinh"],
        ]}
      />
    </article>
  );
}
