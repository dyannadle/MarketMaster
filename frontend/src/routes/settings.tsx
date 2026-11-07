import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useAccount } from "@/lib/paper";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Settings — MarketMaster" },
    { name: "description", content: "Manage your profile, security, notifications and trading preferences." },
    { property: "og:title", content: "Settings — MarketMaster" },
    { property: "og:description", content: "Account and app preferences." },
  ] }),
  component: Settings,
});

function Settings() {
  const { user, ready, setUser } = useAuth();
  const { reset } = useAccount();
  const [p, setP] = useState({ name: "", phone: "", bio: "" });
  useEffect(() => { if (user) setP({ name: user.name, phone: user.phone ?? "", bio: user.bio ?? "" }); }, [user]);

  if (!ready) return null;
  if (!user) return <SignInPrompt />;

  return (
    <div>
      <PageHeader title="Settings" sub="Manage your account and preferences." />
      <Tabs defaultValue="profile" className="p-5 md:p-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="trading">Trading</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6 max-w-xl space-y-4">
          <Field label="Full name"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Email"><Input value={user?.email ?? ""} disabled /></Field>
          <Field label="Phone"><Input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} placeholder="+91" /></Field>
          <Field label="Bio"><Textarea value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} /></Field>
          <Button onClick={() => { if (user) { setUser({ ...user, ...p }); toast.success("Profile saved"); } }}>Save changes</Button>
        </TabsContent>
        <TabsContent value="security" className="mt-6 max-w-xl space-y-4">
          <Field label="Current password"><Input type="password" /></Field>
          <Field label="New password"><Input type="password" /></Field>
          <Button onClick={() => toast.success("Password updated")}>Update password</Button>
          <Row title="Two-factor authentication" desc="Require a code at sign-in." />
        </TabsContent>
        <TabsContent value="notifications" className="mt-6 max-w-xl space-y-3">
          <Row title="Order fills" desc="Notify when a paper order is filled." on />
          <Row title="Price alerts" desc="Notify when watchlist targets hit." on />
          <Row title="Learning reminders" desc="Daily nudge to continue a course." />
          <Row title="Newsletter" desc="Weekly market concepts digest." />
        </TabsContent>
        <TabsContent value="trading" className="mt-6 max-w-xl space-y-3">
          <Row title="Confirm before placing orders" desc="Show a confirmation dialog." on />
          <Row title="Simulate slippage & brokerage" desc="Make fills more realistic." on />
          <div className="rounded-xl border border-destructive/40 bg-card p-4">
            <p className="font-medium">Reset paper account</p>
            <p className="text-sm text-muted-foreground">Clears positions and orders; restores ₹10,00,000.</p>
            <Button variant="destructive" className="mt-3" onClick={() => { reset(); toast.success("Paper account reset"); }}>Reset account</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
function Row({ title, desc, on = false }: { title: string; desc: string; on?: boolean }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4"><div><p className="font-medium">{title}</p><p className="text-sm text-muted-foreground">{desc}</p></div><Switch defaultChecked={on} /></div>;
}
export function SignInPrompt() {
  return (
    <div className="grid min-h-[70vh] place-items-center p-6 text-center">
      <div><p className="text-xl font-semibold">Sign in required</p><p className="mt-1 text-sm text-muted-foreground">Please sign in to view this page.</p>
        <Button asChild className="mt-4"><Link to="/sign-in">Sign in</Link></Button></div>
    </div>
  );
}
