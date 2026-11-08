/**
 * Native Android Hardware & Haptics Bridge Helper
 * Safely invokes MarketMasterNative interfaces when running inside Android WebView container.
 */

export interface MarketMasterNativeBridge {
  showToast(message: string): void;
  getAppVersion(): string;
  isNativeApp(): boolean;
  isOffline(): boolean;
  vibrateFill(): void;
  vibrateStopLoss(): void;
  vibrateBreathingPulse(): void;
}

declare global {
  interface Window {
    MarketMasterNative?: MarketMasterNativeBridge;
  }
}

export const nativeBridge = {
  isAvailable(): boolean {
    return typeof window !== "undefined" && !!window.MarketMasterNative;
  },

  vibrateFill() {
    if (typeof window !== "undefined" && window.MarketMasterNative?.vibrateFill) {
      window.MarketMasterNative.vibrateFill();
    } else if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(40);
    }
  },

  vibrateStopLoss() {
    if (typeof window !== "undefined" && window.MarketMasterNative?.vibrateStopLoss) {
      window.MarketMasterNative.vibrateStopLoss();
    } else if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([150, 80, 220]);
    }
  },

  vibrateBreathingPulse() {
    if (typeof window !== "undefined" && window.MarketMasterNative?.vibrateBreathingPulse) {
      window.MarketMasterNative.vibrateBreathingPulse();
    } else if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([80, 150, 80]);
    }
  },

  showToast(message: string) {
    if (typeof window !== "undefined" && window.MarketMasterNative?.showToast) {
      window.MarketMasterNative.showToast(message);
    }
  },
};
