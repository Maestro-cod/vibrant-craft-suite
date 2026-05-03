import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/lib/auth";
import { adminListUsers, adminSetCredits, adminSetPlan, adminStats } from "@/server/admin.functions";
import { Shield, Users, Activity, Crown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — HyperPost AI" }] }),
  component: AdminPage,
});

type Row = { id: string; email: string | null; full_name: string | null; plan: "free"|"basic"|"pro"|"elite"; credits: number; unlimited: boolean; created_at: string };

function AdminPage() {
  const { profile, loading } = useAuth();
  const nav = useNavigate();
  const [users, setUsers] = useState<Row[]>([]);
  const [stats, setStats] = useState<{ users: number; generations: number; byPlan: Record<string, number> } | null>(null);
  const [q, setQ] = useState("");

  const list = useServerFn(adminListUsers);
  const setCredits = useServerFn(adminSetCredits);
  const setPlan = useServerFn(adminSetPlan);
  const getStats = useServerFn(adminStats);

  useEffect(() => {
    if (loading) return;
    if (!profile || profile.email !== "stefanmaestro25@gmail.com") {
      nav({ to: "/dashboard" });
      return;
    }
    Promise.all([list(), getStats()]).then(([u, s]) => {
      setUsers(u.users as Row[]);
      setStats(s);
    }).catch((e) => toast.error(e?.message ?? "Failed to load"));
  }, [profile, loading]);

  const filtered = users.filter(u =>
    !q.trim() || (u.email?.toLowerCase().includes(q.toLowerCase()) || u.full_name?.toLowerCase().includes(q.toLowerCase()))
  );

  const updateCredits = async (id: string, credits: number) => {
    await setCredits({ data: { userId: id, credits } });
    setUsers(us => us.map(u => u.id === id ? { ...u, credits } : u));
    toast.success("Credits updated");
  };
  const updatePlan = async (id: string, plan: Row["plan"]) => {
    await setPlan({ data: { userId: id, plan } });
    setUsers(us => us.map(u => u.id === id ? { ...u, plan } : u));
    toast.success("Plan updated");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center glow-cyan"><Shield className="size-5 text-background" /></div>
          <div>
            <h1 className="text-3xl font-bold">Admin</h1>
            <p className="text-muted-foreground text-sm">Manage users, credits and plans.</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <GlassCard className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="size-3.5"/>Users</div><div className="text-2xl font-bold mt-1">{stats.users}</div></GlassCard>
            <GlassCard className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="size-3.5"/>Generations</div><div className="text-2xl font-bold mt-1">{stats.generations}</div></GlassCard>
            <GlassCard className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Crown className="size-3.5"/>Pro+Elite</div><div className="text-2xl font-bold mt-1">{(stats.byPlan.pro ?? 0) + (stats.byPlan.elite ?? 0)}</div></GlassCard>
            <GlassCard className="p-4"><div className="text-xs text-muted-foreground">Free</div><div className="text-2xl font-bold mt-1">{stats.byPlan.free ?? 0}</div></GlassCard>
          </div>
        )}

        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or name…"
          className="w-full px-4 py-2.5 rounded-xl glass-strong outline-none focus:ring-2 focus:ring-[oklch(0.85_0.18_220)]" />

        <GlassCard className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Credits</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-t border-white/5">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={u.plan} onChange={(e) => updatePlan(u.id, e.target.value as Row["plan"])}
                      className="px-2 py-1 rounded-md glass-strong">
                      {(["free","basic","pro","elite"] as const).map(p => <option key={p} value={p} className="bg-background">{p}</option>)}
                    </select>
                    {u.unlimited && <span className="ml-2 text-[10px] text-gradient font-bold">∞</span>}
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" defaultValue={u.credits} min={0}
                      onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v) && v !== u.credits) updateCredits(u.id, v); }}
                      className="w-24 px-2 py-1 rounded-md glass-strong" />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No users yet.</div>}
        </GlassCard>
      </div>
    </AppShell>
  );
}
