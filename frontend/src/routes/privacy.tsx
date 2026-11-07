import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy Policy — MarketMaster" },
    { name: "description", content: "How MarketMaster collects and uses your data." },
    { property: "og:title", content: "Privacy Policy — MarketMaster" },
    { property: "og:description", content: "Our privacy practices." },
  ] }),
  component: () => (
    <LegalPage title="Privacy Policy" sections={[
      ["Data we collect", "Account details (name, email), learning progress and paper trading activity."],
      ["How we use it", "To provide courses, track progress, run the simulator and improve the platform."],
      ["Sharing", "We do not sell personal data. Service providers process data only on our behalf."],
      ["Your rights", "You can access, correct or delete your data from Settings or by contacting support."],
      ["Security", "We use industry-standard safeguards to protect your information."],
    ]} />
  ),
});
