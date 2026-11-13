import { B, DocTitle, Path, SeeAlso, Section, Tip, Toc, Warn } from "../_ui";

export const metadata = { title: "Tổ trưởng" };

export default function LeaderDocs() {
  return (
    <article>
      <DocTitle
        role="Hướng dẫn cho Tổ trưởng"
        title="Tổ trưởng theo dõi và hỗ trợ tổ"
        intro={
          <p>
            Tổ trưởng là học sinh được thầy/cô chủ nhiệm chọn. Em vẫn làm mọi việc như một học sinh (xem{" "}
            <a href="/docs/hoc-sinh" className="text-teal-700 hover:underline">
              Hướng dẫn cho học sinh
            </a>
            ), và có thêm trang <B>Tổ trưởng</B> để theo dõi điểm tự chấm của các bạn trong tổ.
          </p>
        }
      />
      <Toc
        items={[
          ["vao-trang", "Mở trang tổ trưởng"],
          ["xem", "Xem điểm tự chấm của tổ"],
          ["ghi-nhan", "Nhận xét và bổ sung vi phạm"],
          ["sau-khi-gui", "Sau khi gửi: chờ thầy/cô xác nhận"],
          ["nguyen-tac", "Nguyên tắc của tổ trưởng"],
        ]}
      />

      <Section id="vao-trang" title="Mở trang tổ trưởng">
        <p>
          Ở <Path>Trang chính</Path>, bấm dòng <B>Xem bảng tự chấm điểm của lớp, nhận xét và bổ sung vi phạm cho tổ viên →</B>. Dòng này chỉ hiện với tổ
          trưởng.
        </p>
        <p>Nếu không thấy dòng này, có thể em chưa được chọn làm tổ trưởng hoặc chưa được xếp vào tổ. Hãy hỏi thầy/cô chủ nhiệm.</p>
      </Section>

      <Section id="xem" title="Xem điểm tự chấm của tổ">
        <p>Trang hiện các đợt tự đánh giá có chấm điểm theo tiêu chí thi đua. Trong mỗi đợt có bảng các bạn trong tổ:</p>
        <ul>
          <li>
            <B>Trạng thái</B>: Chưa nộp, đã nộp chờ duyệt, hoặc <B>Phiếu đã được thầy/cô duyệt</B>.
          </li>
          <li>
            <B>Điểm</B>: điểm thi đua tuần bạn đó tự khai (đã duyệt thì là điểm thầy/cô chốt).
          </li>
        </ul>
        <Tip>
          Tổ trưởng chỉ thấy phần <B>tự chấm điểm</B> của các bạn <em>trong tổ mình</em>. Em không thấy phiếu của tổ khác, không thấy các câu tự nhận xét
          của bạn, và không thấy nhận xét của thầy cô dành cho bạn.
        </Tip>
      </Section>

      <Section id="ghi-nhan" title="Nhận xét và bổ sung vi phạm">
        <p>Khi thấy bạn khai thiếu (ví dụ quên khai lần đi học trễ) hoặc muốn ghi nhận một việc của bạn:</p>
        <ol>
          <li>
            Bấm <B>+ Nhận xét / bổ sung vi phạm</B> ở dòng của bạn đó.
          </li>
          <li>
            Chọn tiêu chí và nhập <B>Số lần</B>, hoặc chọn <B>Chỉ nhận xét (không tính điểm)</B> nếu chỉ muốn góp ý.
          </li>
          <li>
            Ghi rõ sự việc vào ô nội dung, ví dụ: <em>&quot;Thứ Năm đi học trễ 10 phút&quot;</em>.
          </li>
          <li>
            Bấm <B>Gửi thầy/cô xác nhận</B>.
          </li>
        </ol>
      </Section>

      <Section id="sau-khi-gui" title="Sau khi gửi: chờ thầy/cô xác nhận">
        <ul>
          <li>
            Ghi nhận mới có trạng thái <B>Chờ thầy/cô xác nhận</B>. Lúc này nó <em>chưa</em> tính vào điểm và bạn trong tổ chưa thấy.
          </li>
          <li>
            Thầy/cô xem và chọn chấp nhận (<B>Đã chấp nhận</B>: được tính điểm, bạn thấy trong phiếu của mình ở mục &quot;Tổ trưởng ghi nhận thêm&quot;) hoặc
            bỏ qua (<B>Không được chấp nhận</B>).
          </li>
          <li>
            Ghi nhầm khi còn đang chờ: bấm <B>Rút lại</B> ở ghi nhận đó.
          </li>
          <li>Khi phiếu của bạn đã được thầy/cô duyệt thì không gửi thêm ghi nhận cho phiếu đó được nữa.</li>
        </ul>
      </Section>

      <Section id="nguyen-tac" title="Nguyên tắc của tổ trưởng">
        <ul>
          <li>Ghi đúng sự việc, có ngày giờ cụ thể; không ghi theo cảm tính hay vì giận bạn.</li>
          <li>Ghi nhận cả việc tốt của bạn, không chỉ vi phạm.</li>
          <li>Không kể điểm hay ghi nhận của bạn cho người khác.</li>
        </ul>
        <Warn>Thầy/cô chủ nhiệm là người quyết định cuối cùng. Nếu bạn không đồng ý với ghi nhận, bạn có thể trao đổi trực tiếp với thầy/cô.</Warn>
      </Section>

      <SeeAlso
        links={[
          ["/docs/hoc-sinh", "Học sinh"],
          ["/docs", "Câu hỏi thường gặp"],
        ]}
      />
    </article>
  );
}
