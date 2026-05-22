import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PlatformAdminCtx {
  isAdmin: boolean;
  loading: boolean;
  actingAs: string | null;
  actingAsName: string | null;
  setActingAs: (ownerId: string | null, name?: string | null) => void;
}

const Ctx = createContext<PlatformAdminCtx>({
  isAdmin: false,
  loading: true,
  actingAs: null,
  actingAsName: null,
  setActingAs: () => {},
});

const STORAGE_KEY = "sh_platform_acting_as";
const STORAGE_NAME_KEY = "sh_platform_acting_as_name";

export function PlatformAdminProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actingAs, _setActingAs] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [actingAsName, _setActingAsName] = useState<string | null>(() => localStorage.getItem(STORAGE_NAME_KEY));

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("platform_admins" as any)
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setIsAdmin(!!data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  // Clear impersonation if user is no longer admin
  useEffect(() => {
    if (!loading && !isAdmin && actingAs) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_NAME_KEY);
      _setActingAs(null);
      _setActingAsName(null);
    }
  }, [isAdmin, loading, actingAs]);

  const setActingAs = useCallback((ownerId: string | null, name?: string | null) => {
    if (ownerId) {
      localStorage.setItem(STORAGE_KEY, ownerId);
      if (name) localStorage.setItem(STORAGE_NAME_KEY, name);
      _setActingAs(ownerId);
      _setActingAsName(name ?? null);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_NAME_KEY);
      _setActingAs(null);
      _setActingAsName(null);
    }
  }, []);

  return (
    <Ctx.Provider value={{ isAdmin, loading, actingAs, actingAsName, setActingAs }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePlatformAdmin() {
  return useContext(Ctx);
}
