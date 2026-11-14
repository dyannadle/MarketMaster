// Milestone 19: Institutional Floor Audio Market Squawk Box
// Zero-latency browser-native speech synthesis for volatility breakouts, queue fills, and Rule 4.3 risk alerts.

import { useState, useEffect, useCallback } from "react";

export interface SquawkConfig {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
  rate: number; // 0.8 to 1.4 (fast trading cadence)
  pitch: number; // 0.8 to 1.2
}

const STORAGE_KEY = "mm_squawk_config_v1";

const DEFAULT_CONFIG: SquawkConfig = {
  enabled: true,
  volume: 0.9,
  rate: 1.15, // Fast institutional floor cadence
  pitch: 1.0,
};

export function getSquawkConfig(): SquawkConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch (_e) {
    return DEFAULT_CONFIG;
  }
}

export function saveSquawkConfig(config: SquawkConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("mm-squawk-config-change", { detail: config }));
  } catch (err) {
    console.error("Failed to save squawk config:", err);
  }
}

/**
 * Institutional Floor Voice Synthesis Engine
 */
export function playSquawk(
  text: string,
  priority: "NORMAL" | "HIGH" | "URGENT" = "NORMAL"
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const config = getSquawkConfig();
  if (!config.enabled) return;

  try {
    const synth = window.speechSynthesis;

    // For urgent alerts, cancel ongoing speech immediately
    if (priority === "URGENT") {
      synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = config.volume;
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;

    // Try finding professional English voices
    const voices = synth.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.startsWith("en-IN") ||
        v.lang.startsWith("en-GB") ||
        v.lang.startsWith("en-US")
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    synth.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis playback ignored:", err);
  }
}

/**
 * Pre-formatted Institutional Squawk Callouts
 */
export const squawkBox = {
  orderFilled: (side: string, qty: number, symbol: string, price: number) => {
    playSquawk(`Order filled. ${side} ${qty} ${symbol} at ₹${price.toFixed(2)}.`);
  },

  fifoQueueFilled: (side: string, qty: number, symbol: string, price: number) => {
    playSquawk(`Level-3 Queue Drained. ${side} ${qty} ${symbol} filled at ₹${price.toFixed(2)}.`);
  },

  riskLimitWarning: (drawdownPct: number) => {
    playSquawk(
      `Warning! Rule 4.3 Capital Guard triggered. Current drawdown is ${drawdownPct.toFixed(2)} percent. Risk limits active.`,
      "URGENT"
    );
  },

  volatilitySurge: (symbol: string, changePct: number) => {
    const dir = changePct >= 0 ? "up" : "down";
    playSquawk(`Market breakout on ${symbol}. Volatility spike ${dir} ${Math.abs(changePct).toFixed(1)} percent.`);
  },

  newsHeadline: (headline: string) => {
    playSquawk(`Market wire bulletin: ${headline}`);
  },
};

/**
 * Reactive React hook for Squawk Box control
 */
export function useSquawk() {
  const [config, setConfig] = useState<SquawkConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    setConfig(getSquawkConfig());

    const handleChange = () => setConfig(getSquawkConfig());
    window.addEventListener("mm-squawk-config-change", handleChange);
    window.addEventListener("storage", handleChange);

    return () => {
      window.removeEventListener("mm-squawk-config-change", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const toggleEnabled = useCallback(() => {
    const updated = { ...config, enabled: !config.enabled };
    setConfig(updated);
    saveSquawkConfig(updated);
  }, [config]);

  const updateVolume = useCallback((volume: number) => {
    const updated = { ...config, volume: Math.max(0, Math.min(1, volume)) };
    setConfig(updated);
    saveSquawkConfig(updated);
  }, [config]);

  const testSquawk = useCallback(() => {
    playSquawk("MarketMaster Institutional Floor Squawk active. All systems operational.");
  }, []);

  return {
    config,
    isEnabled: config.enabled,
    toggleEnabled,
    updateVolume,
    testSquawk,
    squawk: playSquawk,
  };
}
