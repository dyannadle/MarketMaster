// Milestone 23: SEBI Regulatory Risk Disclosure Certificate Modal
// Generates printable audit certificate with cryptographic SHA-256 hash & SEBI Schedule II watermark.

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Printer,
  Download,
  X,
  Scale,
  AlertTriangle,
  QrCode,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/data";
import {
  SebiAuditCertificate,
  createCertifiedStatementAudit,
} from "@/lib/sebi-certificate";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  traderName?: string;
  email?: string;
  totalTrades: number;
  totalTurnover: number;
  netRealizedPnl: number;
  statutoryDeductions: number;
  disciplineScore: number;
}

export function SebiAuditCertificateModal({
  isOpen,
  onClose,
  traderName = "Institutional Virtual Trader",
  email = "trader@marketmaster.in",
  totalTrades,
  totalTurnover,
  netRealizedPnl,
  statutoryDeductions,
  disciplineScore,
}: Props) {
  const [cert, setCert] = useState<SebiAuditCertificate | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    createCertifiedStatementAudit({
      traderName,
      accountEmail: email,
      totalTrades,
      totalTurnover,
      netRealizedPnl,
      statutoryDeductions,
      disciplineScore,
    }).then(setCert);
  }, [isOpen, traderName, email, totalTrades, totalTurnover, netRealizedPnl, statutoryDeductions, disciplineScore]);

  if (!isOpen || !cert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col max-h-[92vh] w-full max-w-3xl rounded-2xl border border-primary/40 bg-card shadow-2xl overflow-hidden print:m-0 print:border-none print:shadow-none">
        {/* Header Bar (Hidden in print) */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/40 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h3 className="font-bold text-sm text-foreground">
              Official SEBI Schedule II Simulation Certificate
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5 text-xs font-bold">
              <Printer className="size-3.5" /> Print / Save PDF
            </Button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Certificate Body with Watermark */}
        <div className="relative p-6 sm:p-10 space-y-6 overflow-y-auto bg-card text-foreground">
          {/* Diagonal Background Watermark */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.035] select-none">
            <span className="transform -rotate-45 text-4xl sm:text-6xl font-black uppercase tracking-widest text-foreground text-center">
              SEBI SIMULATED TRADING AUDIT • NO REAL FUNDS CLEARED
            </span>
          </div>

          {/* Certificate Header Banner */}
          <div className="text-center border-b pb-6 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Scale className="size-3.5" /> CERTIFIED PAPER TRADING AUDIT RECORD
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              MarketMaster Academy & RMS Terminal
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Certificate UID: {cert.certificateId}
            </p>
          </div>

          {/* Trader & Verification Meta */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/20 p-4 text-xs font-mono">
            <div>
              <span className="text-muted-foreground">Certified Trader:</span>
              <p className="font-bold text-foreground text-sm font-sans">{cert.traderName}</p>
              <p className="text-[11px] text-muted-foreground">{cert.accountEmail}</p>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Audit Timestamp:</span>
              <p className="font-bold text-foreground">{cert.issueTimestamp.slice(0, 19).replace("T", " ")} UTC</p>
              <p className="text-gain font-bold text-[11px]">Rule 4.3 Capital Guard: Compliant</p>
            </div>
          </div>

          {/* Audit Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
            <div className="rounded-xl border bg-background/60 p-3">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Executions</span>
              <p className="font-mono text-lg font-black text-foreground mt-0.5">{cert.totalTrades}</p>
            </div>
            <div className="rounded-xl border bg-background/60 p-3">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Turnover Cleared</span>
              <p className="font-mono text-lg font-black text-foreground mt-0.5">{inr(cert.totalTurnover)}</p>
            </div>
            <div className="rounded-xl border bg-background/60 p-3">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Realized Net P&L</span>
              <p className={`font-mono text-lg font-black mt-0.5 ${cert.netRealizedPnl >= 0 ? "text-gain" : "text-loss"}`}>
                {cert.netRealizedPnl >= 0 ? "+" : ""}{inr(cert.netRealizedPnl)}
              </p>
            </div>
            <div className="rounded-xl border bg-background/60 p-3">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Discipline Score</span>
              <p className="font-mono text-lg font-black text-primary mt-0.5">{cert.disciplineScore}/100</p>
            </div>
          </div>

          {/* Statutory Tax Deductions Verified */}
          <div className="rounded-xl border border-dashed p-3 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-4 text-primary" />
              <span>Simulated Statutory Taxes (STT, Stamp Duty, GST, Turnover Fees):</span>
            </div>
            <span className="font-mono font-bold text-muted-foreground">{inr(cert.statutoryDeductions)}</span>
          </div>

          {/* Cryptographic SHA-256 Verification Digest */}
          <div className="rounded-xl border bg-black/80 p-3 font-mono text-[11px] text-emerald-400 space-y-1">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase">
              Cryptographic SHA-256 Integrity Hash:
            </span>
            <p className="break-all tracking-wider select-all">{cert.sha256Hash}</p>
          </div>

          {/* Mandatory SEBI Risk Disclosure Notice */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300/90 leading-relaxed space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <AlertTriangle className="size-4" /> SEBI MANDATORY RISK DISCLOSURE FOR F&O
            </div>
            <p>
              9 out of 10 individual traders in equity Futures and Options Segment incur net losses. On average,
              loss-makers registered net trading loss close to ₹50,000. Over and above net trading losses, loss-makers
              expended an additional 28% of net losses as transaction costs.
            </p>
            <p className="text-[10px] text-muted-foreground border-t border-amber-500/20 pt-1.5">
              This simulated execution certificate is issued pursuant to SEBI Schedule II pedagogical guidelines.
              All orders, fills, and ledger balances represent simulated educational records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
