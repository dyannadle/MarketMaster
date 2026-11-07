import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { curriculum } from "@/lib/data";

export const Route = createFileRoute("/learn/")({
  head: () => ({
    meta: [
      { title: "Learning Academy — MarketMaster" },
      { name: "description", content: "Six levels from financial literacy to algorithmic and global markets." },
      { property: "og:title", content: "Learning Academy — MarketMaster" },
      { property: "og:description", content: "Structured curriculum covering equity, F&O, currency, commodities, funds, RMS and algo." },
    ],
  }),
  component: Learn,
});

function Learn() {
  const [lvl, setLvl] = useState<number | null>(null);
  const levels = lvl === null ? curriculum : curriculum.filter((l) => l.level === lvl);
  return (
    <div>
      <PageHeader title="Learning Academy" sub="Concept-level lessons with examples, quizzes and simulator practice." />
      <div className="flex gap-2 overflow-x-auto px-5 py-4 md:px-8">
        <Chip on={lvl === null} onClick={() => setLvl(null)}>All levels</Chip>
        {curriculum.map((l) => <Chip key={l.level} on={lvl === l.level} onClick={() => setLvl(l.level)}>L{l.level} · {l.name}</Chip>)}
      </div>
      <div className="space-y-10 px-5 pb-10 md:px-8">
        {levels.map((l) => (
          <section key={l.level}>
            <div className="mb-4 flex items-baseline gap-3">
              <span className="num text-sm text-primary">LEVEL {l.level}</span>
              <h2 className="text-xl font-semibold">{l.name}</h2>
              <span className="hidden text-sm text-muted-foreground sm:inline">{l.blurb}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {l.courses.map((c) => (
                <Link key={c.id} to="/learn/$courseId" params={{ courseId: c.id }} className="rounded-xl border bg-card p-4 transition hover:shadow-glow">
                  <p className="num text-xs text-muted-foreground">Course {c.code}</p>
                  <p className="mt-1 font-semibold">{c.title}</p>
                  <p className="mt-3 line-clamp-1 text-xs text-muted-foreground">{c.topics.join(" · ")}</p>
                  <p className="mt-3 text-xs text-primary">{c.lessons} lessons</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}
