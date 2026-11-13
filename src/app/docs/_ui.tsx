import Link from "next/link";

/** Các khối dùng chung cho trang hướng dẫn sử dụng */

export function DocTitle({ role, title, intro }: { role: string; title: string; intro: React.ReactNode }) {
  return (
    <header className="mb-6 border-b border-slate-200 pb-5">
      <p className="text-sm font-medium text-teal-700">{role}</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
      <div className="mt-2 text-slate-600">{intro}</div>
    </header>
  );
}

export function Toc({ items }: { items: [id: string, label: string][] }) {
  return (
    <nav aria-label="Mục lục" className="mb-8 rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-sm font-semibold text-slate-700">Mục lục</p>
      <ol className="grid list-decimal gap-x-8 gap-y-1 pl-5 text-sm sm:grid-cols-2">
        {items.map(([id, label]) => (
          <li key={id}>
            <a href={`#${id}`} className="text-teal-700 hover:underline">
              {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-20">
      <h2 className="mb-3 text-xl font-semibold text-slate-900">
        <a href={`#${id}`} className="hover:underline">
          {title}
        </a>
      </h2>
      <div className="space-y-3 leading-relaxed text-slate-700 [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">{children}</div>
    </section>
  );
}

export function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 pt-1">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {children}
    </div>
  );
}

/** Đường đi trong menu, ví dụ: Lớp chủ nhiệm › 8A1 › Học sinh */
export function Path({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-sm font-medium text-slate-800">{children}</span>;
}

/** Tên nút / mục trên màn hình */
export function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-slate-900">{children}</strong>;
}

export function Tip({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">💡 {children}</div>;
}

export function Warn({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">⚠️ {children}</div>;
}

export function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SeeAlso({ links }: { links: [href: string, label: string][] }) {
  return (
    <div className="mt-12 flex flex-wrap gap-2 border-t border-slate-200 pt-6 text-sm">
      <span className="text-slate-500">Xem thêm:</span>
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="text-teal-700 hover:underline">
          {label}
        </Link>
      ))}
    </div>
  );
}
