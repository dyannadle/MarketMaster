import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthLayout } from "@/components/AuthLayout";
import { authApi, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/sign-up")({
  head: () => ({ meta: [
    { title: "Create account — MarketMaster" },
    { name: "description", content: "Create a free MarketMaster account with ₹10 lakh virtual capital." },
    { property: "og:title", content: "Create account — MarketMaster" },
    { property: "og:description", content: "Start learning and paper trading for free." },
  ] }),
  component: SignUp,
});

function SignUp() {
  const { setUser } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!agree) { toast.error("Please accept the terms"); return; }
    setBusy(true);
    try { const u = await authApi.signUp(f.name, f.email, f.password); setUser(u); toast.success("Account created"); nav({ to: "/learn" }); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <AuthLayout title="Create your account" sub="Free forever. ₹10,00,000 virtual capital included." footer={<>Already have an account? <Link to="/sign-in" className="text-primary">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="n">Full name</Label><Input id="n" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="e">Email</Label><Input id="e" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="p">Password</Label><Input id="p" type="password" required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><p className="text-xs text-muted-foreground">At least 8 characters.</p></div>
        <label className="flex items-start gap-2 text-sm text-muted-foreground"><Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />I agree to the <Link to="/terms" className="text-primary">Terms</Link> and <Link to="/privacy" className="text-primary">Privacy Policy</Link></label>
        <Button className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
      </form>
    </AuthLayout>
  );
}
