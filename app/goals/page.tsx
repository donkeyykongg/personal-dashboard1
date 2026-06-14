import GoalsBoard from "@/components/GoalsBoard";

export const dynamic = "force-dynamic";

export default function GoalsPage() {
  return (
    <div className="dash-hub space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Goals</h1>
        <p className="mt-1 text-sm text-[#76746E]">
          Set each goal, track progress, and watch the radar update.
        </p>
      </header>
      <GoalsBoard />
    </div>
  );
}
