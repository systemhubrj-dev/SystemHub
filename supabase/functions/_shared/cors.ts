const ALLOWED_ORIGINS = [
  "https://systemhub.app.br",
  "https://www.systemhub.app.br",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
];

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}
