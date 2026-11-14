// Milestone 23: Mandatory SEBI Risk Profiling & Leverage Suitability Questionnaire
// NISM-aligned suitability assessment unlocking leverage tiers based on risk appetite and aptitude.

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  evaluateRiskTier,
  getStoredRiskTier,
  saveRiskTier,
  RiskQuestionnaireResponse,
} from "@/lib/sebi-certificate";

export function RiskProfilingQuestionnaire() {
  const [experience, setExperience] = useState<number>(3);
  const [maxDrawdown, setMaxDrawdown] = useState<number>(15);
  const [greeks, setGreeks] = useState<"NONE" | "INTERMEDIATE" | "ADVANCED">("ADVANCED");
  const [objective, setObjective] = useState<"PRESERVATION" | "MODERATE_GROWTH" | "SPECULATIVE">("MODERATE_GROWTH");
  const [stopLossAdherence, setStopLossAdherence] = useState<"ALWAYS" | "OCCASIONALLY" | "NEVER">("ALWAYS");

  const [currentTier, setCurrentTier] = useState(() => getStoredRiskTier());

  const response: RiskQuestionnaireResponse = {
    experienceYears: experience,
    maxTolerableDrawdownPct: maxDrawdown,
    optionsGreeksFamiliarity: greeks,
    capitalObjective: objective,
    adherenceToStopLoss: stopLossAdherence,
  };

  const calculatedTier = evaluateRiskTier(response);

  const handleSaveProfile = () => {
    saveRiskTier(calculatedTier.tier);
    setCurrentTier(calculatedTier.tier);
    toast.success(`Risk Profile Saved! Certified as: ${calculatedTier.tierName}`);
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Award className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground">SEBI NISM Risk Suitability Assessment</h3>
              <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[9px] font-mono font-bold text-primary">
                MANDATORY SUITABILITY
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Determines certified leverage tier and unlocks Derivatives and Multi-Leg Spreads
            </p>
          </div>
        </div>

        <div className="rounded-md bg-muted px-2.5 py-1 text-xs font-mono font-bold text-foreground">
          Active Tier: {currentTier}
        </div>
      </div>

      {/* 5 Questions */}
      <div className="space-y-4 text-xs">
        {/* Q1: Experience */}
        <div className="space-y-1.5">
          <label className="font-semibold text-foreground">1. Capital Markets Trading Experience</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 0, label: "Novice (< 1 Year)" },
              { val: 1, label: "Intermediate (1–3 Years)" },
              { val: 3, label: "Institutional (3+ Years)" },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setExperience(opt.val)}
                className={`rounded-lg border p-2.5 text-center font-medium transition-colors ${
                  experience === opt.val
                    ? "border-primary bg-primary/15 text-primary font-bold shadow-sm"
                    : "border-border bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q2: Max Drawdown */}
        <div className="space-y-1.5">
          <label className="font-semibold text-foreground">2. Maximum Tolerable Portfolio Drawdown Before Liquidating</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 5, label: "Conservative (5% Drawdown)" },
              { val: 15, label: "Moderate (15% Drawdown)" },
              { val: 30, label: "Aggressive (30%+ Drawdown)" },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setMaxDrawdown(opt.val)}
                className={`rounded-lg border p-2.5 text-center font-medium transition-colors ${
                  maxDrawdown === opt.val
                    ? "border-primary bg-primary/15 text-primary font-bold shadow-sm"
                    : "border-border bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q3: Greeks Familiarity */}
        <div className="space-y-1.5">
          <label className="font-semibold text-foreground">3. Understanding of Options Greeks (Delta, Gamma, Theta, Vega) & Tail Risk</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: "NONE", label: "No Knowledge" },
              { val: "INTERMEDIATE", label: "Basic (Delta / Theta)" },
              { val: "ADVANCED", label: "Advanced (Vega / Spreads)" },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setGreeks(opt.val as any)}
                className={`rounded-lg border p-2.5 text-center font-medium transition-colors ${
                  greeks === opt.val
                    ? "border-primary bg-primary/15 text-primary font-bold shadow-sm"
                    : "border-border bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q4: Stop-loss Discipline */}
        <div className="space-y-1.5">
          <label className="font-semibold text-foreground">4. Response to Consecutive Losses & Rule 4.3 Stop-Loss Invariant</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: "ALWAYS", label: "Strict Stop-Loss (Rule 4.3)" },
              { val: "OCCASIONALLY", label: "Discretionary Delay" },
              { val: "NEVER", label: "Averaging Down / Revenge" },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setStopLossAdherence(opt.val as any)}
                className={`rounded-lg border p-2.5 text-center font-medium transition-colors ${
                  stopLossAdherence === opt.val
                    ? "border-primary bg-primary/15 text-primary font-bold shadow-sm"
                    : "border-border bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calculated Risk Tier Outcome Card */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Calculated Suitability Tier
          </span>
          <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-mono font-bold text-primary">
            {calculatedTier.maxLeverage}
          </span>
        </div>

        <div>
          <h4 className="font-bold text-base text-foreground">{calculatedTier.tierName}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unlocked Product Access: {calculatedTier.unlockedProducts.join(" • ")}
          </p>
        </div>

        <Button onClick={handleSaveProfile} className="gap-2 font-bold text-xs">
          <ShieldCheck className="size-4" /> Save & Certify Risk Profile
        </Button>
      </div>
    </div>
  );
}
