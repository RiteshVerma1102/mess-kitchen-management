import Link from 'next/link';

const modules = [
  ['M1', 'Menu, dish and recipe management'],
  ['M2', 'Meal attendance capture (offline-first)'],
  ['M3', 'Calendar and event registry'],
  ['M4', 'Historical demand analysis'],
  ['M5', 'Forecasting engine'],
  ['M6', 'Preparation and ingredient planning'],
  ['M7', 'Post-service recording'],
  ['M8', 'Waste measurement and costing'],
  ['M9', 'Accuracy and improvement reporting'],
];

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-2xl text-white shadow-md">
          🍲
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Smart Mess & Kitchen System</h1>
          <p className="text-sm text-ink/70">Cook what will be eaten. Reduce food waste through predictive forecasting.</p>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90 transition"
        >
          Sign In to Portal →
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-line bg-paper px-5 py-2.5 text-sm font-semibold text-ink hover:bg-stone-100 dark:hover:bg-stone-800 transition"
        >
          Open Operations Dashboard
        </Link>
      </div>

      <ul className="mt-12 divide-y divide-line border-y border-line">
        {modules.map(([id, name]) => (
          <li key={id} className="flex gap-4 py-3 text-xs">
            <span className="w-10 font-bold text-brand">{id}</span>
            <span className="text-ink/80">{name}</span>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-ink/60">
        System Health: <a className="underline hover:text-brand" href="/api/health">/api/health</a> and{' '}
        <a className="underline hover:text-brand" href="/api/ready">/api/ready</a>
      </p>
    </main>
  );
}
