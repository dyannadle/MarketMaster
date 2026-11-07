import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [
    { title: "Help & Support — MarketMaster" },
    { name: "description", content: "FAQs about paper trading, courses and your account, plus a contact form." },
    { property: "og:title", content: "Help & Support — MarketMaster" },
    { property: "og:description", content: "Answers and support." },
  ] }),
  component: Help,
});

const faqs: [string, string][] = [
  ["Is any real money involved?", "No. All trading uses virtual funds and simulated prices for education."],
  ["How do I reset my paper account?", "Go to Settings → Trading → Reset account, or use the button on Portfolio."],
  ["Are prices live?", "Prices are simulated for practice and are not live exchange data."],
  ["Is this investment advice?", "No. Content is educational only and not a recommendation to buy or sell."],
  ["Do I get a certificate?", "Complete every quiz in a level with 80%+ to earn its certificate."],
];

function Help() {
  return (
    <div>
      <PageHeader title="Help & Support" sub="Frequently asked questions and contact." />
      <div className="grid gap-8 p-5 lg:grid-cols-2 md:p-8">
        <Accordion type="single" collapsible className="rounded-xl border bg-card px-4">
          {faqs.map(([q, a]) => <AccordionItem key={q} value={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>)}
        </Accordion>
        <form onSubmit={(e) => { e.preventDefault(); toast.success("Message sent — we'll reply by email"); (e.target as HTMLFormElement).reset(); }} className="space-y-3 rounded-xl border bg-card p-5">
          <p className="font-semibold">Contact us</p>
          <Input required type="email" placeholder="Your email" />
          <Input required placeholder="Subject" />
          <Textarea required placeholder="How can we help?" rows={5} />
          <Button>Send message</Button>
        </form>
      </div>
    </div>
  );
}
