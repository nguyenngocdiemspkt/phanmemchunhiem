import { B, DocTitle, Path, SeeAlso, Section, Sub, Table, Tip, Toc, Warn } from "../_ui";

export const metadata = { title: "Giáo viên chủ nhiệm" };

export default function TeacherDocs() {
  return (
    <article>
      <DocTitle
        role="Hướng dẫn cho Giáo viên chủ nhiệm"
        title="Quản lý lớp chủ nhiệm"
        intro={
          <p>
            Sau khi đăng nhập, mục <Path>Lớp chủ nhiệm</Path> hiện các lớp thầy/cô chủ nhiệm. Bấm vào một lớp để mở các thẻ: Tổng quan, Học sinh, Tổ, Đợt tự
            đánh giá, Thi đua tổ, Việc tốt, Bình chọn tuyên dương, Vườn lớp, Chat.
          </p>
        }
      />
      <Toc
        items={[
          ["bat-dau", "Bắt đầu một năm học"],
          ["hoc-sinh", "Học sinh: thêm, nhập Excel, mật khẩu"],
          ["ho-so", "Hồ sơ từng học sinh"],
          ["to", "Tổ và tổ trưởng"],
          ["thi-dua-cai-dat", "Cài đặt thi đua và điểm cá nhân"],
          ["mau-phieu", "Mẫu phiếu tự đánh giá"],
          ["dot", "Đợt tự đánh giá: tạo, nhận xét, duyệt"],
          ["nhac-nho", "Nhắc học sinh làm phiếu"],
          ["phu-huynh", "Báo cho phụ huynh"],
          ["thi-dua", "Bảng thi đua tổ"],
          ["viec-tot", "Việc tốt"],
          ["binh-chon", "Bình chọn tuyên dương"],
          ["vuon", "Vườn lớp"],
          ["chat", "Phòng chat của lớp"],
          ["tong-quan", "Tổng quan lớp"],
        ]}
      />

      <Section id="bat-dau" title="Bắt đầu một năm học">
        <ol>
          <li>
            Kiểm tra danh sách lớp ở thẻ <Path>Học sinh</Path>. Học sinh cũ được quản trị chuyển lên; học sinh mới thì nhập từ Excel.
          </li>
          <li>
            Chia tổ và chọn tổ trưởng ở thẻ <Path>Tổ</Path>.
          </li>
          <li>
            Cài đặt tiêu chí chấm điểm và cán sự ở <Path>Thi đua tổ</Path> › <B>⚙ Tiêu chí, xếp hạng tổ &amp; cán sự</B>.
          </li>
          <li>
            Phát tài khoản cho học sinh (đặt lại mật khẩu cả lớp rồi in danh sách tên đăng nhập).
          </li>
          <li>
            Tạo đợt tự đánh giá đầu tiên ở thẻ <Path>Đợt tự đánh giá</Path>.
          </li>
        </ol>
      </Section>

      <Section id="hoc-sinh" title="Học sinh: thêm, nhập Excel, mật khẩu">
        <Sub title="Nhập danh sách từ Excel">
          <p>
            Thẻ <Path>Học sinh</Path> › <B>Nhập danh sách từ Excel</B>. Bấm <B>Tải file Excel mẫu</B> để có đúng các cột. File <code>.xlsx</code> cần cột{" "}
            <B>Họ và tên</B>; các cột tùy chọn: Mã học sinh, Ngày sinh, Giới tính, Tổ, Họ tên phụ huynh, SĐT phụ huynh, Địa chỉ, Ghi chú, Tên đăng nhập, Mật
            khẩu. Chọn file rồi bấm <B>Nhập danh sách</B>.
          </p>
          <ul>
            <li>Bỏ trống tên đăng nhập/mật khẩu thì hệ thống tự tạo; kết quả nhập hiện danh sách tài khoản và mật khẩu tạm để thầy/cô in ra.</li>
            <li>
              Nhập lại file có <B>mã học sinh</B> đã có trong lớp sẽ <em>cập nhật</em> thông tin của em đó (giữ nguyên tài khoản, mật khẩu). Dùng cách này
              để bổ sung số điện thoại phụ huynh, địa chỉ... cho cả lớp.
            </li>
            <li>Mã học sinh đang thuộc lớp khác cùng năm học sẽ bị bỏ qua.</li>
          </ul>
        </Sub>
        <Sub title="Thêm một học sinh">
          <p>
            Bấm <B>+ Thêm một học sinh</B>, điền <B>Họ và tên</B> (bắt buộc) và các thông tin khác, chọn <B>Tổ</B>. Bỏ trống <B>Tên đăng nhập</B> để tự tạo.
            Bấm <B>Thêm học sinh</B>; mật khẩu tạm hiện ngay bên dưới.
          </p>
        </Sub>
        <Sub title="Mật khẩu">
          <ul>
            <li>
              Một em quên mật khẩu: bấm <B>Cấp lại MK</B> ở dòng của em đó, đọc mật khẩu tạm mới cho em.
            </li>
            <li>
              Cả lớp: mở <B>Đặt lại mật khẩu cho cả lớp</B>, nhập <B>Mật khẩu chung mới</B> hai lần, bấm <B>Áp dụng cho … học sinh</B>. Mật khẩu cũ của các em
              không dùng được nữa.
            </li>
            <li>
              Cột tên đăng nhập có nhãn <B>Đang dùng mật khẩu được cấp</B> với các em chưa tự đổi mật khẩu.
            </li>
          </ul>
        </Sub>
        <Sub title="Thao tác với nhiều học sinh">
          <p>
            Tick ô đầu dòng (hoặc <B>Chọn tất cả</B>), rồi ở thanh <B>Với các học sinh đã chọn</B> chọn: <B>Phân tổ</B>, <B>Bỏ phân tổ</B>, đổi{" "}
            <B>Trạng thái</B> (Đang học, Nghỉ học, Chuyển trường), hoặc <B>Xóa hẳn học sinh đã chọn</B>, rồi bấm <B>Áp dụng</B>.
          </p>
          <Warn>
            <B>Xóa hẳn</B> xóa luôn tài khoản và mọi phiếu của em, không lấy lại được. Học sinh nghỉ học/chuyển trường thì đổi <B>Trạng thái</B> (tài khoản
            bị khóa, dữ liệu vẫn giữ). Trước khi bấm Áp dụng, kiểm tra kỹ những em đang được tick.
          </Warn>
        </Sub>
        <Tip>
          Ô <B>Tìm kiếm</B> tìm theo tên, mã học sinh, tên đăng nhập hoặc SĐT phụ huynh; lọc thêm theo tổ và trạng thái. Nút <B>Xuất Excel</B> tải danh sách
          đang lọc.
        </Tip>
      </Section>

      <Section id="ho-so" title="Hồ sơ từng học sinh">
        <p>Bấm vào tên một em để mở hồ sơ:</p>
        <ul>
          <li>
            <B>Thông tin cá nhân</B>: sửa rồi bấm <B>Lưu thông tin</B>. Ô <B>Ghi chú</B> học sinh và phụ huynh không thấy.
          </li>
          <li>
            <B>Ghi nhận hành động &amp; chuyển biến</B>: ghi lại <B>Hành động tích cực</B>, <B>Chuyển biến / tiến bộ</B> (em thấy được trong Hành trình của
            mình) hoặc <B>Điều cần quan tâm</B> (chỉ giáo viên thấy).
          </li>
          <li>
            <B>Lịch sử tự đánh giá</B> và <B>Biểu đồ tiến bộ</B> qua các đợt.
          </li>
          <li>
            <B>Trạng thái học tập</B>: Đang học, Nghỉ học, Chuyển trường (khóa tài khoản), hoặc <B>Chuyển lớp</B> sang lớp khác cùng năm học.
          </li>
          <li>
            <B>Link cho phụ huynh</B>: đường link riêng để phụ huynh xem các phiếu đã được thầy/cô nhận xét, không cần tài khoản. Bấm <B>Xem thử</B> để
            mở; lỡ gửi nhầm người thì bấm <B>Đổi link</B> (link cũ không mở được nữa).
          </li>
        </ul>
      </Section>

      <Section id="to" title="Tổ và tổ trưởng">
        <ul>
          <li>
            Thẻ <Path>Tổ</Path> › <B>+ Tạo tổ</B> (có thể đặt tên riêng, bỏ trống thì là &quot;Tổ 1, Tổ 2...&quot;).
          </li>
          <li>
            Trong mỗi tổ bấm <B>+ Thêm học sinh</B>, tick các em rồi bấm <B>Thêm vào tổ</B>. Danh sách chỉ có các em <em>chưa có tổ</em>; em đã ở
            tổ khác không hiện ở đây. Muốn chuyển một em sang tổ khác, bấm <B>Đưa ra</B> ở tổ cũ trước rồi thêm vào tổ mới.
          </li>
          <li>
            Bấm <B>Làm tổ trưởng</B> cạnh tên một em (bấm lại <B>Bỏ tổ trưởng</B> để bỏ). Mỗi tổ có thể có tổ trưởng riêng.
          </li>
          <li>
            <B>Đưa ra</B>: đưa em ra khỏi tổ. Danh sách <B>Chưa phân tổ</B> ở cuối trang.
          </li>
          <li>Chỉ xóa được tổ cuối cùng, để số thứ tự và điểm thi đua của các tổ khác không bị đổi.</li>
        </ul>
        <p>
          Muốn xếp lại tổ cho nhiều em cùng lúc thì dùng thao tác hàng loạt <B>Phân tổ</B> ở thẻ <Path>Học sinh</Path>, hoặc bảng <B>Phân tổ nhanh</B>{" "}
          trong cài đặt thi đua. Hai chỗ này chuyển được cả những em đang ở tổ khác.
        </p>
        <Warn>
          Điểm thi đua đi theo <em>tổ hiện tại</em> của học sinh: khi chuyển một em sang tổ khác, điểm các phiếu cũ của em cũng tính cho tổ mới (kể cả
          bảng cả năm). Nên chia tổ ổn định từ đầu học kỳ.
        </Warn>
        <Tip>
          Tổ trưởng xem được phiếu tự chấm của các bạn trong tổ và gửi ghi nhận bổ sung; ghi nhận chỉ tính điểm khi thầy/cô chấp nhận. Xem{" "}
          <a href="/docs/to-truong">Hướng dẫn cho tổ trưởng</a>.
        </Tip>
      </Section>

      <Section id="thi-dua-cai-dat" title="Cài đặt thi đua và điểm cá nhân">
        <p>
          Thẻ <Path>Thi đua tổ</Path> › <B>⚙ Tiêu chí, xếp hạng tổ &amp; cán sự</B> có bốn phần:
        </p>
        <ol>
          <li>
            <B>Tiêu chí chấm điểm của lớp</B>: danh sách việc được cộng/trừ điểm, ví dụ &quot;Đi học trễ −2&quot;, &quot;Phát biểu xây dựng bài +1&quot;. Học
            sinh khai số lần trong phiếu tuần. Bấm <B>Lưu tiêu chí</B>.
          </li>
          <li>
            <B>Cách tính điểm cá nhân mỗi tuần</B>: <B>Điểm gốc mỗi tuần</B> (mỗi em bắt đầu tuần với số điểm này) và các mức <B>Tốt từ</B>, <B>Khá từ</B>,{" "}
            <B>Đạt từ</B>; dưới mức Đạt là &quot;Cần cố gắng&quot;. Học sinh và phụ huynh chỉ xem được điểm của chính em.
          </li>
          <li>
            <B>Tiêu chí xếp hạng tổ (sao)</B>: mỗi tiêu chí có số sao (số âm là trừ sao), bật/tắt được. <B>Mỗi sao được quy ra</B> một số điểm (mặc định
            10), cộng vào tổng điểm thi đua của tổ. Có bốn loại tiêu chí:
            <ul>
              <li>
                <B>Tự động: cả tổ không ai vi phạm</B>: tổ có phiếu đã duyệt trong tuần, không phiếu nào có tiêu chí trừ điểm và tổ không bị ghi điểm trừ
                trực tiếp. <em>Mặc định đang bật, 1 sao.</em>
              </li>
              <li>
                <B>Tự động: đủ phiếu cả tổ</B>: mọi thành viên đang học của tổ đều có phiếu tuần đã duyệt. Nên bật, vì điểm phiếu của tổ tính trung bình
                (xem bên dưới).
              </li>
              <li>
                <B>Tự động: cả tổ xếp loại Tốt</B>: mọi thành viên có phiếu đã duyệt và đều đạt mức Tốt.
              </li>
              <li>
                <B>GVCN chấm tay</B>: ví dụ &quot;Trực nhật sạch&quot;; thầy/cô tick cho tổ đạt ở bảng thi đua của từng tuần.
              </li>
            </ul>
          </li>
          <li>
            <B>Phân tổ nhanh và cán sự lớp</B>: chọn tổ cho từng em trong một bảng, và tick <B>Cán sự</B>. Cán sự được ghi điểm thi đua cho các bạn (trong
            tuần hiện tại).
          </li>
        </ol>
      </Section>

      <Section id="mau-phieu" title="Mẫu phiếu tự đánh giá">
        <p>
          Mục <Path>Mẫu phiếu</Path> chứa các bộ câu hỏi. Mẫu <B>Dùng chung</B> do quản trị tạo; thầy/cô có thể <B>Nhân bản</B> để sửa theo lớp, hoặc tạo
          mẫu mới:
        </p>
        <ul>
          <li>
            Mỗi câu chọn loại <B>Trắc nghiệm (chọn 1)</B> hoặc <B>Tự luận</B>.
          </li>
          <li>
            Mỗi lựa chọn trắc nghiệm có <B>Điểm</B> (dùng để tính mức tự đánh giá 0–100), có thể đánh dấu <B>Cần quan tâm</B> để hệ thống cảnh báo khi học
            sinh chọn ý đó, và <B>Mục tiêu gợi ý</B> để gợi ý thử thách tuần tới.
          </li>
          <li>
            Bấm <B>Lưu mẫu phiếu</B>.
          </li>
        </ul>
      </Section>

      <Section id="dot" title="Đợt tự đánh giá: tạo, nhận xét, duyệt">
        <Sub title="Tạo đợt">
          <p>
            Thẻ <Path>Đợt tự đánh giá</Path> › <B>+ Tạo đợt tự đánh giá mới</B>: đặt <B>Tên đợt</B> (vd &quot;Tuần 5&quot;), chọn <B>Mẫu phiếu</B>,{" "}
            <B>Mở phiếu lúc</B> và <B>Đóng phiếu lúc</B>. Tick <B>Kèm chấm điểm theo tiêu chí thi đua của lớp</B> để học sinh tự khai điểm thi đua tuần trong
            cùng phiếu. Bấm <B>Tạo đợt</B>.
          </p>
          <p>Học sinh làm và sửa phiếu được tới giờ đóng. Thời gian đợt sửa được bằng nút <B>Chỉnh sửa đợt</B>.</p>
        </Sub>
        <Sub title="Theo dõi và xem phiếu">
          <p>
            Mở một đợt để thấy từng em: <B>Trạng thái</B> (Chưa nộp, Chờ duyệt, Đã duyệt), giờ nộp, tổng điểm, <B>Dấu hiệu</B> cần quan tâm. Phần{" "}
            <B>Tổng hợp câu trả lời</B> thống kê cả lớp; <B>Điểm thi đua các tổ trong đợt</B> cộng điểm các phiếu đã duyệt theo tổ.
          </p>
        </Sub>
        <Sub title="Nhận xét và duyệt một phiếu">
          <p>
            Bấm <B>Duyệt →</B> (phiếu đã nộp) hoặc <B>Xem →</B> (phiếu đã duyệt) ở một em:
          </p>
          <ul>
            <li>
              <B>Nhận xét của giáo viên</B> và <B>Thử thách / mục tiêu tuần tới</B> (có thể dùng gợi ý từ câu trả lời của em).
            </li>
            <li>
              <B>Điểm thi đua tuần</B>: so sánh cột <B>Tự khai</B>, <B>Tổ trưởng</B> và cột <B>Chốt</B>; sửa số chốt nếu cần rồi <B>Lưu điểm</B>.
            </li>
            <li>
              <B>Tổ trưởng nhận xét / bổ sung</B>: bấm chấp nhận hoặc bỏ qua từng ghi nhận. Bổ sung chỉ được tính điểm và cho học sinh thấy khi thầy/cô chấp
              nhận.
            </li>
            <li>
              Phiếu chưa ổn: <B>Yêu cầu học sinh sửa / bổ sung</B> kèm lời nhắn; em sẽ thấy &quot;Thầy/cô nhờ em sửa&quot;.
            </li>
            <li>
              Phiếu ổn: bấm <B>✓ Duyệt &amp; công bố</B>. Duyệt nghĩa là <em>khóa phiếu</em> (học sinh không sửa được nữa) và công bố điểm, nhận
              xét cho học sinh và phụ huynh. Nhận xét không bắt buộc. Đã duyệt vẫn sửa được nhận xét bằng{" "}
              <B>Cập nhật &amp; công bố lại</B>.
            </li>
          </ul>
          <p>
            Em chưa nộp: bấm <B>Chấm thay →</B> để nhập điểm thi đua thay em rồi duyệt.
          </p>
        </Sub>
        <Tip>Điểm thi đua cá nhân, điểm tổ và cây trong vườn lớp chỉ tính các phiếu đã duyệt.</Tip>
      </Section>

      <Section id="nhac-nho" title="Nhắc học sinh làm phiếu">
        <p>
          Học sinh tự bật <B>nhắc nhở</B> trên điện thoại/máy tính của mình (Trang chính › <B>Bật nhắc nhở</B>). Khi một đợt sắp hết hạn, hệ thống tự
          gửi thông báo cho các em <B>chưa nộp phiếu</B> hoặc có phiếu đang được thầy/cô <B>nhờ sửa</B>, ở mốc <B>24 giờ</B> và <B>3 giờ</B> trước hạn
          (mỗi mốc một lần, không gửi từ 22h đến 6h). Thầy/cô không cần làm gì thêm; nên nhắc các em bật nhắc nhở ngay buổi đầu dùng phần mềm.
        </p>
      </Section>

      <Section id="phu-huynh" title="Báo cho phụ huynh">
        <p>
          Sau khi duyệt phiếu, ở trang phiếu (và cột <B>Báo phụ huynh</B> trong danh sách đợt) hiện các nút gửi tin nhắn soạn sẵn gồm kết quả, nhận xét và
          link xem chi tiết:
        </p>
        <ul>
          <li>
            <B>📱 Nhắn SMS tới …</B>: mở ứng dụng tin nhắn trên điện thoại với số của phụ huynh (khi hồ sơ có SĐT phụ huynh).
          </li>
          <li>
            <B>📋 Sao chép (dán vào Zalo)</B>: chép nội dung, mở Zalo và dán gửi phụ huynh.
          </li>
        </ul>
        <p>Hệ thống không tự gửi tin, không dùng dịch vụ trả phí.</p>
      </Section>

      <Section id="thi-dua" title="Bảng thi đua tổ">
        <p>
          Thẻ <Path>Thi đua tổ</Path> hiện <B>Xếp hạng tuần</B> và <B>Xếp hạng cả năm</B> của các tổ. Chuyển tuần bằng <B>← Tuần trước / Tuần sau →</B>.
        </p>
        <Table
          head={["Nguồn điểm của tổ", "Ghi chú"]}
          rows={[
            ["Phiếu tuần (TB)", "Điểm trung bình các phiếu tuần đã duyệt của thành viên (không cộng tổng, để tổ đông hay ít người đều công bằng)"],
            ["Sao", "Số sao tổ đạt × số điểm mỗi sao. Tiêu chí chấm tay: bấm vào ô để tick / bỏ tick cho tổ trong tuần đang xem"],
            ["Điểm GV/cán sự ghi trực tiếp", <>Bấm <B>Ghi điểm</B>: chọn ghi cho một em hoặc cả tổ, tiêu chí hoặc nội dung tự nhập, số điểm ±</>],
            ["Việc tốt", "Điểm phiếu việc tốt đã duyệt (người làm và người được hỗ trợ)"],
          ]}
        />
        <p>
          <B>Tổng điểm tuần</B> của tổ = điểm trung bình phiếu tuần + điểm sao + điểm ghi trực tiếp + việc tốt; tổng cao hơn xếp trên, bằng điểm thì đồng
          hạng. Ví dụ tổ có 4 phiếu đã duyệt 98, 100, 104, 106 → trung bình 102; đạt 2 sao (10 điểm/sao) → 102 + 20 = 122.
        </p>
        <p>
          <B>Xếp hạng cả năm</B> cộng điểm của từng tuần (mỗi tuần tính một điểm trung bình). Phiếu chưa duyệt không được tính, nên hãy duyệt đủ phiếu;
          tiêu chí sao &quot;đủ phiếu cả tổ&quot; giúp khuyến khích các em nộp đủ.
        </p>
        <ul>
          <li>Phiếu tính vào tuần <B>mở đợt</B>; việc tốt tính vào tuần thầy/cô <B>duyệt</B>.</li>
          <li>Bằng điểm thì đồng hạng. Ba tổ đứng đầu có huy chương 🥇🥈🥉.</li>
          <li>Học sinh xem được bảng xếp hạng ở mục Thi đua (tổ của em được tô màu), nhưng không xem được điểm cá nhân của bạn khác.</li>
        </ul>
      </Section>

      <Section id="viec-tot" title="Việc tốt">
        <p>
          Học sinh tạo <B>phiếu việc tốt</B>: <B>Một lần</B> (việc đã làm xong) hoặc <B>Thử thách có thời hạn</B> (vd &quot;Kèm bạn học Toán trong 4
          tuần&quot;, có hạn hoàn thành), có thể ghi <B>bạn được hỗ trợ</B>.
        </p>
        <p>
          Thẻ <Path>Việc tốt</Path> hiện các phiếu cần xử lý. Với mỗi phiếu: nhập <B>Điểm người làm</B>, <B>Điểm</B> cho bạn được hỗ trợ (nếu có), <B>Lời
          nhắn</B>, rồi bấm <B>✓ Duyệt và cộng điểm</B> hoặc <B>Không duyệt</B>. Điểm việc tốt được cộng vào thi đua tổ và vườn lớp. Điểm âm làm cây héo.
        </p>
      </Section>

      <Section id="binh-chon" title="Bình chọn tuyên dương">
        <Sub title="Tuyên dương tuần, tháng, học kỳ (tự động)">
          <ul>
            <li>
              Mỗi tuần (thứ Hai đến Chủ nhật), mỗi học sinh bầu <B>1 bạn</B> trong lớp kèm lý do ngắn; không tự bầu được, đổi phiếu được đến hết Chủ nhật.
              Thầy/cô không cần mở đợt, tuần nào hệ thống cũng tự mở.
            </li>
            <li>
              Hết tuần, bạn <B>nhiều phiếu nhất</B> được <B>tuyên dương tuần</B> (bằng phiếu thì cùng được tuyên dương).
            </li>
            <li>
              <B>Tuyên dương tháng / học kỳ</B> được tính tự động: bạn được tuyên dương tuần nhiều lần nhất; bằng nhau thì xét tổng số phiếu. Chưa hết
              kỳ thì ghi &quot;Tạm tính&quot;, hết kỳ thì &quot;Đã chốt&quot;. Tuần thuộc tháng của ngày thứ Hai; học kỳ theo mốc của năm học.
            </li>
          </ul>
          <p>
            Thẻ <Path>Bình chọn tuyên dương</Path> có <B>bảng vàng</B> và <B>chi tiết từng tuần</B>: số em đã bầu, danh sách em chưa bầu, ai bầu ai và
            lý do (chỉ thầy/cô thấy). Chọn tuần ở dãy ngày phía trên bảng. Phiếu có lý do không phù hợp thì bấm <B>Xóa</B> (ghi vào Nhật ký). Học sinh
            chỉ thấy kết quả và lời khen ẩn danh, không biết bạn khác bầu cho ai.
          </p>
        </Sub>
        <Sub title="Sau khi có kết quả tuyên dương">
          <ul>
            <li>
              <B>Cộng điểm:</B> bạn được tuyên dương tuần được cộng điểm (mặc định <B>3</B>) vào <B>thi đua tổ</B> (cột &quot;Việc tốt, tuyên
              dương&quot;, tính vào tuần được tuyên dương) và <B>điểm vườn cây</B>. Đổi số điểm ở ô <B>Điểm cộng cho bạn được tuyên dương tuần</B> rồi
              bấm <B>Lưu</B>; nhập 0 là không cộng. Số điểm mới áp dụng cho cả các tuần trước.
            </li>
            <li>
              <B>Thông báo chúc mừng:</B> bạn được tuyên dương (tuần, tháng, học kỳ) nhận thông báo đẩy chúc mừng nếu đã bật nhắc nhở (không gửi từ 22h
              đến 6h).
            </li>
            <li>
              <B>Tin nhắn soạn sẵn:</B> bên dưới ô điểm cộng có nội dung tuyên dương tuần vừa chốt (kèm lời khen của các bạn), tháng và học kỳ. Bấm{" "}
              <B>📋 Sao chép</B> để dán vào nhóm Zalo phụ huynh/lớp hoặc đọc trong giờ sinh hoạt.
            </li>
            <li>
              <B>Giấy khen:</B> ở bảng vàng, tháng/học kỳ đã chốt có link <B>🖨 Giấy khen</B>. Trang giấy khen có tất cả các bạn được tuyên dương của kỳ,
              mỗi bạn một trang A4 ngang; bấm <B>In / Lưu PDF</B> để in hoặc lưu thành tệp PDF. Học sinh được tuyên dương cũng xem và in được giấy khen của
              mình.
            </li>
          </ul>
        </Sub>
        <Sub title="Bình chọn khác">
        <ol>
          <li>
            Phần <B>Bình chọn khác</B> › <B>Tạo bình chọn mới</B>: nhập <B>Nội dung bình chọn</B>, các lựa chọn (bấm <B>+ Thêm lựa chọn</B> để thêm),{" "}
            <B>Bắt đầu</B> và <B>Kết thúc</B>. Bấm <B>Tạo bình chọn</B>.
          </li>
          <li>Học sinh bình chọn trong khoảng thời gian đó, đổi được lựa chọn khi bình chọn còn mở.</li>
          <li>
            Bấm vào một bình chọn để xem kết quả và <B>danh sách từng em đã chọn gì</B> (chỉ giáo viên thấy). Muốn kết thúc trước giờ, bấm <B>Đóng bình chọn ngay</B> (bình chọn được đánh dấu Đã đóng sớm).
          </li>
        </ol>
        <p>Học sinh chỉ thấy số phiếu và phần trăm của từng lựa chọn, sau khi đã bình chọn.</p>
        </Sub>
      </Section>

      <Section id="vuon" title="Vườn lớp">
        <p>
          Mỗi học sinh có một nhân vật và một ô đất. Em gieo hạt (hướng dương, cam, ...) và cây lớn lên theo <B>điểm vườn</B>:
        </p>
        <p className="rounded-lg bg-white px-4 py-2 text-sm ring-1 ring-slate-200">
          Điểm vườn = Điểm khởi đầu + tổng (điểm phiếu tuần đã duyệt − điểm gốc) + điểm việc tốt đã duyệt, tính trong chu kỳ hiện tại.
        </p>
        <Sub title="Cài đặt vườn lớp">
          <p>
            Thẻ <Path>Vườn lớp</Path> › <B>Cài đặt vườn lớp</B>: các mốc điểm (khởi đầu, héo, khô lá, nảy mầm, 2 lá, thêm lá, trưởng thành N, thêm trái M) và{" "}
            <B>Thu hoạch</B>: <B>Mỗi học kỳ</B> hoặc <B>Cuối năm học</B>. Lớp mới tạo dùng bộ chuẩn của hệ thống; bấm <B>Dùng lại bộ chuẩn của hệ thống</B> để
            quay về bộ chuẩn.
          </p>
          <p>
            Hết chu kỳ, cây được thu hoạch vào <B>Bộ sưu tập</B> của em và em gieo hạt mới cho chu kỳ sau.
          </p>
        </Sub>
        <Sub title="Xem vườn">
          <p>
            Giáo viên xem bản đồ vườn nhưng không có nhân vật, không đi lại. Chỉ học sinh đang online mới hiện nhân vật; em không online chỉ còn cây và tên
            trên luống đất. Bấm vào ô đất để xem cây và điểm chi tiết của em đó. Bảng bên dưới liệt kê hạt giống, trạng thái cây và điểm vườn của cả lớp.
          </p>
        </Sub>
      </Section>

      <Section id="chat" title="Phòng chat của lớp">
        <p>
          Trong vườn lớp có phòng chat chung, ai trong lớp cũng thấy (không có chat riêng). Từ ngữ không phù hợp tự bị che bằng <code>***</code>. Thầy/cô xem
          được chat ngay trong vườn.
        </p>
        <p>
          Thẻ <Path>Chat</Path>: bấm <B>Tắt phòng chat</B> / <B>Bật phòng chat</B> (học sinh thấy ngay), và bấm <B>Xóa</B> ở tin nhắn không phù hợp (tin biến
          mất ngay ở máy các em; nội dung được ghi vào Nhật ký để đối chiếu). Tin nhắn tự xóa sau 3 ngày.
        </p>
        <p>
          Trong vườn học sinh còn có thể <B>nói chuyện bằng giọng nói</B> với các bạn đứng gần. Giọng nói không bị ghi âm; giáo viên không tham gia phần này.
        </p>
      </Section>

      <Section id="tong-quan" title="Tổng quan lớp">
        <p>
          Thẻ <Path>Tổng quan</Path>: tỷ lệ hoàn thành đợt gần nhất, số em <B>Chưa nộp</B>, <B>Chờ nhận xét</B>, <B>Học sinh cần quan tâm</B> (chọn ý được
          đánh dấu cần quan tâm), và biểu đồ <B>Diễn biến của lớp qua các đợt</B>.
        </p>
      </Section>

      <SeeAlso
        links={[
          ["/docs/to-truong", "Tổ trưởng"],
          ["/docs/hoc-sinh", "Học sinh"],
          ["/docs", "Câu hỏi thường gặp"],
        ]}
      />
    </article>
  );
}
