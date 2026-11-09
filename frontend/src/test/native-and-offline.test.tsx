import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nativeBridge } from "../lib/native";

describe("Native Bridge & Hardware Haptics Interface Tests", () => {
  const originalMarketMasterNative = window.MarketMasterNative;
  const originalNavigatorVibrate = navigator.vibrate;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalMarketMasterNative) {
      window.MarketMasterNative = originalMarketMasterNative;
    } else {
      delete (window as any).MarketMasterNative;
    }
    Object.defineProperty(navigator, "vibrate", {
      value: originalNavigatorVibrate,
      writable: true,
      configurable: true,
    });
  });

  it("detects when native container is absent and falls back to Web Vibration API", () => {
    delete (window as any).MarketMasterNative;
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    expect(nativeBridge.isAvailable()).toBe(false);

    nativeBridge.vibrateFill();
    expect(vibrateMock).toHaveBeenCalledWith(40);

    nativeBridge.vibrateStopLoss();
    expect(vibrateMock).toHaveBeenCalledWith([150, 80, 220]);

    nativeBridge.vibrateBreathingPulse();
    expect(vibrateMock).toHaveBeenCalledWith([80, 150, 80]);
  });

  it("delegates to MarketMasterNative when running in Android WebView container", () => {
    const nativeMock = {
      vibrateFill: vi.fn(),
      vibrateStopLoss: vi.fn(),
      vibrateBreathingPulse: vi.fn(),
      showToast: vi.fn(),
      getAppVersion: () => "2.0.0",
      isNativeApp: () => true,
      isOffline: () => false,
    };
    (window as any).MarketMasterNative = nativeMock;

    expect(nativeBridge.isAvailable()).toBe(true);

    nativeBridge.vibrateFill();
    expect(nativeMock.vibrateFill).toHaveBeenCalled();

    nativeBridge.vibrateStopLoss();
    expect(nativeMock.vibrateStopLoss).toHaveBeenCalled();

    nativeBridge.vibrateBreathingPulse();
    expect(nativeMock.vibrateBreathingPulse).toHaveBeenCalled();

    nativeBridge.showToast("Test notification");
    expect(nativeMock.showToast).toHaveBeenCalledWith("Test notification");
  });
});
