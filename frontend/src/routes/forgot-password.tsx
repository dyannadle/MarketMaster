import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/AuthLayout";
import { authApi } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [
    { title: "Reset password — MarketMaster" },
    { name: "description", content: "Get a link to reset your MarketMaster password." },
    { property: "og:title", content: "Reset password — MarketMaster" },
    { property: "og:description", content: "Recover access to your account." },
  ] }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try { await authApi.requestPasswordReset(email); setSent(true); } catch (err) { toast.error((err as Error).message); }
  };
  return (
    <AuthLayout title="Forgot password?" sub="We'll email you a reset link." footer={<Link to="/sign-in" className="text-primary">Back to sign in</Link>}>
      {sent ? (
        <div className="rounded-xl border bg-card p-5 text-sm">If an account exists for <b>{email}</b>, a reset link is on its way.</div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="e">Email</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Button className="w-full">Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  );
}
