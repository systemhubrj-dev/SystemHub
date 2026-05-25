import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart2, Globe, Monitor, MousePointer } from "lucide-react";

interface Row { label: string; count: number }

interface Stats {
  sources: Row[];
  pages: Row[];
  countries: Row[];
  devices: Row[];
  total: number;
}

const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brazil", US: "United States", PT: "Portugal", AR: "Argentina",
  MX: "Mexico", CO: "Colombia", ES: "Spain", DE: "Germany",
  FR: "France", GB: "United Kingdom", IT: "Italy", JP: "Japan",
  CN: "China", IN: "India", CA: "Canada", AU: "Australia",
  BD: "Bangladesh", UA: "Ukraine",
};

const DAYS_OPTIONS = [7, 30, 90];

export default function AdminAnalytics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const since = new Date(Date.now() - days * 86400_000).toISOString();

      const { data, error } = await supabase
        .from("page_views" as any)
        .select("path, source, country, device")
        .gte("created_at", since);

      if (error || !data) { setLoading(false); return; }

      const rows = data as { path: string; source: string; country: string | null; device: string }[];

      function aggregate(key: keyof typeof rows[0], top = 10): Row[] {
        const map = new Map<string, number>();
        for (const r of rows) {
          const v = String(r[key] ?? "Unknown");
          map.set(v, (map.get(v) ?? 0) + 1);
        }
        return [...map.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, top)
          .map(([label, count]) => ({ label, count }));
      }

      const countriesRaw = aggregate("country");
      const countries = countriesRaw.map(r => ({
        label: COUNTRY_NAMES[r.label] ? `${r.label} ${COUNTRY_NAMES[r.label]}` : r.label,
        count: r.count,
      }));

      setStats({
        sources: aggregate("source"),
        pages: aggregate("path"),
        countries,
        devices: aggregate("device"),
        total: rows.length,
      });
      setLoading(false);
    }
    load();
  }, [days]);

  function StatCard({
    title,
    icon: Icon,
    rows,
    max,
  }: {
    title: string;
    icon: React.ElementType;
    rows: Row[];
    max: number;
  }) {
    return (
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="w-4 h-4 text-primary" />
          {title}
          <span className="ml-auto text-xs text-muted-foreground font-normal">Visitors</span>
        </div>
        <div className="space-y-2">
          {rows.length === 0 && (
            <p className="text-xs text-muted-foreground">Sem dados ainda</p>
          )}
          {rows.map((r) => (
            <div key={r.label} className="space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className="truncate max-w-[65%]">{r.label}</span>
                <span className="font-medium">{r.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxSource = stats?.sources[0]?.count ?? 1;
  const maxPage = stats?.pages[0]?.count ?? 1;
  const maxCountry = stats?.countries[0]?.count ?? 1;
  const maxDevice = stats?.devices[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Visitas ao SystemHub</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                days === d ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Carregando...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total de visitas", value: stats?.total ?? 0 },
              { label: "Fontes únicas", value: stats?.sources.length ?? 0 },
              { label: "Páginas únicas", value: stats?.pages.length ?? 0 },
              { label: "Países", value: stats?.countries.length ?? 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard title="Source" icon={MousePointer} rows={stats?.sources ?? []} max={maxSource} />
            <StatCard title="Page" icon={BarChart2} rows={stats?.pages ?? []} max={maxPage} />
            <StatCard title="Country" icon={Globe} rows={stats?.countries ?? []} max={maxCountry} />
            <StatCard title="Device" icon={Monitor} rows={stats?.devices ?? []} max={maxDevice} />
          </div>
        </>
      )}
    </div>
  );
}
