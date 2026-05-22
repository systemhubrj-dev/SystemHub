import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

const BUILD_VERSION_KEY = "system-hub:build-id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Força logout quando uma nova versão do app é publicada.
    // Comparamos o BUILD_ID atual (injetado pelo Vite no build) com o que
    // está salvo no navegador. Se for diferente, encerra a sessão antes de
    // restaurá-la.
    const currentBuild = typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "dev";
    let storedBuild: string | null = null;
    try {
      storedBuild = localStorage.getItem(BUILD_VERSION_KEY);
    } catch { /* storage indisponível */ }

    const versionChanged = storedBuild !== null && storedBuild !== currentBuild;
    try {
      localStorage.setItem(BUILD_VERSION_KEY, currentBuild);
    } catch { /* storage indisponível */ }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return;

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }
    );

    const bootstrap = async () => {
      try {
        if (versionChanged) {
          await supabase.auth.signOut();
          if (!isMounted) return;
          setSession(null);
          setUser(null);
        } else {
          const { data: { session: restoredSession } } = await supabase.auth.getSession();
          if (!isMounted) return;
          setSession(restoredSession);
          setUser(restoredSession?.user ?? null);
        }
      } catch {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
