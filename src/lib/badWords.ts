/**
 * Che từ ngữ không phù hợp bằng *** (so khớp không dấu, theo từ). Cùng danh sách với phòng chat
 * trong dịch vụ realtime (realtime/server.mjs) — sửa danh sách thì sửa cả hai nơi.
 */
const BAD_WORDS = ["dm", "dmm", "dcm", "du ma", "dit", "deo", "vcl", "vkl", "vl", "cc", "lon", "buoi", "cac", "di me", "con cho", "thang cho", "oc cho", "ngu nhu cho", "fuck", "shit"];

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

export function filterText(text: string) {
  const words = text.split(/(\s+)/);
  const plain = words.map((w) => normalize(w).replace(/[^a-z0-9]/g, ""));
  for (const bad of BAD_WORDS) {
    const parts = bad.split(" ");
    for (let i = 0; i < words.length; i += 2) {
      let j = i;
      let k = 0;
      while (k < parts.length && j < words.length && plain[j] === parts[k]) {
        j += 2;
        k++;
      }
      if (k === parts.length) for (let m = i; m < j; m += 2) words[m] = "***";
    }
  }
  return words.join("");
}
