import { alertOptions, parseAnswers, parseQuestions } from "./questions";

export type Flag = { level: "urgent" | "warn" | "info"; text: string };

type ResponseLike = { answers: unknown; score: number | null; urgent: boolean } | null | undefined;

/**
 * Dấu hiệu cần quan tâm của một học sinh tại một đợt, dựa trên quy tắc cố định.
 * missedStreak: số đợt đã đóng liên tiếp gần nhất học sinh không nộp.
 */
export function studentFlags(opts: {
  questions: unknown;
  current: ResponseLike;
  previous?: ResponseLike;
  missedStreak?: number;
}): Flag[] {
  const flags: Flag[] = [];
  const { current, previous, missedStreak = 0 } = opts;

  if (missedStreak >= 2) flags.push({ level: "warn", text: `Không nộp phiếu ${missedStreak} đợt liên tiếp` });
  if (!current) return flags;

  if (current.urgent) flags.push({ level: "urgent", text: "Câu trả lời có nội dung cần xử lý ngay" });
  if (current.score != null && current.score < 50) {
    flags.push({ level: "warn", text: `Mức tự đánh giá thấp (${current.score}%)` });
  }
  if (current.score != null && previous?.score != null && previous.score - current.score >= 20) {
    flags.push({ level: "warn", text: `Giảm ${previous.score - current.score} điểm so với đợt trước` });
  }
  const questions = parseQuestions(opts.questions);
  for (const { option } of alertOptions(questions, parseAnswers(current.answers))) {
    flags.push({ level: "info", text: option.label });
  }
  return flags;
}

export function flagRank(flags: Flag[]) {
  return flags.reduce((s, f) => s + (f.level === "urgent" ? 100 : f.level === "warn" ? 10 : 1), 0);
}

export const FLAG_STYLE: Record<Flag["level"], string> = {
  urgent: "bg-red-100 text-red-800 ring-red-200",
  warn: "bg-amber-100 text-amber-800 ring-amber-200",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
};
