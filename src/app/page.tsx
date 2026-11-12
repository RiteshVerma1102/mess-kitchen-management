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
      <h1 className="text-3xl font-semibold tracking-tight">Cook what will be eaten.</h1>
      <p className="mt-3 max-w-prose text-lg">
        Foundation is running. Forecast attendance per meal, turn it into preparation quantities, and measure the waste you avoid.
      </p>
      <ul className="mt-10 divide-y divide-line border-y border-line">
        {modules.map(([id, name]) => (
          <li key={id} className="flex gap-4 py-3">
            <span className="w-10 font-medium text-brand">{id}</span>
            <span>{name}</span>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm">
        Status: <a className="underline" href="/api/health">/api/health</a> and <a className="underline" href="/api/ready">/api/ready</a>
      </p>
    </main>
  );
}
