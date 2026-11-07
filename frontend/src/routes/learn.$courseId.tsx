import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, AlertTriangle, ArrowRight, Lightbulb, BookOpen, TrendingUp, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { allCourses } from "@/lib/data";
import { getLessonDetails } from "@/lib/lesson-data";
import { InflationVisualizer } from "@/components/visualizers/InflationVisualizer";
import { CompoundingVisualizer } from "@/components/visualizers/CompoundingVisualizer";

export const Route = createFileRoute("/learn/$courseId")({
  loader: ({ params }) => {
    const course = allCourses.find((c) => c.id === params.courseId);
    if (!course) throw notFound();
    return course;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Course"} — MarketMaster Academy` },
      { name: "description", content: `Learn ${loaderData?.topics.join(", ")} with deep interactive visualizers.` },
      { property: "og:title", content: `${loaderData?.title} — MarketMaster` },
      { property: "og:description", content: `Course ${loaderData?.code}: ${loaderData?.topics.join(", ")}.` },
    ],
  }),
  component: CoursePage,
});

function CoursePage() {
  const c = Route.useLoaderData();
  const [active, setActive] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const topic = c.topics[active] ?? "";
  const lesson = getLessonDetails(topic, c.title, c.level);

  return (
    <div className="grid md:grid-cols-[280px_1fr]">
      {/* Sidebar: Course Index & Progress */}
      <aside className="border-b p-5 md:min-h-screen md:border-b-0 md:border-r bg-card/30">
        <Link to="/learn" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Academy Courses
        </Link>
        <p className="num text-xs font-semibold uppercase tracking-wider text-primary">
          LEVEL {c.level} · COURSE {c.code}
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">{c.title}</h1>

        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Module Syllabus</p>
          <ol className="mt-3 space-y-1.5">
            {c.topics.map((t, i) => (
              <li key={t}>
                <button
                  onClick={() => {
                    setActive(i);
                    setSelectedAnswer(null);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                    i === active
                      ? "bg-accent font-medium text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  }`}
                >
                  {i < active ? (
                    <CheckCircle2 className="size-4 text-gain shrink-0" />
                  ) : (
                    <Circle className="size-4 shrink-0" />
                  )}
                  <span className="truncate">{t}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      {/* Main Content Area */}
      <article className="max-w-4xl p-5 md:p-10 space-y-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <span>Lesson {active + 1} of {c.topics.length}</span>
            <span>•</span>
            <span>Level {c.level} Masterclass</span>
          </div>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {lesson.title}
          </h2>
          <p className="mt-2 text-base text-muted-foreground leading-relaxed">
            {lesson.subtitle}
          </p>
        </div>

        {/* 01 Concept */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">01</span>
            <h3 className="text-lg font-bold text-foreground">Core Financial Concept</h3>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            {lesson.concept.overview}
          </p>

          {/* Mathematical Formula Callout */}
          {lesson.concept.formula && (
            <div className="mt-5 rounded-lg border border-primary/25 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Mathematical Formulation</p>
              <div className="mt-2 font-mono text-base font-bold text-foreground bg-background/80 p-3 rounded border border-border">
                {lesson.concept.formula}
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {lesson.concept.formulaExplanation}
              </p>
            </div>
          )}

          {/* Pillars Grid */}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {lesson.concept.pillars.map((pillar, idx) => (
              <div key={idx} className="rounded-lg border border-border/60 bg-background/60 p-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Lightbulb className="size-4 text-primary shrink-0" />
                  {pillar.title}
                </h4>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg bg-accent/40 p-3 text-xs text-foreground font-medium flex items-center gap-2">
            <BookOpen className="size-4 text-primary shrink-0" />
            <span>Key Takeaway: {lesson.concept.keyTakeaway}</span>
          </div>
        </section>

        {/* 02 Why It Matters */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">02</span>
            <h3 className="text-lg font-bold text-foreground">Why It Matters (The Financial Stakes)</h3>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {lesson.whyItMatters.stakes}
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {lesson.whyItMatters.realWorldImpact}
          </p>

          {/* Asset Class Real Return Comparison */}
          {lesson.whyItMatters.marketComparison && (
            <div className="mt-5 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground font-semibold uppercase">
                  <tr>
                    <th className="p-3">Asset / Instrument</th>
                    <th className="p-3">Nominal Yield</th>
                    <th className="p-3">Real Return (Net)</th>
                    <th className="p-3">Economic Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {lesson.whyItMatters.marketComparison.map((row, idx) => (
                    <tr key={idx} className="hover:bg-accent/30 font-sans">
                      <td className="p-3 font-semibold text-foreground">{row.asset}</td>
                      <td className="p-3 font-mono text-muted-foreground">{row.nominal}</td>
                      <td className={`p-3 font-mono font-bold ${row.real.startsWith("+") ? "text-gain" : row.real.startsWith("-") ? "text-loss" : "text-foreground"}`}>
                        {row.real}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{row.verdict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 03 Worked Example & Interactive Visualizer */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">03</span>
            <h3 className="text-lg font-bold text-foreground">Deep Worked Example & Visualizer</h3>
          </div>

          <div className="rounded-lg bg-accent/30 p-4 border border-border/80">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Practical Case Study</p>
            <p className="mt-1 text-sm font-medium text-foreground">{lesson.workedExample.scenario}</p>
          </div>

          {/* Interactive Visualizer Integration */}
          {topic === "Inflation" && <InflationVisualizer />}
          {topic === "Compounding" && <CompoundingVisualizer />}

          {/* Step-by-step breakdown */}
          <div className="grid gap-3 sm:grid-cols-2">
            {lesson.workedExample.steps.map((st, idx) => (
              <div key={idx} className="rounded-lg border border-border/70 bg-background/50 p-3.5">
                <p className="text-xs font-bold text-primary font-mono">{st.step}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{st.detail}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-gain/30 bg-gain/5 p-3 text-xs text-gain font-medium flex items-center gap-2">
            <TrendingUp className="size-4 shrink-0" />
            <span>Conclusion: {lesson.workedExample.takeaway}</span>
          </div>
        </section>

        {/* 04 Common Mistakes */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-loss/20 text-xs font-bold text-loss">04</span>
            <h3 className="text-lg font-bold text-foreground">Fatal Retail Pitfalls & Remedies</h3>
          </div>

          <div className="mt-5 space-y-4">
            {lesson.commonMistakes.map((m, idx) => (
              <div key={idx} className="rounded-lg border border-loss/20 bg-loss/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="size-4 text-loss shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{m.mistake}</h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Why It Happens:</strong> {m.whyItHappens}
                    </p>
                    <p className="mt-1.5 text-xs text-gain font-medium leading-relaxed">
                      <strong>Institutional Fix:</strong> {m.remedy}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 05 Practice in Simulator Drill */}
        <section className="rounded-xl border border-primary/30 bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">05</span>
            <h3 className="text-lg font-bold text-foreground">Actionable Simulator Drill</h3>
          </div>

          <p className="text-sm text-foreground font-medium">{lesson.practiceDrill.objective}</p>

          <ol className="space-y-1.5 text-xs text-muted-foreground font-mono">
            {lesson.practiceDrill.actionSteps.map((step, idx) => (
              <li key={idx} className="font-sans">{step}</li>
            ))}
          </ol>

          <div className="pt-2">
            <Button asChild className="gap-2">
              <Link to="/trade">
                Launch Terminal Simulator ({lesson.practiceDrill.instrument})
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* 06 Interactive Knowledge Check Quiz */}
        <section className="rounded-xl border border-primary/40 bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="size-5 text-primary shrink-0" />
            <h3 className="text-base font-bold text-foreground">Concept Mastery Check</h3>
          </div>

          <p className="text-sm font-medium text-foreground">{lesson.quiz.question}</p>

          <div className="grid gap-2.5">
            {lesson.quiz.options.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              let btnClass = "border-border hover:bg-accent/50 text-foreground";

              if (isSelected) {
                btnClass = opt.correct
                  ? "border-gain bg-gain/10 text-gain font-semibold"
                  : "border-loss bg-loss/10 text-loss font-semibold";
              }

              return (
                <div key={idx} className="space-y-1.5">
                  <button
                    onClick={() => setSelectedAnswer(idx)}
                    className={`w-full text-left rounded-lg border p-3 text-xs transition-all ${btnClass}`}
                  >
                    {opt.text}
                  </button>
                  {isSelected && (
                    <div className={`p-2.5 rounded-lg text-xs leading-relaxed ${opt.correct ? "bg-gain/15 text-gain" : "bg-loss/15 text-loss"}`}>
                      {opt.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Next Lesson Navigation */}
        <div className="flex items-center justify-between border-t pt-6">
          {active > 0 ? (
            <Button
              variant="outline"
              onClick={() => {
                setActive(active - 1);
                setSelectedAnswer(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Previous Lesson
            </Button>
          ) : <div />}

          {active < c.topics.length - 1 ? (
            <Button
              onClick={() => {
                setActive(active + 1);
                setSelectedAnswer(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="gap-2"
            >
              Next: {c.topics[active + 1]}
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button asChild className="gap-2">
              <Link to="/learn">
                Complete Course & View Academy
                <CheckCircle2 className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </article>
    </div>
  );
}
