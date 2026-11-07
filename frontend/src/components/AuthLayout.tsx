import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { TrendingUp } from "lucide-react";

export function AuthLayout({ title, sub, children, footer }: { title: string; sub: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden border-r bg-hero p-12 lg:flex lg:flex-col">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
        <Link to="/" className="relative flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><TrendingUp className="size-5" /></span>
          <span className="text-lg font-bold">MarketMaster<span className="text-primary">.</span></span>
        </Link>
        <div className="relative mt-auto max-w-md">
          <p className="text-4xl font-bold leading-tight">Learn every market. <span className="text-primary">Risk nothing.</span></p>
          <p className="mt-4 text-muted-foreground">38 courses, a realistic paper trading terminal and a strategy lab — all in one place.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
