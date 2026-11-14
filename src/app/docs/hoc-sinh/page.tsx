import { B, DocTitle, Path, SeeAlso, Section, Sub, Table, Tip, Toc, Warn } from "../_ui";

export const metadata = { title: "Học sinh" };

export default function StudentDocs() {
  return (
    <article>
      <DocTitle
        role="Hướng dẫn cho Học sinh"
        title="Chào em! Đây là cách dùng Class Master"
        intro={
          <p>
            Mỗi tuần em tự đánh giá bản thân, xem nhận xét của thầy cô, chăm cây của mình trong vườn lớp, làm việc tốt và cùng tổ thi đua. Các mục chính nằm
            trên thanh menu: Trang chính, Hành trình, Vườn lớp, Việc tốt, Bình chọn tuyên dương, Thi đua, Cá nhân, Đề xuất phần mềm.
          </p>
        }
      />
      <Toc
        items={[
          ["dang-nhap", "Đăng nhập lần đầu"],
          ["phieu", "Làm phiếu tự đánh giá hằng tuần"],
          ["nhac-nho", "Bật nhắc nhở làm phiếu"],
          ["ket-qua", "Xem nhận xét và kết quả"],
          ["hanh-trinh", "Hành trình tiến bộ"],
          ["vuon", "Vườn lớp"],
          ["chat-giong-noi", "Chat và nói chuyện trong vườn"],
          ["viec-tot", "Việc tốt"],
          ["binh-chon", "Bình chọn tuyên dương"],
          ["thi-dua", "Thi đua tổ (và cán sự)"],
          ["ca-nhan", "Thông tin cá nhân, tài khoản"],
          ["de-xuat", "Đề xuất phần mềm"],
          ["quy-tac", "Quy tắc khi dùng"],
        ]}
      />

      <Section id="dang-nhap" title="Đăng nhập lần đầu">
        <ol>
          <li>Nhập tên đăng nhập và mật khẩu thầy/cô chủ nhiệm đưa cho em.</li>
          <li>
            Hệ thống nhắc <B>Đổi mật khẩu</B>: em nên đổi sang mật khẩu riêng (ít nhất 6 ký tự) và nhớ kỹ. Có thể bấm <B>Để sau</B>.
          </li>
          <li>
            Bấm vào tên em ở góc trên để đổi <B>ảnh đại diện</B>.
          </li>
        </ol>
        <Tip>Quên mật khẩu thì nhờ thầy/cô chủ nhiệm cấp lại.</Tip>
      </Section>

      <Section id="phieu" title="Làm phiếu tự đánh giá hằng tuần">
        <ol>
          <li>
            Ở <Path>Trang chính</Path>, phần <B>Phiếu tự đánh giá</B>, bấm <B>Làm phiếu</B>.
          </li>
          <li>Trả lời các câu hỏi thật lòng. Đây không phải bài kiểm tra; thầy cô muốn hiểu em để giúp em.</li>
          <li>
            Nếu phiếu có phần <B>Tự chấm điểm thi đua tuần này</B>: nhập <B>số lần</B> cho từng việc ở <B>Điểm cộng</B> (phát biểu, giúp bạn...) và{" "}
            <B>Điểm trừ</B> (đi trễ, quên bài...). Điểm tự chấm của em hiện ngay bên dưới.
          </li>
          <li>
            Bấm <B>Gửi phiếu</B>. Phiếu chuyển sang <B>Đã nộp, chờ duyệt</B>.
          </li>
        </ol>
        <p>
          Trước giờ đóng phiếu, em bấm <B>Xem / sửa</B> để sửa lại. Nếu thầy/cô nhờ sửa, phiếu hiện <B>Thầy/cô nhờ em sửa</B> kèm lời nhắn; em sửa xong bấm{" "}
          <B>Gửi phiếu</B> lại.
        </p>
        <Warn>Khai đúng sự thật. Tổ trưởng có thể bổ sung nếu em khai thiếu, và thầy/cô là người chốt điểm cuối cùng.</Warn>
      </Section>

      <Section id="nhac-nho" title="Bật nhắc nhở làm phiếu">
        <p>
          Để không quên làm phiếu, em bật thông báo trên điện thoại hoặc máy tính của mình. Khi sắp hết hạn mà em <B>chưa làm phiếu</B> (hoặc phiếu
          đang được thầy/cô nhờ sửa), máy sẽ hiện thông báo <B>24 giờ</B> và <B>3 giờ</B> trước hạn, kể cả khi em không mở Class Master. Hệ thống
          không nhắc từ 22h đến 6h. Bấm vào thông báo là mở đúng phiếu.
        </p>
        <ol>
          <li>
            Ở <Path>Trang chính</Path> (hoặc <Path>Tài khoản của tôi</Path>), ô <B>🔔 Nhắc làm phiếu tự đánh giá</B>, bấm <B>Bật nhắc nhở</B>.
          </li>
          <li>
            Trình duyệt hỏi quyền gửi thông báo: bấm <B>Cho phép</B>.
          </li>
          <li>
            Bấm <B>Gửi thử</B> để kiểm tra: máy hiện thông báo là đã bật thành công.
          </li>
        </ol>
        <p>
          Mỗi điện thoại/máy tính bật riêng. Muốn thôi nhận thông báo trên thiết bị nào thì bấm <B>Tắt</B> trên thiết bị đó.
        </p>
        <Tip>
          <B>iPhone/iPad</B> (iOS 16.4 trở lên): mở trang bằng Safari, bấm nút Chia sẻ › <B>Thêm vào MH chính</B>, rồi mở Class Master từ biểu tượng
          trên màn hình chính và bật nhắc nhở ở đó. Nếu lỡ bấm <B>Chặn</B>, hãy cho phép lại Thông báo trong cài đặt trang của trình duyệt.
        </Tip>
      </Section>

      <Section id="ket-qua" title="Xem nhận xét và kết quả">
        <p>
          Khi thầy/cô duyệt, phiếu hiện <B>Xem kết quả</B>. Em sẽ thấy <B>Nhận xét của thầy/cô</B>, thử thách cho tuần tới, <B>Kết quả thi đua tuần</B> (điểm
          và xếp loại Tốt/Khá/Đạt/Cần cố gắng), và các ghi nhận thêm của tổ trưởng đã được thầy/cô chấp nhận. Phản hồi mới nhất cũng hiện ngay ở Trang
          chính.
        </p>
        <p>Chỉ em (và phụ huynh của em) xem được điểm và nhận xét của em.</p>
      </Section>

      <Section id="hanh-trinh" title="Hành trình tiến bộ">
        <p>
          Mục <Path>Hành trình</Path> có biểu đồ <B>Mức tự đánh giá qua từng tuần</B> và <B>🌟 Những điều thầy/cô ghi nhận ở em</B>. Mức tự đánh giá không
          phải điểm xếp loại, mà là cách em tự nhìn nhận bản thân mỗi tuần.
        </p>
      </Section>

      <Section id="vuon" title="Vườn lớp">
        <Sub title="Lần đầu vào vườn">
          <ol>
            <li>
              <B>Tạo nhân vật của em</B>: chọn màu da, kiểu tóc, màu tóc, màu áo, màu quần, phụ kiện. Bấm <B>Xong, vào vườn lớp</B>. Sau này đổi lại bằng nút{" "}
              <B>Đổi nhân vật</B>.
            </li>
            <li>
              <B>Chọn hạt giống</B>: Hướng dương, Hoa hồng, Hoa sen, Cây cam, Cây táo hoặc Cây xoài. Mỗi chu kỳ (học kỳ hoặc năm học) chỉ chọn một lần, nên
              hãy chọn kỹ.
            </li>
          </ol>
        </Sub>
        <Sub title="Cây lớn lên thế nào?">
          <p>
            Mỗi em bắt đầu chu kỳ với <B>điểm vườn</B> khởi đầu (thường là 100), cây là hạt giống. Điểm vườn tăng giảm theo điểm thi đua của các phiếu tuần
            đã được duyệt và điểm việc tốt.
          </p>
          <Table
            head={["Điểm vườn (ví dụ theo bộ chuẩn)", "Cây của em"]}
            rows={[
              ["Dưới 70", "Khô lá"],
              ["Dưới 80", "Héo"],
              ["100", "Hạt giống"],
              ["Từ 105", "Nảy mầm"],
              ["Từ 110", "Có 2 lá, sau đó cứ thêm vài điểm lại có thêm lá"],
              ["Đủ mốc trưởng thành", "Ra hoa, ra trái; càng nhiều điểm càng nhiều trái"],
            ]}
          />
          <p>Các mốc cụ thể do thầy/cô cài cho lớp. Hết chu kỳ, cây được thu hoạch vào <B>Bộ sưu tập của em</B>, và em gieo hạt mới.</p>
        </Sub>
        <Sub title="Đi lại trong vườn">
          <ul>
            <li>Máy tính: phím mũi tên hoặc W A S D. Điện thoại: chạm vào chỗ muốn đến, hoặc dùng các nút ▲ ▼ ◀ ▶ dưới bản đồ.</li>
            <li>Chạm vào ô đất của bạn nào thì nhân vật tự đi tới cạnh ô đó.</li>
            <li>
              Đứng cạnh một ô đất để xem cây và <B>điểm vườn chi tiết</B> của bạn đó (điểm khởi đầu, phiếu tuần đã duyệt, việc tốt). Các bạn cũng thấy điểm
              vườn của em như vậy, nhưng không ai thấy nhận xét của thầy cô dành cho em.
            </li>
            <li>Không đi xuyên qua ô đất, cây cổ thụ, ghế đá và ao được.</li>
            <li>
              Chỉ bạn <B>đang online</B> mới hiện nhân vật. Bạn không online chỉ còn cây và tên trên luống đất.
            </li>
          </ul>
        </Sub>
      </Section>

      <Section id="chat-giong-noi" title="Chat và nói chuyện trong vườn">
        <Sub title="Phòng chat của lớp">
          <p>
            Khung <B>Phòng chat của lớp</B> nằm cạnh bản đồ (trên điện thoại thì ở bên dưới). Cả lớp và thầy cô đều đọc được; không có chat riêng. Gõ tin
            nhắn rồi bấm <B>Gửi</B> (tối đa 300 ký tự, không gửi dồn liên tục được).
          </p>
          <p>Từ ngữ không phù hợp tự bị che thành ***. Thầy/cô có thể xóa tin nhắn hoặc tạm tắt phòng chat. Tin nhắn tự xóa sau 3 ngày.</p>
        </Sub>
        <Sub title="Nói chuyện bằng giọng nói">
          <ol>
            <li>
              Bấm <B>🎧 Vào trò chuyện giọng nói</B>, rồi bấm <B>Cho phép</B> khi trình duyệt hỏi dùng micro.
            </li>
            <li>
              Mic <B>tắt sẵn</B>. Bấm <B>🔇 Mic đang tắt</B> để bật (nút đổi thành <B>🎙️ Đang bật mic</B>), bấm lại để tắt.
            </li>
            <li>
              Đi lại gần các bạn cũng đang bật giọng nói. Đứng sát nhau nghe rõ; đi xa thì nghe nhỏ dần; quá khoảng 7 ô thì không nghe nữa. Vòng tròn nét
              đứt quanh em là vùng nghe được.
            </li>
            <li>
              Ngồi cùng <B>khu ghế đá</B> thì cả nhóm nghe rõ nhau, như ngồi họp nhóm.
            </li>
            <li>
              Bạn đang nghe được có vòng xanh quanh nhân vật và dòng <B>Đang nghe: …</B>. Bấm <B>Rời</B> để thoát giọng nói.
            </li>
          </ol>
          <Tip>
            Nên đeo tai nghe để không bị vọng tiếng. Giọng nói <B>không bị ghi âm</B>, chỉ nghe trực tiếp. Không mở được micro thì em vẫn nghe được các bạn.
          </Tip>
        </Sub>
      </Section>

      <Section id="viec-tot" title="Việc tốt">
        <p>
          Mục <Path>Việc tốt</Path> › <B>Tạo phiếu việc tốt</B>:
        </p>
        <ul>
          <li>
            <B>Việc tốt</B>: ghi ngắn gọn việc em làm. Thêm <B>Mô tả</B> nếu cần.
          </li>
          <li>
            <B>Loại phiếu</B>: <B>Một lần, áp dụng ngay</B> (việc em đã làm xong, gửi thầy/cô xác nhận) hoặc <B>Thử thách có thời hạn</B> (vd &quot;Kèm bạn
            học tốt môn Toán trong 4 tuần&quot;, chọn <B>Hạn hoàn thành</B>).
          </li>
          <li>
            <B>Bạn được hỗ trợ (nếu có)</B>: chọn bạn em đã giúp. Bạn đó cũng có thể được cộng điểm.
          </li>
        </ul>
        <p>
          Với thử thách, làm xong thì bấm <B>Báo hoàn thành</B>. Phiếu chờ thầy/cô duyệt; khi được duyệt, điểm được cộng vào thi đua tổ và giúp cây của em
          lớn. Phiếu chưa duyệt có thể <B>Rút phiếu</B>. Phần <B>Các bạn giúp đỡ em</B> liệt kê những lần em được bạn giúp.
        </p>
      </Section>

      <Section id="binh-chon" title="Bình chọn tuyên dương">
        <Sub title="Bầu tuyên dương mỗi tuần">
          <ol>
            <li>
              Mở <Path>Bình chọn tuyên dương</Path>. Ở khung <B>Tuyên dương tuần này</B>, chọn <B>một bạn</B> em thấy xứng đáng (em không tự bầu cho
              mình được).
            </li>
            <li>Ghi ngắn gọn lý do (không bắt buộc), ví dụ &quot;Bạn giảng bài Toán cho cả tổ&quot;.</li>
            <li>
              Bấm <B>Bầu tuyên dương</B>. Em đổi được phiếu (<B>Đổi phiếu</B>) đến hết Chủ nhật.
            </li>
          </ol>
          <p>
            Hết tuần, bạn <B>nhiều phiếu nhất</B> được tuyên dương tuần (bằng phiếu thì cùng được tuyên dương). Lời khen của các bạn hiện dưới tên bạn
            được tuyên dương nhưng <em>không ghi tên người viết</em>. Các bạn không biết em bầu cho ai; chỉ thầy/cô chủ nhiệm xem được.
          </p>
        </Sub>
        <Sub title="Bảng vàng: tuyên dương tháng và học kỳ">
          <p>
            Hệ thống tự tính: bạn được <B>tuyên dương tuần nhiều lần nhất</B> trong tháng được tuyên dương tháng; trong học kỳ được tuyên dương học kỳ.
            Bằng số lần thì xét tổng số phiếu của các tuần đó. Khi tháng/học kỳ chưa kết thúc, bảng ghi <B>Tạm tính</B>; hết tháng/học kỳ thì ghi{" "}
            <B>Đã chốt</B>. Tuần thuộc tháng của ngày thứ Hai đầu tuần.
          </p>
        </Sub>
        <Sub title="Bình chọn khác của lớp">
          <p>
            Phía dưới là các bình chọn khác thầy/cô tạo (ví dụ chọn nơi đi dã ngoại). Chọn một lựa chọn rồi bấm <B>Bình chọn</B>. Bình chọn xong em mới thấy kết quả (số phiếu
          từng lựa chọn). Khi còn mở, em có thể <B>Đổi lựa chọn</B>.
        </p>
          <p>Các bạn không biết em chọn gì; chỉ thầy/cô chủ nhiệm thấy.</p>
        </Sub>
      </Section>

      <Section id="thi-dua" title="Thi đua tổ (và cán sự)">
        <p>
          Mục <Path>Thi đua</Path> hiện bảng xếp hạng các tổ theo tuần và cả năm, tổ của em được đánh dấu. Điểm tổ gồm điểm <B>trung bình</B> các phiếu tuần
          đã duyệt của thành viên (tổ đông hay ít người đều công bằng), sao từ tiêu chí tổ, điểm ghi trực tiếp và việc tốt.
        </p>
        <p>
          Nếu em là <B>cán sự lớp</B>, trang hiện dòng &quot;Em là cán sự, được ghi điểm thi đua&quot;. Bấm <B>Ghi điểm</B>, chọn bạn (hoặc cả tổ), tiêu chí
          và số điểm. Cán sự chỉ ghi và xóa được điểm của chính mình trong tuần hiện tại.
        </p>
      </Section>

      <Section id="ca-nhan" title="Thông tin cá nhân, tài khoản">
        <p>
          Mục <Path>Cá nhân</Path> hiện thông tin của em (họ tên, mã học sinh, ngày sinh, phụ huynh...). Em tự cập nhật được <B>địa chỉ</B>; thông tin khác
          chưa đúng thì báo thầy/cô chủ nhiệm sửa.
        </p>
        <p>
          Đổi mật khẩu và ảnh đại diện: bấm vào tên em ở góc trên › <Path>Tài khoản của tôi</Path>.
        </p>
      </Section>

      <Section id="de-xuat" title="Đề xuất phần mềm">
        <p>
          Em có ý tưởng làm phần mềm hay hơn? Mục <Path>Đề xuất phần mềm</Path>: nhập <B>Tên chức năng</B>, <B>Em mong muốn chức năng hoạt động thế nào?</B> và{" "}
          <B>Mô tả thêm</B> (chức năng giúp được gì cho em và các bạn), bấm <B>Gửi đề xuất</B>. Em theo dõi trạng thái và phản hồi của nhà trường trong danh
          sách <B>Đề xuất em đã gửi</B>.
        </p>
      </Section>

      <Section id="quy-tac" title="Quy tắc khi dùng">
        <ul>
          <li>Không cho bạn khác mượn tài khoản, không đăng nhập tài khoản của người khác.</li>
          <li>Chat lịch sự, tôn trọng các bạn. Thầy/cô xem được mọi tin nhắn trong phòng chat.</li>
          <li>Dùng máy chung thì nhớ bấm Đăng xuất.</li>
        </ul>
      </Section>

      <SeeAlso
        links={[
          ["/docs/to-truong", "Dành cho tổ trưởng"],
          ["/docs", "Câu hỏi thường gặp"],
        ]}
      />
    </article>
  );
}
