export const NOTE_TYPE: Record<"POSITIVE" | "PROGRESS" | "CONCERN", { label: string; style: string }> = {
  POSITIVE: { label: "Hành động tích cực", style: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  PROGRESS: { label: "Chuyển biến", style: "bg-sky-50 text-sky-800 ring-sky-200" },
  CONCERN: { label: "Cần quan tâm", style: "bg-amber-50 text-amber-800 ring-amber-200" },
};
