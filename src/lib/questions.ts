// Kiểu dữ liệu & quy tắc của phiếu tự đánh giá. Dùng chung cho client và server.

export type ChoiceOption = {
  id: string;
  label: string;
  /** Điểm của lựa chọn, dùng để vẽ biểu đồ tiến bộ (cao = tốt) */
  score: number;
  /** Đánh dấu giáo viên cần quan tâm khi học sinh chọn ý này */
  alert?: boolean;
  /** Mục tiêu gợi ý cho tuần sau khi học sinh chọn ý này */
  goal?: string;
};

export type Question = {
  id: string;
  type: "single" | "text";
  text: string;
  required: boolean;
  options?: ChoiceOption[];
};

/** single: id lựa chọn; text: nội dung học sinh viết */
export type Answers = Record<string, string>;

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Kiểm tra & làm sạch dữ liệu câu hỏi (từ DB hoặc từ form) */
export function parseQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) return [];
  const out: Question[] = [];
  for (const q of raw) {
    if (!q || typeof q !== "object") continue;
    const r = q as Record<string, unknown>;
    const text = String(r.text ?? "").trim();
    if (!text) continue;
    const type = r.type === "text" ? "text" : "single";
    const question: Question = {
      id: typeof r.id === "string" && r.id ? r.id : newId(),
      type,
      text: text.slice(0, 500),
      required: r.required !== false,
    };
    if (type === "single") {
      const opts = Array.isArray(r.options) ? r.options : [];
      question.options = opts
        .map((o) => {
          const ro = (o ?? {}) as Record<string, unknown>;
          const label = String(ro.label ?? "").trim();
          const score = Number(ro.score);
          const goal = String(ro.goal ?? "").trim();
          return {
            id: typeof ro.id === "string" && ro.id ? ro.id : newId(),
            label: label.slice(0, 300),
            score: Number.isFinite(score) ? score : 0,
            alert: ro.alert === true,
            goal: goal ? goal.slice(0, 300) : undefined,
          } satisfies ChoiceOption;
        })
        .filter((o) => o.label);
      if (question.options.length < 2) continue;
    }
    out.push(question);
  }
  return out;
}

export function parseAnswers(raw: unknown): Answers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Answers = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") out[k] = v;
  return out;
}

export function findOption(q: Question, answers: Answers) {
  return q.type === "single" ? q.options?.find((o) => o.id === answers[q.id]) : undefined;
}

/** Điểm tự đánh giá 0–100 tính trên các câu trắc nghiệm, null nếu phiếu không có câu trắc nghiệm */
export function computeScore(questions: Question[], answers: Answers): number | null {
  let got = 0;
  let max = 0;
  let min = 0;
  for (const q of questions) {
    if (q.type !== "single" || !q.options?.length) continue;
    const scores = q.options.map((o) => o.score);
    const qMax = Math.max(...scores);
    const qMin = Math.min(...scores);
    max += qMax;
    min += qMin;
    got += findOption(q, answers)?.score ?? qMin;
  }
  if (max === min) return null;
  return Math.round(((got - min) / (max - min)) * 100);
}

/** Các lựa chọn học sinh đã chọn mà giáo viên đánh dấu cần quan tâm */
export function alertOptions(questions: Question[], answers: Answers) {
  const out: { question: Question; option: ChoiceOption }[] = [];
  for (const q of questions) {
    const opt = findOption(q, answers);
    if (opt?.alert) out.push({ question: q, option: opt });
  }
  return out;
}

// Từ khóa báo động trong câu trả lời tự luận. Khi gặp, phiếu được gắn cờ KHẨN
// để giáo viên xử lý trực tiếp; hệ thống không tự phản hồi gì cho học sinh.
const URGENT_KEYWORDS = [
  "tu tu",
  "muon chet",
  "chan song",
  "khong muon song",
  "tu lam dau",
  "tu hai",
  "rach tay",
  "cat tay",
  "bi danh",
  "danh em",
  "bat nat",
  "de doa",
  "doa danh",
  "xam hai",
  "so mo",
  "bao luc",
  "bo nha",
  "tram cam",
];

export function findUrgentKeywords(questions: Question[], answers: Answers): string[] {
  const found = new Set<string>();
  for (const q of questions) {
    if (q.type !== "text") continue;
    const text = normalize(answers[q.id] ?? "");
    if (!text) continue;
    for (const kw of URGENT_KEYWORDS) {
      if (new RegExp(`(^|\\s)${kw}(\\s|$)`).test(text)) found.add(kw);
    }
  }
  return [...found];
}

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Gợi ý nhận xét theo quy tắc (không dùng AI): ghi nhận các ý đạt mức cao nhất,
 * nhắc các ý chưa tốt và lấy mục tiêu gợi ý gắn với lựa chọn của học sinh.
 * Giáo viên luôn xem và sửa trước khi gửi.
 */
export function buildFeedbackDraft(
  questions: Question[],
  answers: Answers,
  ctx: { previousScore?: number | null; score?: number | null } = {},
) {
  const strengths: string[] = [];
  const improvements: string[] = [];
  // priority: ý "cần quan tâm" trước, rồi tới ý có điểm tương đối thấp
  const goalCandidates: { goal: string; priority: number }[] = [];

  for (const q of questions) {
    if (q.type !== "single" || !q.options?.length) continue;
    const opt = findOption(q, answers);
    if (!opt) continue;
    const scores = q.options.map((o) => o.score);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const relative = max > min ? (opt.score - min) / (max - min) : 1;
    if (opt.score === max) strengths.push(opt.label);
    else if (opt.alert || relative < 0.5) improvements.push(opt.label);
    if (opt.goal) goalCandidates.push({ goal: opt.goal, priority: opt.alert ? -1 : relative });
  }
  const goals = [...new Set(goalCandidates.sort((a, b) => a.priority - b.priority).map((g) => g.goal))];

  const parts: string[] = [];
  if (strengths.length) {
    parts.push(`Tuần này em đã làm tốt:\n${strengths.map((s) => `- ${s}`).join("\n")}`);
  }
  const { previousScore, score } = ctx;
  if (previousScore != null && score != null) {
    if (score - previousScore >= 10) parts.push("Em đã có sự tiến bộ rõ rệt so với tuần trước. Hãy tiếp tục phát huy nhé!");
    else if (previousScore - score >= 10) parts.push("Tuần này em có phần chững lại so với tuần trước, không sao cả, mình cùng cố gắng lại nhé.");
  }
  if (improvements.length) {
    parts.push(`Em cần chú ý hơn:\n${improvements.map((s) => `- ${s}`).join("\n")}`);
  }
  parts.push("Tin rằng em sẽ làm tốt hơn trong tuần tới!");

  return { content: parts.join("\n\n"), goals: goals.slice(0, 3) };
}

/** Phiếu mẫu ban đầu theo đề xuất của nhà trường */
export const DEFAULT_QUESTIONS: Question[] = [
  {
    id: "hoc-tap",
    type: "single",
    required: true,
    text: "Trong tuần qua, em đã thực hiện việc học tập như thế nào?",
    options: [
      { id: "a", label: "Luôn chủ động và hoàn thành nhiệm vụ.", score: 3 },
      { id: "b", label: "Đa số nhiệm vụ được hoàn thành.", score: 2 },
      {
        id: "c",
        label: "Còn một số nhiệm vụ chưa hoàn thành.",
        score: 1,
        goal: "Ghi lại bài tập mỗi ngày và hoàn thành trước khi đi ngủ.",
      },
      {
        id: "d",
        label: "Chưa thực hiện tốt.",
        score: 0,
        alert: true,
        goal: "Lập thời gian biểu học tập và nhờ bạn hoặc cô hỗ trợ khi gặp bài khó.",
      },
    ],
  },
  {
    id: "dung-gio",
    type: "single",
    required: true,
    text: "Em có đi học đúng giờ không?",
    options: [
      { id: "a", label: "Đúng giờ cả tuần.", score: 2 },
      {
        id: "b",
        label: "Trễ 1 lần.",
        score: 1,
        goal: "Chuẩn bị sách vở và quần áo từ tối hôm trước.",
      },
      {
        id: "c",
        label: "Trễ 2 lần trở lên.",
        score: 0,
        alert: true,
        goal: "Chuẩn bị sách vở, quần áo từ tối hôm trước và cố gắng đi học đúng giờ cả tuần.",
      },
    ],
  },
  {
    id: "noi-quy",
    type: "single",
    required: true,
    text: "Em đã thực hiện nội quy lớp học như thế nào?",
    options: [
      { id: "a", label: "Luôn thực hiện tốt.", score: 2 },
      {
        id: "b",
        label: "Có lúc chưa thực hiện tốt.",
        score: 1,
        goal: "Đọc lại nội quy lớp và chọn một điều để thực hiện thật tốt trong tuần.",
      },
      {
        id: "c",
        label: "Cần cố gắng nhiều hơn.",
        score: 0,
        alert: true,
        goal: "Đọc lại nội quy lớp và chọn một điều để thực hiện thật tốt trong tuần.",
      },
    ],
  },
  {
    id: "ung-xu",
    type: "single",
    required: true,
    text: "Em đã ứng xử với bạn bè như thế nào?",
    options: [
      { id: "a", label: "Biết tôn trọng và giúp đỡ bạn.", score: 2 },
      { id: "b", label: "Có lúc xảy ra bất đồng nhưng biết giải quyết.", score: 1 },
      {
        id: "c",
        label: "Có tình huống em chưa kiểm soát tốt lời nói hoặc cảm xúc.",
        score: 0,
        alert: true,
        goal: "Khi tức giận, hãy dừng lại 10 giây trước khi phản ứng.",
      },
    ],
  },
  { id: "tu-hao", type: "text", required: false, text: "Tuần này em tự hào nhất về điều gì?" },
  { id: "cai-thien", type: "text", required: false, text: "Điều gì em muốn cải thiện trong tuần tới?" },
  { id: "ho-tro", type: "text", required: false, text: "Em mong muốn thầy/cô hỗ trợ điều gì?" },
];
