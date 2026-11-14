import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  CheckCircle2,
  GraduationCap,
  TrendingUp,
  ShieldAlert,
  Trophy,
  CheckCheck,
  Trash2,
  Volume2,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  useNotifications,
  type NotificationType,
  type NotificationItem,
} from "@/lib/notifications";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications & Risk Alerts — MarketMaster" },
      { name: "description", content: "Order fills, queue execution, risk alerts, and spaced repetition drills." },
      { property: "og:title", content: "Notifications — MarketMaster" },
      { property: "og:description", content: "Institutional notification and risk event dispatcher." },
    ],
  }),
  component: NotificationsPage,
});

type FilterType = "ALL" | NotificationType;

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch (_e) {
    return "Recent";
  }
}

function getIconForType(type: NotificationType) {
  switch (type) {
    case "ORDER_FILL":
      return { icon: CheckCircle2, color: "text-gain bg-emerald-500/10" };
    case "RISK_ALERT":
      return { icon: ShieldAlert, color: "text-amber-500 bg-amber-500/10" };
    case "TOURNAMENT":
      return { icon: Trophy, color: "text-purple-400 bg-purple-500/10" };
    case "SM2_DUE":
      return { icon: GraduationCap, color: "text-blue-400 bg-blue-500/10" };
    case "PRICE_ALERT":
      return { icon: TrendingUp, color: "text-cyan-400 bg-cyan-500/10" };
    default:
      return { icon: Bell, color: "text-muted-foreground bg-accent" };
  }
}

function NotificationsPage() {
  const { notifications, unreadCount, markRead, clearAll, requestPermission } = useNotifications();
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  const filtered = notifications.filter((item) => {
    if (filter === "ALL") return true;
    return item.type === filter;
  });

  const handleEnablePush = async () => {
    const res = await requestPermission();
    setPermissionStatus(res);
  };

  return (
    <div className="pb-12">
      <PageHeader
        title="Notifications & Risk Alerts"
        sub={`${unreadCount} unread • Microstructure execution & Rule 4.3 monitoring`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnablePush}
            className="gap-1.5 text-xs font-semibold"
          >
            <Volume2 className="size-3.5" />
            {permissionStatus === "granted" ? "Push Alerts Enabled" : "Enable Web Push"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markRead()}
            disabled={unreadCount === 0}
            className="gap-1.5 text-xs"
          >
            <CheckCheck className="size-3.5" /> Mark all read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearAll()}
            disabled={notifications.length === 0}
            className="gap-1.5 text-xs text-muted-foreground hover:text-loss"
          >
            <Trash2 className="size-3.5" /> Clear
          </Button>
        </div>
      </PageHeader>

      <div className="mx-5 my-6 md:mx-8">
        {/* Category Filters */}
        <div className="mb-4 flex flex-wrap gap-1.5 border-b pb-3">
          {[
            { id: "ALL", label: "All Events" },
            { id: "ORDER_FILL", label: "Fills & Executions" },
            { id: "RISK_ALERT", label: "Risk & RMS (Rule 4.3)" },
            { id: "SM2_DUE", label: "SM-2 Flashcards" },
            { id: "TOURNAMENT", label: "Alpha Arena" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as FilterType)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === tab.id
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.id === "ALL" && unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <Bell className="mx-auto mb-3 size-8 opacity-40" />
            <p className="font-medium">No notifications in this category</p>
            <p className="text-xs">Live order fills and market alerts will appear here in real time.</p>
          </div>
        ) : (
          <ul className="divide-y rounded-xl border bg-card shadow-sm">
            {filtered.map((item: NotificationItem) => {
              const { icon: Icon, color } = getIconForType(item.type);
              return (
                <li
                  key={item.id}
                  onClick={() => !item.read && markRead(item.id)}
                  className={`flex cursor-pointer items-start gap-4 p-4 transition-colors hover:bg-muted/40 ${
                    !item.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg ${color}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!item.read ? "font-bold text-foreground" : "font-medium text-foreground/90"}`}>
                        {item.title}
                      </p>
                      {!item.read && (
                        <span className="inline-block size-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
