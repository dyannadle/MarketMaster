// Milestone 16: Persistent Web Notification Dispatcher Engine
// PIP Part 3.4 & Rule 4.3 Notification Pipeline

import { useState, useEffect, useCallback } from "react";

export type NotificationType =
  | "ORDER_FILL"
  | "RISK_ALERT"
  | "TOURNAMENT"
  | "SM2_DUE"
  | "PRICE_ALERT"
  | "SYSTEM";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string; // ISO 8601 string
  read: boolean;
  meta?: Record<string, unknown> | undefined;
}

const STORAGE_KEY = "mm_notifications_v1";
const EVENT_NAME = "mm-notification-update";

const INITIAL_SEEDS: NotificationItem[] = [
  {
    id: "notif-seed-1",
    type: "ORDER_FILL",
    title: "Level-3 FIFO Queue Filled",
    message: "BUY 10 RELIANCE @ ₹2,945.50 executed after depth volume drained.",
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    read: false,
    meta: { symbol: "RELIANCE", qty: 10, price: 2945.5 },
  },
  {
    id: "notif-seed-2",
    type: "RISK_ALERT",
    title: "Rule 4.3 Capital Guard Active",
    message: "Current daily session risk is ₹3,200 (0.32%), safely within the 1.50% drawdown threshold.",
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    read: false,
    meta: { riskPct: 0.32, maxAllowed: 1.5 },
  },
  {
    id: "notif-seed-3",
    type: "SM2_DUE",
    title: "Spaced Repetition Drills Due",
    message: "5 flashcards are ready for review today: Options Greeks & Wyckoff Phase B.",
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    read: true,
    meta: { dueCount: 5, category: "OPTIONS_GREEKS" },
  },
  {
    id: "notif-seed-4",
    type: "TOURNAMENT",
    title: "Alpha Arena Round Open",
    message: "Weekly institutional competition is live. Calmar ratio ranking applies.",
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    read: true,
    meta: { tournamentId: "weekly-alpha-1" },
  },
];

/** Read notifications from localStorage */
export function getStoredNotifications(): NotificationItem[] {
  if (typeof window === "undefined") return INITIAL_SEEDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEEDS));
      return INITIAL_SEEDS;
    }
    return JSON.parse(raw);
  } catch (_e) {
    return INITIAL_SEEDS;
  }
}

/** Save notifications to localStorage and dispatch event */
function saveNotifications(items: NotificationItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: items }));
  } catch (err) {
    console.error("Failed to persist notification:", err);
  }
}

/** Dispatch a new notification */
export function dispatchNotification(
  params: Omit<NotificationItem, "id" | "timestamp" | "read"> & { id?: string }
): NotificationItem {
  const current = getStoredNotifications();
  const newItem: NotificationItem = {
    id: params.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: params.type,
    title: params.title,
    message: params.message,
    timestamp: new Date().toISOString(),
    read: false,
    meta: params.meta,
  };

  const updated = [newItem, ...current];
  saveNotifications(updated);

  // Trigger browser desktop notification if permission granted and page in background or supported
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(newItem.title, {
        body: newItem.message,
        icon: "/favicon.ico",
        tag: newItem.id,
      });
    } catch (_e) {
      // Notification constructor might be disallowed in some contexts (e.g. mobile Chrome without SW)
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(newItem.title, {
            body: newItem.message,
            icon: "/favicon.ico",
            tag: newItem.id,
          });
        }).catch(() => {});
      }
    }
  }

  return newItem;
}

/** Mark notifications as read */
export function markAsRead(id?: string): void {
  const current = getStoredNotifications();
  const updated = current.map((item) => {
    if (!id || item.id === id) {
      return { ...item, read: true };
    }
    return item;
  });
  saveNotifications(updated);
}

/** Clear all notifications */
export function clearAllNotifications(): void {
  saveNotifications([]);
}

/** Request Web Push and Browser Notification permission */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (_e) {
    return "denied";
  }
}

/** Reactive React hook for notifications */
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const reload = useCallback(() => {
    setNotifications(getStoredNotifications());
  }, []);

  useEffect(() => {
    reload();

    const handleUpdate = () => reload();
    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [reload]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    dispatch: dispatchNotification,
    markRead: markAsRead,
    clearAll: clearAllNotifications,
    requestPermission: requestPushPermission,
  };
}
