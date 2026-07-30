import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart2, Globe, Monitor, MousePointer, Users, TrendingUp,
  Smartphone, Layout, ArrowRight, Clock, Filter, RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ─── types ─────────────────────────────────────────────── */
interface PageView {
  path: string;
  source: string | null;
  referrer: string | null;
  device: string | null;
  country: string | null;
  city: string | null;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

interface Row { label: string; count: number }

/* ─── constants ──────────────────────────────────────────── */
const DASHBOARD_FEATURES: Record<string, string> = {
  "/dashboard":                  "Home",
  "/dashboard/agenda":           "Agenda",
  "/dashboard/clientes":         "Clientes",
  "/dashboard/animais":          "Animais",
  "/dashboard/pacientes":        "Pacientes",
  "/dashboard/estoque":          "Estoque",
  "/dashboard/servicos":         "Serviços",
  "/dashboard/caixa":            "Caixa",
  "/dashboard/bulario":          "Bulário",
  "/dashboard/documentos":       "Documentos",
  "/dashboard/internacao":       "Internação",
  "/dashboard/lembretes":        "Lembretes",
  "/dashboard/financeiro":       "Financeiro",
  "/dashboard/relatorios":       "Relatórios",
  "/dashboard/configuracoes":    "Configurações",
  "/dashboard/funcionarios":     "Funcionários",
  "/dashboard/fornecedores":     "Fornecedores",
  "/dashboard/contas":           "Contas a pagar",
  "/dashboard/lixeira":          "Lixeira",
  "/dashboard/meu-plano":        "Meu Plano",
};

const PUBLIC_LABELS: Record<string, string> = {
  "/":              "Bulário (Home)",
  "/sobre":         "Sobre",
  "/planos":        "Planos",
  "/register":      "Cadastro",
  "/login":         "Login",
  "/privacidade":   "Privacidade",
};

const CTA_LABELS: Record<string, string> = {
  "/_cta/hero-register":        "Hero → Cadastro",
  "/_cta/hero-login":           "Hero → Login",
  "/_cta/sticky-register":      "Sticky → Cadastro",
  "/_cta/features-register":    "Features → Cadastro",
  "/_cta/sobre-hero-register":  "Sobre hero → Cadastro",
  "/_cta/sobre-cta-register":   "Sobre CTA → Cadastro",
  "/_cta/planos-card-register": "Planos card → Cadastro",
  "/_cta/planos-cta-register":  "Planos CTA → Cadastro",
};

const PERIODS = [
  { label: "Hoje", days: 1 },
  { label: "7d",   days: 7 },
  { label: "30d",  days: 30 },
  { label: "90d",  days: 90 },
  { label: "Tudo", days: 0 },
];

/* ─── helpers ────────────────────────────────────────────── */
function aggregate(rows: PageView[], key: keyof PageView, top = 12): Row[] {
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
  const d = days > 0 ? days : 90;
  const map = new Map<string, number>();
  const now = Date.now();
  for (let i = d - 1; i >= 0; i--) {
    const dt = new Date(now - i * 86400_000).toISOString().slice(0, 10);
    map.set(dt, 0);
  }
  for (const r of rows) {
    const dt = r.created_at.slice(0, 10);
    if (map.has(dt)) map.set(dt, (map.get(dt) ?? 0) + 1);
  }
  return [...map.entries()].map(([date, count]) => ({ date, count }));
}

function featureUsage(rows: PageView[]): Row[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const base = r.path.split("?")[0];
    // match exact or with trailing segment (pet profile, paciente/:id, etc.)
    const key = Object.keys(DASHBOARD_FEATURES).find((k) =>
      base === k || base.startsWith(k + "/")
    );
    if (key) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([path, count]) => ({ label: DASHBOARD_FEATURES[path], count }));
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
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{lbl}</p>
        <p className="text-2xl font-bold leading-tight truncate">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function BarList({ title, icon: Icon, rows, max, color = "bg-primary" }: {
  title: string; icon: React.ElementType; rows: Row[]; max: number; color?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="w-4 h-4 text-primary" />
        {title}
        <span className="ml-auto text-xs text-muted-foreground font-normal">acessos</span>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-xs text-muted-foreground">Sem dados</p>}
        {rows.map((r, i) => (
          <div key={r.label + i} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="truncate max-w-[75%]">{r.label}</span>
              <span className="font-medium shrink-0 ml-2">{r.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.round((r.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: { date: string; count: number }[] }) {
  const peak = Math.max(...data.map((d) => d.count), 1);
  const show = data.length <= 14 ? data : data.filter((_, i) => i % Math.ceil(data.length / 14) === 0 || i === data.length - 1);
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <TrendingUp className="w-4 h-4 text-primary" />
        Visitas por dia
      </div>
      <div className="flex items-end gap-1 h-28">
        {data.map((d) => {
          const pct = Math.max((d.count / peak) * 100, d.count > 0 ? 3 : 0);
          const shown = show.find((s) => s.date === d.date);
          return (
            <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div className="w-full flex flex-col justify-end" style={{ height: "88px" }}>
                <div className="w-full rounded-sm bg-primary/70 hover:bg-primary transition-colors"
                  style={{ height: `${pct}%` }} title={`${d.date}: ${d.count}`} />
              </div>
              {shown && <span className="text-[9px] text-muted-foreground truncate w-full text-center">{d.date.slice(5)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FunnelSection({ rows }: { rows: PageView[] }) {
  const FUNNEL = [
    { path: "/",          label: "Bulário (Home)" },
    { path: "/register",  label: "Cadastro" },
    { path: "/dashboard", label: "Entrou no sistema" },
    { path: "/dashboard/meu-plano", label: "Visitou Meu Plano" },
  ];
  const counts = FUNNEL.map((f) => ({
    ...f,
    count: rows.filter((r) => r.path === f.path || r.path.startsWith(f.path + "/")).length,
  }));
  const top = counts[0]?.count ?? 1;
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ArrowRight className="w-4 h-4 text-emerald-500" />
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

function UserTable({ rows, onSelectUser }: { rows: PageView[]; onSelectUser: (email: string) => void }) {
  const users = useMemo(() => {
    const map = new Map<string, {
      email: string; total: number; dashboard: number;
      lastSeen: string; device: string; topFeature: string;
    }>();
    for (const r of rows) {
      if (!r.user_email) continue;
      const prev = map.get(r.user_email);
      const last = !prev || r.created_at > prev.lastSeen ? r.created_at : prev.lastSeen;
      const isDash = r.path.startsWith("/dashboard");
      const feat = Object.keys(DASHBOARD_FEATURES).find((k) => r.path === k || r.path.startsWith(k + "/"));
      map.set(r.user_email, {
        email: r.user_email,
        total: (prev?.total ?? 0) + 1,
        dashboard: (prev?.dashboard ?? 0) + (isDash ? 1 : 0),
        lastSeen: last,
        device: prev?.device ?? r.device ?? "?",
        topFeature: feat ? DASHBOARD_FEATURES[feat] : (prev?.topFeature ?? "—"),
      });
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [rows]);

  if (users.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Users className="w-4 h-4 text-primary" />
        Usuários Identificados
        <Badge variant="outline" className="ml-auto text-xs">{users.length}</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="text-left py-1.5 font-medium">Email</th>
              <th className="text-right py-1.5 font-medium">Total</th>
              <th className="text-right py-1.5 font-medium">No sistema</th>
              <th className="text-left py-1.5 font-medium pl-4">Feature mais usada</th>
              <th className="text-right py-1.5 font-medium">Último acesso</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email} className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
                onClick={() => onSelectUser(u.email)}>
                <td className="py-1.5 truncate max-w-[180px] text-primary underline underline-offset-2">{u.email}</td>
                <td className="text-right py-1.5 font-medium">{u.total}</td>
                <td className="text-right py-1.5">{u.dashboard}</td>
                <td className="py-1.5 pl-4">{u.topFeature}</td>
                <td className="text-right py-1.5 text-muted-foreground">
                  {new Date(u.lastSeen).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-muted-foreground mt-2">Clique num usuário para filtrar os dados por ele.</p>
      </div>
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────── */
type SectionFilter = "all" | "public" | "dashboard" | "cta";
type DeviceFilter  = "all" | "mobile" | "desktop";

export default function AdminAnalytics() {
  const [allRows, setAllRows] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [userFilter, setUserFilter] = useState("");
  const [section, setSection] = useState<SectionFilter>("all");
  const [device, setDevice] = useState<DeviceFilter>("all");

  const load = async () => {
    setLoading(true);
    const query = supabase
      .from("page_views" as any)
      .select("path,source,referrer,device,country,city,user_id,user_email,created_at")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (days > 0) {
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      query.gte("created_at", since);
    }
    const { data } = await query;
    setAllRows((data as PageView[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [days]);

  const rows = useMemo(() => {
    let r = allRows;
    if (userFilter) r = r.filter((x) => x.user_email === userFilter);
    if (device !== "all") r = r.filter((x) => x.device === device);
    if (section === "public")    r = r.filter((x) => !x.path.startsWith("/dashboard") && !x.path.startsWith("/_cta"));
    if (section === "dashboard") r = r.filter((x) => x.path.startsWith("/dashboard"));
    if (section === "cta")       r = r.filter((x) => x.path.startsWith("/_cta"));
    return r;
  }, [allRows, userFilter, section, device]);

  const uniqueUsers = new Set(rows.filter((r) => r.user_id).map((r) => r.user_id)).size;
  const mobile = rows.filter((r) => r.device === "mobile").length;
  const desktop = rows.filter((r) => r.device === "desktop").length;
  const mobilePct = rows.length ? Math.round((mobile / rows.length) * 100) : 0;

  const dashRows = rows.filter((r) => r.path.startsWith("/dashboard"));
  const features = featureUsage(dashRows);
  const publicRows = rows.filter((r) => !r.path.startsWith("/dashboard") && !r.path.startsWith("/_cta"));
  const publicPages = aggregate(publicRows, "path").map((r) => ({ ...r, label: PUBLIC_LABELS[r.label] ?? r.label }));
  const ctaRows = rows.filter((r) => r.path.startsWith("/_cta"));
  const ctaCounts = aggregate(ctaRows, "path").map((r) => ({ ...r, label: CTA_LABELS[r.label] ?? r.label }));
  const sources = aggregate(rows, "source");
  const countries = aggregate(rows, "country");
  const trend = dailyTrend(rows, days);

  const userEmails = [...new Set(allRows.filter((r) => r.user_email).map((r) => r.user_email as string))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">
            {rows.length} eventos · {userFilter ? `filtrado: ${userFilter}` : "todos os usuários"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Filter className="w-4 h-4" /> Filtros
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Period */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {PERIODS.map((p) => (
              <button key={p.label} onClick={() => setDays(p.days)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${days === p.days ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Section */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["all","public","dashboard","cta"] as SectionFilter[]).map((s) => (
              <button key={s} onClick={() => setSection(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${section === s ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {s === "all" ? "Tudo" : s === "public" ? "Público" : s === "dashboard" ? "Sistema" : "CTAs"}
              </button>
            ))}
          </div>

          {/* Device */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["all","mobile","desktop"] as DeviceFilter[]).map((d) => (
              <button key={d} onClick={() => setDevice(d)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${device === d ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {d === "all" ? "Devices" : d === "mobile" ? "📱 Mobile" : "🖥 Desktop"}
              </button>
            ))}
          </div>

          {/* User filter */}
          <div className="relative">
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="text-xs rounded-lg border bg-background px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">👤 Todos os usuários</option>
              {userEmails.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          {userFilter && (
            <button onClick={() => setUserFilter("")} className="text-xs text-muted-foreground underline">
              Limpar filtro
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm animate-pulse">
          Carregando métricas...
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
          <BarChart2 className="h-8 w-8 opacity-30" />
          <p>Nenhum dado no período / filtro selecionado.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={BarChart2}   label="Total de eventos"      value={rows.length}         sub={days === 0 ? "todo o período" : `últimos ${days === 1 ? "24h" : `${days} dias`}`} />
            <KpiCard icon={Users}       label="Usuários identificados" value={uniqueUsers}         sub="com login ativo" color="text-violet-500" />
            <KpiCard icon={Smartphone}  label="Mobile / Desktop"       value={`${mobilePct}% / ${100 - mobilePct}%`} sub={`${mobile} mob · ${desktop} desk`} color="text-amber-500" />
            <KpiCard icon={Layout}      label="Acessos no sistema"     value={dashRows.length}     sub={`${rows.length > 0 ? Math.round((dashRows.length / rows.length) * 100) : 0}% do total`} color="text-emerald-500" />
          </div>

          {/* Trend */}
          {days !== 1 && <TrendChart data={trend} />}

          {/* Feature usage — most important */}
          {features.length > 0 && (
            <BarList title="Funcionalidades mais usadas (dentro do sistema)" icon={Layout}
              rows={features} max={features[0]?.count ?? 1} color="bg-violet-500" />
          )}

          {/* Funnel */}
          <FunnelSection rows={rows} />

          {/* 3-col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicPages.length > 0 && (
              <BarList title="Páginas públicas" icon={Globe} rows={publicPages} max={publicPages[0]?.count ?? 1} />
            )}
            {ctaCounts.length > 0 && (
              <BarList title="CTAs clicados" icon={MousePointer} rows={ctaCounts} max={ctaCounts[0]?.count ?? 1} color="bg-violet-500" />
            )}
            {sources.length > 0 && (
              <BarList title="Fontes de tráfego" icon={ArrowRight} rows={sources} max={sources[0]?.count ?? 1} />
            )}
            {countries.length > 0 && (
              <BarList title="Países" icon={Globe} rows={countries} max={countries[0]?.count ?? 1} />
            )}
          </div>

          {/* Device bar */}
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Monitor className="w-4 h-4 text-primary" /> Device split
            </div>
            <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
              <div className="bg-primary h-full transition-all" style={{ width: `${mobilePct}%` }} />
              <div className="bg-muted h-full flex-1" />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>📱 Mobile {mobilePct}% ({mobile})</span>
              <span>🖥 Desktop {100 - mobilePct}% ({desktop})</span>
            </div>
          </div>

          {/* User table */}
          <UserTable rows={rows} onSelectUser={(e) => setUserFilter(e)} />
        </>
      )}
    </div>
  );
}
