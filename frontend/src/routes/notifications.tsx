import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, CheckCircle2, GraduationCap, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [
    { title: "Notifications — MarketMaster" },
    { name: "description", content: "Order fills, price alerts and learning updates." },
    { property: "og:title", content: "Notifications — MarketMaster" },
    { property: "og:description", content: "Your latest activity." },
  ] }),
  component: Notifications,
});

const initial = [
  { id: 1, icon: CheckCircle2, t: "Order filled", d: "BUY 10 RELIANCE @ 2,945.50", time: "2m ago", unread: true },
  { id: 2, icon: TrendingUp, t: "Price alert", d: "NIFTY 50 crossed 24,400", time: "1h ago", unread: true },
  { id: 3, icon: GraduationCap, t: "Course unlocked", d: "Options Pricing & Greeks is now available", time: "Yesterday", unread: false },
  { id: 4, icon: Bell, t: "Challenge progress", d: "Risk Discipline — 35% complete", time: "2d ago", unread: false },
];

function Notifications() {
  const [items, setItems] = useState(initial);
  return (
    <div>
      <PageHeader title="Notifications" sub={`${items.filter((i) => i.unread).length} unread`}>
        <Button variant="outline" onClick={() => setItems(items.map((i) => ({ ...i, unread: false })))}>Mark all read</Button>
      </PageHeader>
      <ul className="mx-5 my-6 divide-y rounded-xl border bg-card md:mx-8">
        {items.map((n) => (
          <li key={n.id} className="flex gap-4 p-4">
            <n.icon className={`mt-0.5 size-5 ${n.unread ? "text-primary" : "text-muted-foreground"}`} />
            <div className="flex-1"><p className="font-medium">{n.t}</p><p className="text-sm text-muted-foreground">{n.d}</p></div>
            <span className="text-xs text-muted-foreground">{n.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
