import ExcelJS from "exceljs";
import { removeDiacritics } from "./format";

export type StudentRow = {
  row: number;
  fullName: string;
  studentCode?: string;
  dateOfBirth?: string;
  gender?: string;
  username?: string;
  password?: string;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  groupNo?: string;
  note?: string;
};

// Tiêu đề cột (đã bỏ dấu, chữ thường) -> trường dữ liệu
const HEADER_MAP: [RegExp, keyof Omit<StudentRow, "row">][] = [
  [/^(ho va ten|ho ten|ten hoc sinh|hoten)$/, "fullName"],
  [/^(ma hoc sinh|ma hs|ma so|ma dinh danh|mshs)$/, "studentCode"],
  [/^ngay sinh/, "dateOfBirth"],
  [/^(gioi tinh|gt)$/, "gender"],
  [/^(ten dang nhap|tai khoan|username)$/, "username"],
  [/^(mat khau|password)$/, "password"],
  [/^(ho ten phu huynh|phu huynh|ten phu huynh|cha me)$/, "parentName"],
  [/^(sdt phu huynh|so dien thoai phu huynh|dien thoai phu huynh|sdt|so dien thoai)$/, "parentPhone"],
  [/^(dia chi|noi o)$/, "address"],
  [/^(to|to so|nhom)$/, "groupNo"],
  [/^(ghi chu|ghichu)$/, "note"],
];

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) {
    const dd = String(v.getUTCDate()).padStart(2, "0");
    const mm = String(v.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${v.getUTCFullYear()}`;
  }
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("").trim();
    if ("text" in v) return String(v.text).trim();
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    return "";
  }
  return String(v).trim();
}

/** Đọc danh sách học sinh từ file .xlsx. Tự dò dòng tiêu đề trong 10 dòng đầu. */
export async function parseStudentWorkbook(buffer: ArrayBuffer): Promise<{ rows: StudentRow[]; error?: string }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    return { rows: [], error: "Không đọc được file. Vui lòng dùng file Excel định dạng .xlsx." };
  }
  const ws = wb.worksheets[0];
  if (!ws) return { rows: [], error: "File không có trang tính nào." };

  let headerRow = 0;
  let columns = new Map<number, keyof Omit<StudentRow, "row">>();
  for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
    const map = new Map<number, keyof Omit<StudentRow, "row">>();
    ws.getRow(r).eachCell((cell, col) => {
      const key = removeDiacritics(cellText(cell.value)).replace(/\s+/g, " ").replace(/[*:]/g, "").trim();
      const hit = HEADER_MAP.find(([re]) => re.test(key));
      if (hit && ![...map.values()].includes(hit[1])) map.set(col, hit[1]);
    });
    if ([...map.values()].includes("fullName")) {
      headerRow = r;
      columns = map;
      break;
    }
  }
  if (!headerRow) return { rows: [], error: 'Không tìm thấy cột "Họ và tên" trong 10 dòng đầu của file.' };

  const rows: StudentRow[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row: StudentRow = { row: r, fullName: "" };
    for (const [col, field] of columns) {
      const text = cellText(ws.getRow(r).getCell(col).value);
      if (text) row[field] = text.replace(/\s+/g, " ");
    }
    if (row.fullName) rows.push(row);
  }
  return { rows };
}

export async function buildStudentTemplate() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Danh sách học sinh");
  ws.columns = [
    { header: "STT", width: 6 },
    { header: "Mã học sinh", width: 14 },
    { header: "Họ và tên", width: 28 },
    { header: "Ngày sinh", width: 14 },
    { header: "Giới tính", width: 10 },
    { header: "Tổ", width: 6 },
    { header: "Họ tên phụ huynh", width: 26 },
    { header: "SĐT phụ huynh", width: 16 },
    { header: "Địa chỉ", width: 30 },
    { header: "Ghi chú", width: 24 },
    { header: "Tên đăng nhập", width: 18 },
    { header: "Mật khẩu", width: 14 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getColumn(2).numFmt = "@";
  ws.getColumn(4).numFmt = "@";
  ws.getColumn(8).numFmt = "@";

  // Ví dụ & hướng dẫn để ở trang riêng, tránh bị nhập nhầm thành học sinh
  const guide = wb.addWorksheet("Hướng dẫn");
  guide.getColumn(1).width = 100;
  [
    "Điền danh sách vào trang tính đầu tiên, mỗi học sinh một dòng, bắt đầu từ dòng 2.",
    "Chỉ bắt buộc cột Họ và tên. Các cột khác có thể bỏ trống.",
    "Ngày sinh ghi dạng dd/mm/yyyy, ví dụ 15/03/2010.",
    "Cột Tổ ghi số tổ (1, 2, 3...) để dùng cho thi đua. Có thể bỏ trống và phân tổ sau trong phần mềm.",
    "Bỏ trống Tên đăng nhập: hệ thống dùng Mã học sinh, hoặc tự tạo theo tên (vd: an.nv.10a1).",
    "Bỏ trống Mật khẩu: hệ thống tạo mật khẩu tạm 6 chữ số. Học sinh phải đổi mật khẩu khi đăng nhập lần đầu.",
    "Ví dụ: 1 | HS001 | Nguyễn Văn An | 15/03/2010 | Nam | 1 | Nguyễn Văn Bình | 0901234567 | (trống) | (trống)",
  ].forEach((line) => guide.addRow([line]));
  return wb.xlsx.writeBuffer();
}

export type StudentExportRow = {
  studentCode: string | null;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  groupNo: number | null;
  parentName: string | null;
  parentPhone: string | null;
  address: string | null;
  note: string | null;
  username: string;
  status: string;
};

/** Xuất danh sách học sinh. Các cột đầu trùng file mẫu nên có thể nhập lại vào lớp khác. */
export async function buildStudentExport(title: string, rows: StudentExportRow[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Danh sách học sinh");
  ws.columns = [
    { header: "STT", width: 6 },
    { header: "Mã học sinh", width: 14 },
    { header: "Họ và tên", width: 28 },
    { header: "Ngày sinh", width: 14 },
    { header: "Giới tính", width: 10 },
    { header: "Tổ", width: 6 },
    { header: "Họ tên phụ huynh", width: 26 },
    { header: "SĐT phụ huynh", width: 16 },
    { header: "Địa chỉ", width: 30 },
    { header: "Ghi chú", width: 24 },
    { header: "Tên đăng nhập", width: 18 },
    { header: "Trạng thái", width: 14 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const col of [2, 4, 8]) ws.getColumn(col).numFmt = "@";
  rows.forEach((r, i) =>
    ws.addRow([
      i + 1,
      r.studentCode ?? "",
      r.fullName,
      r.dateOfBirth ?? "",
      r.gender ?? "",
      r.groupNo ?? "",
      r.parentName ?? "",
      r.parentPhone ?? "",
      r.address ?? "",
      r.note ?? "",
      r.username,
      r.status,
    ]),
  );
  ws.views = [{ state: "frozen", ySplit: 1 }];
  wb.title = title;
  return wb.xlsx.writeBuffer();
}
