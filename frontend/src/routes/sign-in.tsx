import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/AuthLayout";
import { authApi, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [
    { title: "Sign in — MarketMaster" },
    { name: "description", content: "Sign in to your MarketMaster learning and paper trading account." },
    { property: "og:title", content: "Sign in — MarketMaster" },
    { property: "og:description", content: "Access your courses and paper trading account." },
  ] }),
  component: SignIn,
});

function SignIn() {
  const { setUser } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const u = await authApi.signIn(email, password); setUser(u); toast.success(`Welcome back, ${u.name}`); nav({ to: "/" }); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <AuthLayout title="Welcome back" sub="Sign in to continue learning and trading." footer={<>New here? <Link to="/sign-up" className="text-primary">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
        <div className="space-y-2">
          <div className="flex justify-between"><Label htmlFor="pw">Password</Label><Link to="/forgot-password" className="text-xs text-primary">Forgot password?</Link></div>
          <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
    </AuthLayout>
  );
}
