import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { allCourses } from "@/lib/data";

export const Route = createFileRoute("/learn/$courseId")({
  loader: ({ params }) => {
    const course = allCourses.find((c) => c.id === params.courseId);
    if (!course) throw notFound();
    return course;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Course"} — MarketMaster Academy` },
      { name: "description", content: `Learn ${loaderData?.topics.join(", ")}.` },
      { property: "og:title", content: `${loaderData?.title} — MarketMaster` },
      { property: "og:description", content: `Course ${loaderData?.code}: ${loaderData?.topics.join(", ")}.` },
    ],
  }),
  component: CoursePage,
});

const sections = ["Concept", "Why it matters", "Worked example", "Common mistakes", "Practise in simulator"];

function CoursePage() {
  const c = Route.useLoaderData();
  const [active, setActive] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const topic = c.topics[active] ?? "";
  return (
    <div className="grid md:grid-cols-[280px_1fr]">
      <aside className="border-b p-5 md:min-h-screen md:border-b-0 md:border-r">
        <Link to="/learn" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Academy</Link>
        <p className="num text-xs text-primary">LEVEL {c.level} · COURSE {c.code}</p>
        <h1 className="mt-1 text-xl font-bold">{c.title}</h1>
        <ol className="mt-5 space-y-1">
          {c.topics.map((t, i) => (
            <li key={t}>
              <button onClick={() => { setActive(i); setAnswer(null); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${i === active ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {i < active ? <CheckCircle2 className="size-4 text-gain" /> : <Circle className="size-4" />}{t}
              </button>
            </li>
          ))}
        </ol>
      </aside>
      <article className="max-w-3xl p-5 md:p-10">
        <p className="text-sm text-muted-foreground">Lesson {active + 1} of {c.topics.length}</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">{topic}</h2>
        <div className="mt-8 space-y-6">
          {sections.map((s, i) => (
            <section key={s} className="rounded-xl border bg-card p-5">
              <p className="num text-xs text-primary">0{i + 1}</p>
              <h3 className="mt-1 font-semibold">{s}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {i === 4
                  ? <>Open the paper trading terminal and apply <b className="text-foreground">{topic}</b> on a live simulated instrument. <Link to="/trade" className="text-primary underline">Go to terminal →</Link></>
                  : `${s} for ${topic.toLowerCase()} within ${c.title.toLowerCase()} — explained in plain language with Indian market examples (NSE, BSE, MCX) and a short recap at the end.`}
              </p>
            </section>
          ))}
          <section className="rounded-xl border border-primary/40 bg-card p-5">
            <h3 className="font-semibold">Quick check</h3>
            <p className="mt-2 text-sm">Which of these best describes the purpose of learning “{topic}”?</p>
            <div className="mt-3 grid gap-2">
              {["Making better-informed decisions", "Guaranteed profits", "Avoiding all risk"].map((o, i) => (
                <button key={o} onClick={() => setAnswer(i)} className={`rounded-lg border px-3 py-2 text-left text-sm ${answer === i ? (i === 0 ? "border-gain text-gain" : "border-loss text-loss") : "hover:bg-accent"}`}>{o}</button>
              ))}
            </div>
          </section>
          {active < c.topics.length - 1 && <Button onClick={() => { setActive(active + 1); setAnswer(null); }}>Next lesson</Button>}
        </div>
      </article>
    </div>
  );
}
