import { AlertTriangle, CheckCircle2, Leaf, QrCode, Sparkles, TrendingDown } from "lucide-react";

/** Code-built dashboard preview for the homepage. Numbers here are illustrative UI, not app data. */
const bars = [62, 70, 66, 78, 74, 58, 49, 68, 72, 81, 77, 69, 55, 47];
const forecast = [64, 69, 68, 76, 75, 60, 50, 67, 74, 79, 78, 70, 56, 48];

export function ProductMockup() {
  const max = 90;
  return (
    <div className="relative mx-auto w-full max-w-[640px]" aria-label="FoodFlow dashboard preview" role="img">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-saffron-gradient opacity-25 blur-3xl" aria-hidden />
      <div className="relative overflow-hidden rounded-3xl border bg-card shadow-lg">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b bg-muted/60 px-4 py-3">
          <span className="size-2.5 rounded-full bg-destructive/60" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-success/60" />
          <span className="ml-3 rounded-md bg-card px-3 py-1 text-[11px] text-muted-foreground">app.foodflow.in/dashboard</span>
        </div>
        <div className="grid gap-4 p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Thursday · Lunch</p>
              <p className="font-display text-xl font-semibold">Good afternoon, Meera</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">
              <span className="size-1.5 animate-pulse-dot rounded-full bg-success" /> Live
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { k: "Served / expected", v: "386 / 412", t: "94%" },
              { k: "Cost per plate", v: "₹42.80", t: "−₹3.10" },
              { k: "Waste today", v: "4.1%", t: "−1.6 pts" },
            ].map((m) => (
              <div key={m.k} className="rounded-xl border bg-background p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{m.k}</p>
                <p className="mt-1 font-display text-lg font-semibold tabular">{m.v}</p>
                <p className="text-[11px] font-semibold text-success">{m.t}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-background p-4">
            <div className="mb-3 flex items-center justify-between text-xs">
              <span className="font-semibold">Served vs forecast · 14 days</span>
              <span className="flex items-center gap-3 text-muted-foreground">
                <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-primary" />Served</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-saffron" />Forecast</span>
              </span>
            </div>
            <div className="flex h-28 items-end gap-1.5">
              {bars.map((b, i) => (
                <div key={i} className="relative flex h-full flex-1 items-end">
                  <div className="w-full rounded-t-sm bg-primary/85" style={{ height: `${(b / max) * 100}%` }} />
                  <div
                    className="absolute inset-x-0 h-0.5 rounded bg-saffron"
                    style={{ bottom: `${((forecast[i] ?? 0) / max) * 100}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2 rounded-xl border bg-warning-soft/60 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <div>
                <p className="font-semibold">Toor dal low</p>
                <p className="text-muted-foreground">18 kg left · need 42 kg by Sat</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl border bg-primary-soft/60 p-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">AI suggestion</p>
                <p className="text-muted-foreground">Cut Tue dinner rice by 12%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* floating cards */}
      <div className="glass absolute -left-8 top-[54%] hidden animate-float rounded-2xl border p-3 shadow-md sm:block">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-success-soft text-success">
            <QrCode className="size-5" />
          </span>
          <div className="text-xs">
            <p className="font-semibold">Asha R. · Hall B</p>
            <p className="flex items-center gap-1 text-success"><CheckCircle2 className="size-3" /> Lunch marked</p>
          </div>
        </div>
      </div>
      <div
        className="glass absolute -right-4 bottom-16 hidden animate-float rounded-2xl border p-3 shadow-md sm:block"
        style={{ animationDelay: "-3s" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-saffron-soft text-accent-foreground">
            <TrendingDown className="size-5" />
          </span>
          <div className="text-xs">
            <p className="font-semibold">Tomorrow: 412 plates</p>
            <p className="flex items-center gap-1 text-muted-foreground"><Leaf className="size-3 text-veg" /> 91% confidence</p>
          </div>
        </div>
      </div>
    </div>
  );
}
