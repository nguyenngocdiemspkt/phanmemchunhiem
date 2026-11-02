import { fmtDate } from "@/lib/format";

export function FeedbackCard({
  title,
  content,
  goals,
  teacher,
  date,
}: {
  title?: string;
  content: string;
  goals: string[];
  teacher?: string | null;
  date?: Date | null;
}) {
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
      {title && <div className="mb-2 text-sm font-semibold text-teal-900">{title}</div>}
      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800">{content}</p>
      {goals.length > 0 && (
        <div className="mt-3 rounded-lg bg-white p-3">
          <div className="mb-1 text-sm font-semibold text-teal-800">🎯 Thử thách tuần tới của em</div>
          <ol className="list-inside list-decimal space-y-1 text-sm">
            {goals.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ol>
        </div>
      )}
      {(teacher || date) && (
        <div className="mt-2 text-right text-xs text-slate-500">
          {teacher}
          {teacher && date ? " · " : ""}
          {date ? fmtDate(date) : ""}
        </div>
      )}
    </div>
  );
}

export function goalsOf(json: unknown): string[] {
  return Array.isArray(json) ? json.map(String).filter(Boolean) : [];
}
