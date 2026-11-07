import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { allCourses } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { SignInPrompt } from "./settings";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Admin console — MarketMaster" },
    { name: "description", content: "Manage users, courses and platform activity." },
    { property: "og:title", content: "Admin console — MarketMaster" },
    { property: "og:description", content: "Platform administration." },
    { name: "robots", content: "noindex" },
  ] }),
  component: Admin,
});

const users = [
  { name: "Aarav Sharma", email: "aarav@example.com", role: "user", status: "Active", joined: "2026-10-02" },
  { name: "Meera Kapoor", email: "meera@example.com", role: "user", status: "Active", joined: "2026-10-11" },
  { name: "Rohan Patel", email: "rohan@example.com", role: "moderator", status: "Active", joined: "2026-09-21" },
  { name: "Isha Thakur", email: "isha@example.com", role: "user", status: "Suspended", joined: "2026-08-30" },
];
const signups = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((m, i) => ({ m, v: 120 + i * 70 + (i % 2) * 40 }));

function Admin() {
  const { user, ready } = useAuth();
  const [q, setQ] = useState("");
  if (!ready) return null;
  if (!user) return <SignInPrompt />;
  if (user.role !== "admin")
    return <div className="grid min-h-[70vh] place-items-center p-6 text-center"><div><p className="text-xl font-semibold">Admins only</p><p className="mt-1 text-sm text-muted-foreground">Your account doesn't have admin access.</p></div></div>;

  return (
    <div>
      <PageHeader title="Admin console" sub="Users, content and platform health." />
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 md:p-8">
        {[["Total users", "12,480"], ["Active today", "1,932"], ["Paper orders (24h)", "48,210"], ["Courses", String(allCourses.length)]].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="num mt-1 text-2xl font-semibold">{v}</p></div>
        ))}
      </div>
      <Tabs defaultValue="users" className="px-5 pb-10 md:px-8">
        <TabsList><TabsTrigger value="users">Users</TabsTrigger><TabsTrigger value="content">Content</TabsTrigger><TabsTrigger value="analytics">Analytics</TabsTrigger></TabsList>
        <TabsContent value="users" className="mt-4">
          <Input placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3 max-w-xs" />
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs text-muted-foreground"><tr><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Joined</th><th className="p-3" /></tr></thead>
              <tbody>
                {users.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase())).map((u) => (
                  <tr key={u.email} className="border-t">
                    <td className="p-3"><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></td>
                    <td className="p-3"><Badge variant="secondary">{u.role}</Badge></td>
                    <td className={`p-3 ${u.status === "Active" ? "text-gain" : "text-loss"}`}>{u.status}</td>
                    <td className="num p-3 text-muted-foreground">{u.joined}</td>
                    <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => toast(`Edit ${u.name}`)}>Manage</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="content" className="mt-4">
          <div className="mb-3 flex justify-end"><Button onClick={() => toast("New course editor")}>New course</Button></div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm"><tbody>
              {allCourses.slice(0, 12).map((c) => (
                <tr key={c.id} className="border-t first:border-t-0">
                  <td className="num p-3 text-muted-foreground">{c.code}</td><td className="p-3 font-medium">{c.title}</td><td className="p-3 text-muted-foreground">{c.lessons} lessons</td>
                  <td className="p-3"><Badge>Published</Badge></td><td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={() => toast(`Edit ${c.title}`)}>Edit</Button></td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <div className="rounded-xl border bg-card p-5"><p className="font-medium">New sign-ups</p>
            <div className="mt-4 h-60"><ResponsiveContainer><BarChart data={signups}><XAxis dataKey="m" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} /><Bar dataKey="v" fill="var(--primary)" radius={6} /></BarChart></ResponsiveContainer></div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
