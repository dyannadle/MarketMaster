import { PageHeader } from "@/components/AppShell";

export function LegalPage({ title, sections }: { title: string; sections: [string, string][] }) {
  return (
    <div>
      <PageHeader title={title} sub="Last updated November 2026" />
      <article className="max-w-3xl space-y-6 p-5 md:p-8">
        {sections.map(([h, p]) => (
          <section key={h}><h2 className="text-lg font-semibold">{h}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p}</p></section>
        ))}
      </article>
    </div>
  );
}
