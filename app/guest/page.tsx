import Link from "next/link";
import { EyeOff, Lock, Wallet } from "lucide-react";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

export const metadata = { title: "Guest Mode · Personal Dashboard" };

export default function GuestPage() {
  return (
    <div className="dash-hub space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="rowan-eyebrow">Guest mode</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Personal Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#B8B6B0]">
            A public preview of the app shell. Private account names, balances, notes, events,
            and cash-flow numbers are hidden.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white hover:bg-white/[0.12]"
        >
          Sign in
        </Link>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <GuestMetric label="Net worth" />
        <GuestMetric label="Monthly outflow" />
        <GuestMetric label="Net cash flow" />
      </section>

      <section className="rowan-panel p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="rowan-eyebrow">Finances preview</div>
            <h2 className="mt-1 text-xl font-semibold text-white">Cash flow and subscriptions</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-[#B8B6B0]">
            <Lock className="h-3 w-3" />
            Data hidden
          </span>
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.025] p-1">
          {["Net worth", "Subscriptions", "Cash flow", "Business"].map((tab) => (
            <div
              key={tab}
              className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.10em] ${
                tab === "Subscriptions" ? "bg-white/[0.06] text-white" : "text-[#76746E]"
              }`}
            >
              {tab}
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#76746E]">
                  Subscriptions
                </div>
                <div className="mt-1 text-3xl font-bold text-white">CAD --</div>
              </div>
              <Wallet className="h-5 w-5 text-[#76746E]" />
            </div>
            <div className="space-y-2">
              {["VPN service", "Design tool", "Cloud storage"].map((name) => (
                <div
                  key={name}
                  className="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-black/20 p-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{name}</div>
                    <div className="mt-1 text-[11px] text-[#76746E]">
                      Total prepaid · already outflow
                    </div>
                  </div>
                  <div className="text-right text-sm font-bold text-white">CAD --</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#76746E]">
                  Month-by-month
                </div>
                <div className="mt-1 text-sm text-[#B8B6B0]">
                  Net cash flow is visible after sign-in.
                </div>
              </div>
              <EyeOff className="h-5 w-5 text-[#76746E]" />
            </div>
            <div className="flex h-64 items-end gap-3 border-b border-l border-white/10 px-3 pb-3">
              {months.map((month, index) => (
                <div key={month} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t bg-white/[0.10]"
                    style={{ height: `${70 + index * 18}px` }}
                  />
                  <div className="text-[10px] font-semibold text-[#76746E]">{month}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function GuestMetric({ label }: { label: string }) {
  return (
    <div className="rowan-panel p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#76746E]">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-white">CAD --</div>
      <div className="mt-1 h-2 w-24 rounded-full bg-white/[0.08]" />
    </div>
  );
}
