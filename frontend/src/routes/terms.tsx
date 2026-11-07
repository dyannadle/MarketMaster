import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: "Terms of Service — MarketMaster" },
    { name: "description", content: "Terms governing use of MarketMaster Academy." },
    { property: "og:title", content: "Terms of Service — MarketMaster" },
    { property: "og:description", content: "Platform terms." },
  ] }),
  component: () => (
    <LegalPage title="Terms of Service" sections={[
      ["Educational purpose", "MarketMaster is an educational platform. Nothing here is investment advice or a solicitation to trade."],
      ["Paper trading", "All trades are simulated with virtual funds. Simulated results do not guarantee real-world outcomes."],
      ["Accounts", "You are responsible for keeping your credentials secure and for activity under your account."],
      ["Acceptable use", "Do not misuse the service, scrape content, or attempt to disrupt the platform."],
      ["Changes", "We may update these terms; continued use means you accept the updated terms."],
    ]} />
  ),
});
