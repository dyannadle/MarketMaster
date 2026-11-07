import { createFileRoute } from "@tanstack/react-router";
import { Medal } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { challenges, leaderboard } from "@/lib/data";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Challenges & Leaderboard — MarketMaster" },
      { name: "description", content: "Earn badges through learning and disciplined paper trading." },
      { property: "og:title", content: "Challenges — MarketMaster" },
      { property: "og:description", content: "Badges, challenges and a paper-trading leaderboard." },
    ],
  }),
  component: Challenges,
});

function Challenges() {
  return (
    <div>
      <PageHeader title="Challenges" sub="Build skill and discipline — earn badges along the way." />
      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px] md:p-8">
        <div className="grid gap-3 sm:grid-cols-2">
          {challenges.map((c) => (
            <div key={c.title} className="rounded-xl border bg-card p-5">
              <p className="font-semibold">{c.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
              <div className="mt-4 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${c.progress}%` }} /></div>
              <p className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{c.reward}</span><span className="num">{c.progress}%</span></p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="font-semibold">Leaderboard · this month</p>
          <ol className="mt-4 space-y-3">
            {leaderboard.map((l, i) => (
              <li key={l.name} className="flex items-center gap-3 text-sm">
                <span className={`grid size-7 place-items-center rounded-full ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{i === 0 ? <Medal className="size-4" /> : i + 1}</span>
                <span className="flex-1">{l.name}<span className="block text-xs text-muted-foreground">{l.trades} trades</span></span>
                <span className="num text-gain">+{l.ret}%</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
