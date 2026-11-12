const COLORS = ["bg-teal-600", "bg-sky-600", "bg-violet-600", "bg-amber-600", "bg-rose-600", "bg-emerald-600", "bg-indigo-600"];

/** Ảnh đại diện; chưa có ảnh thì hiện chữ cái đầu của tên trên nền màu cố định theo người dùng */
export function Avatar({
  user,
  size = 32,
  className = "",
}: {
  user: { id: string; fullName: string; avatarUpdatedAt?: Date | null };
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (user.avatarUpdatedAt) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/avatar/${user.id}?v=${user.avatarUpdatedAt.getTime()}`}
        alt={user.fullName}
        width={size}
        height={size}
        loading="lazy"
        className={`shrink-0 rounded-full object-cover ring-1 ring-slate-200 ${className}`}
        style={style}
      />
    );
  }
  const given = user.fullName.trim().split(/\s+/).at(-1) ?? "?";
  const hash = [...user.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${COLORS[hash % COLORS.length]} ${className}`}
      style={style}
      title={user.fullName}
    >
      {given.charAt(0).toUpperCase()}
    </span>
  );
}
