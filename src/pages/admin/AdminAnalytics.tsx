import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart2, Globe, Monitor, MousePointer, Users, TrendingUp,
  Smartphone, Layout, ArrowRight, Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/* ─── types ─────────────────────────────────────────────── */
interface PageView {
  path: string;
  source: string | null;
  referrer: string | null;
  device: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

interface Row { label: string; count: number }

/* ─── helpers ────────────────────────────────────────────── */
const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brasil", US: "EUA", PT: "Portugal", AR: "Argentina",
  MX: "México", CO: "Colômbia", ES: "Espanha", DE: "Alemanha",
  FR: "França", GB: "Reino Unido",
};

const PAGE_LABELS: Record<string, string> = {
  "/": "Bulário (Home)",
  "/sobre": "Sobre",
  "/planos": "Planos",
  "/register": "Cadastro",
  "/login": "Login",
  "/dashboard": "Dashboard",
};

function label(path: string) {
  return PAGE_LABELS[path] ?? path;
}

function aggregate(rows: PageView[], key: keyof PageView, top = 10): Row[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = String(r[key] ?? "Desconhecido");
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([l, count]) => ({ label: l, count }));
}

function dailyTrend(rows: PageView[], days: number): { date: string; count: number }[] {
  const map = new Map<string, number>();
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400_000).toISOString().slice(0, 10);
    map.set(d, 0);
  }
  for (const r of rows) {
    const d = r.created_at.slice(0, 10);
    if (map.has(d)) map.set(d, (map.get(d) ?? 0) + 1);
  }
  return [...map.entries()].map(([date, count]) => ({ date, count }));
}

/* ─── sub-components ──────────────────────────────────────── */
function KpiCard({ icon: Icon, label: lbl, value, sub, color = "text-primary" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{lbl}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function BarList({ title, icon: Icon, rows, max, mapLabel }: {
  title: string; icon: React.ElementType; rows: Row[]; max: number;
  mapLabel?: (l: string) => string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="w-4 h-4 text-primary" />
        {title}
        <span className="ml-auto text-xs text-muted-foreground font-normal">visitas</span>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-xs text-muted-foreground">Sem dados</p>}
        {rows.map((r) => (
          <div key={r.label} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="truncate max-w-[70%]">{mapLabel ? mapLabel(r.label) : r.label}</span>
              <span className="font-medium">{r.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((r.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ data, days }: { data: { date: string; count: number }[]; days: number }) {
  const peak = Math.max(...data.map((d) => d.count), 1);
  const show = days <= 14 ? data : data.filter((_, i) => i % Math.ceil(days / 14) === 0 || i === data.length - 1);

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <TrendingUp className="w-4 h-4 text-primary" />
        Visitas por dia
      </div>
      <div className="flex items-end gap-1 h-28">
        {data.map((d) => {
          const pct = Math.max((d.count / peak) * 100, d.count > 0 ? 4 : 0);
          const shown = show.find((s) => s.date === d.date);
          return (
            <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div className="w-full flex flex-col justify-end" style={{ height: "88px" }}>
                <div
                  className="w-full rounded-sm bg-primary/70 hover:bg-primary transition-colors"
                  style={{ height: `${pct}%` }}
                  title={`${d.date}: ${d.count} visitas`}
                />
              </div>
              {shown && (
                <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                  {d.date.slice(5)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FunnelSection({ rows }: { rows: PageView[] }) {
  const FUNNEL = [
    { path: "/", label: "Bulário (Home)" },
    { path: "/register", label: "Cadastro" },
    { path: "/dashboard", label: "Dashboard" },
    { path: "/dashboard/meu-plano", label: "Meu Plano" },
  ];
  const counts = FUNNEL.map((f) => ({
    ...f,
    count: rows.filter((r) => r.path === f.path || r.path.startsWith(f.path + "/")).length,
  }));
  const top = counts[0]?.count ?? 1;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ArrowRight className="w-4 h-4 text-primary" />
        Funil de Conversão
      </div>
      <div className="space-y-2">
        {counts.map((f, i) => (
          <div key={f.path} className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}</span>
            <div className="flex-1 space-y-0.5">
              <div className="flex justify-between text-xs">
                <span>{f.label}</span>
                <span className="font-medium">{f.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.round((f.count / top) * 100)}%` }} />
              </div>
              {i > 0 && counts[i - 1].count > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {Math.round((f.count / counts[i - 1].count) * 100)}% do passo anterior
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserTable({ rows }: { rows: PageView[] }) {
  const users = useMemo(() => {
    const map = new Map<string, { email: string; count: number; lastSeen: string; device: string }>();
    for (const r of rows) {
      if (!r.user_email) continue;
      const prev = map.get(r.user_email);
      const last = !prev || r.created_at > prev.lastSeen ? r.created_at : prev.lastSeen;
      map.set(r.user_email, {
        email: r.user_email,
        count: (prev?.count ?? 0) + 1,
        lastSeen: last,
        device: prev?.device ?? r.device ?? "?",
      });
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 20);
  }, [rows]);

  if (users.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Users className="w-4 h-4 text-primary" />
        Usuários Identificados
        <Badge variant="outline" className="ml-auto text-xs">{users.length} encontrados</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="text-left py-1.5 font-medium">Email</th>
              <th className="text-right py-1.5 font-medium">Visitas</th>
              <th className="text-right py-1.5 font-medium">Device</th>
              <th className="text-right py-1.5 font-medium">Último acesso</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email} className="border-b last:border-0 hover:bg-muted/40">
                <td className="py-1.5 truncate max-w-[180px]">{u.email}</td>
                <td className="text-right py-1.5 font-medium">{u.count}</td>
                <td className="text-right py-1.5">{u.device}</td>
                <td className="text-right py-1.5 text-muted-foreground">
                  {new Date(u.lastSeen).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────── */
const PRESETS = [
  { label: "Hoje", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

export default function AdminAnalytics() {
  const [rows, setRows] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      const { data } = await supabase
        .from("page_views" as any)
        .select("path,source,referrer,device,country,city,region,user_id,user_email,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      setRows((data as PageView[] | null) ?? []);
      setLoading(false);
    }
    load();
  }, [days]);

  const mobile = rows.filter((r) => r.device === "mobile").length;
  const desktop = rows.filter((r) => r.device === "desktop").length;
  const mobilePct = rows.length ? Math.round((mobile / rows.length) * 100) : 0;
  const uniqueUsers = new Set(rows.filter((r) => r.user_id).map((r) => r.user_id)).size;
  const topPage = aggregate(rows, "path")[0];

  const pages = aggregate(rows, "path").map((r) => ({ ...r, label: label(r.label) }));
  const sources = aggregate(rows, "source");
  const countries = aggregate(rows, "country").map((r) => ({
    ...r, label: COUNTRY_NAMES[r.label] ? `${r.label} · ${COUNTRY_NAMES[r.label]}` : r.label,
  }));
  const cities = aggregate(rows, "city");
  const trend = dailyTrend(rows, days === 1 ? 1 : days);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Visitas ao SystemHub · dados reais</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setDays(p.days)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                days === p.days ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm animate-pulse">
          Carregando métricas...
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
          <BarChart2 className="h-8 w-8 opacity-30" />
          <p>Nenhum dado no período selecionado.</p>
          <p className="text-xs">As métricas aparecerão conforme usuários visitarem o site.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={BarChart2} label="Total de visitas" value={rows.length} sub={`últimos ${days === 1 ? "24h" : `${days} dias`}`} />
            <KpiCard icon={Users} label="Usuários autenticados" value={uniqueUsers} sub="sessões com login" color="text-violet-500" />
            <KpiCard icon={Smartphone} label="Mobile / Desktop" value={`${mobilePct}% / ${100 - mobilePct}%`} sub={`${mobile} mob · ${desktop} desk`} color="text-amber-500" />
            <KpiCard icon={Layout} label="Página mais visitada" value={topPage ? label(topPage.label) : "—"} sub={topPage ? `${topPage.count} visitas` : ""} color="text-emerald-500" />
          </div>

          {/* Daily trend */}
          {days > 1 && <TrendChart data={trend} days={days} />}

          {/* Funnel */}
          <FunnelSection rows={rows} />

          {/* 2-col grids */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BarList title="Páginas" icon={Layout} rows={pages} max={pages[0]?.count ?? 1} />
            <BarList title="Fontes de tráfego" icon={MousePointer} rows={sources} max={sources[0]?.count ?? 1} />
            <BarList title="Países" icon={Globe} rows={countries} max={countries[0]?.count ?? 1} />
            <BarList title="Cidades" icon={Clock} rows={cities} max={cities[0]?.count ?? 1} />
          </div>

          {/* Device split visual */}
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Monitor className="w-4 h-4 text-primary" />
              Device split
            </div>
            <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
              <div className="bg-primary h-full transition-all" style={{ width: `${mobilePct}%` }} title={`Mobile: ${mobilePct}%`} />
              <div className="bg-muted h-full flex-1" title={`Desktop: ${100 - mobilePct}%`} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>📱 Mobile {mobilePct}% ({mobile})</span>
              <span>🖥 Desktop {100 - mobilePct}% ({desktop})</span>
            </div>
          </div>

          {/* User table */}
          <UserTable rows={rows} />
        </>
      )}
    </div>
  );
}
