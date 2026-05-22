import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Role = "vet" | "receptionist" | "stockist";

/** Gera senha humanamente legível: 3 letras + 4 dígitos + 1 símbolo. Ex: vet4827! */
function generatePassword(): string {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$";
  const rand = (pool: string) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return pool[buf[0] % pool.length];
  };
  let pw = "";
  for (let i = 0; i < 3; i++) pw += rand(letters);
  for (let i = 0; i < 4; i++) pw += rand(digits);
  pw += rand(symbols);
  return pw;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: only clinic owners may invite employees.
    // An "owner" is a user that does NOT have a non-owner row in user_roles
    // (i.e., they are not themselves a member of someone else's clinic team).
    const adminAuthz = createClient(supabaseUrl, serviceKey);
    const { data: callerRoles, error: roleLookupErr } = await adminAuthz
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (roleLookupErr) {
      return new Response(JSON.stringify({ error: "Falha ao validar permissões." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const isTeamMember = (callerRoles ?? []).some((r: any) => r.role && r.role !== "owner");
    if (isTeamMember) {
      return new Response(JSON.stringify({
        error: "Apenas o proprietário da clínica pode cadastrar funcionários.",
      }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const role = String(body.role || "") as Role;
    const customPassword = body.password ? String(body.password).trim() : "";

    if (!email || !name || !["vet", "receptionist", "stockist"].includes(role)) {
      return new Response(JSON.stringify({ error: "Dados inválidos. Informe email, nome e cargo válido." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bloqueia convidar a si mesmo (owner não pode virar membro da própria equipe)
    if ((user.email || "").toLowerCase() === email) {
      return new Response(JSON.stringify({
        error: "Você não pode cadastrar a si mesmo como funcionário. Use outro email para o membro da equipe.",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (customPassword && customPassword.length < 6) {
      return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const password = customPassword || generatePassword();
    const admin = createClient(supabaseUrl, serviceKey);

    // Procura usuário pelo email
    const { data: list } = await admin.auth.admin.listUsers();
    let invitedUser = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email);
    let createdNew = false;

    if (!invitedUser) {
      // Cria usuário com email/senha definidos pelo owner — já confirmado
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: name, invited_by: user.id, role },
      });
      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      invitedUser = created.user;
      createdNew = true;
    } else {
      // SECURITY: an existing auth user can only have their password reset by this
      // owner if they are ALREADY a member of this owner's clinic. Otherwise this
      // endpoint could be used to take over arbitrary platform accounts by email.
      const { data: existingMembership, error: membershipErr } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", invitedUser.id)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (membershipErr) {
        return new Response(JSON.stringify({ error: "Falha ao validar vínculo do funcionário." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!existingMembership) {
        return new Response(JSON.stringify({
          error: "Este email já pertence a outro usuário da plataforma. Use um email diferente para cadastrar este funcionário.",
        }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Já é membro desta clínica — pode ter a senha redefinida pelo owner
      await admin.auth.admin.updateUserById(invitedUser.id, { password });
    }

    if (!invitedUser) {
      return new Response(JSON.stringify({ error: "Falha ao criar usuário." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trava extra: o convidado não pode ser o próprio dono
    if (invitedUser.id === user.id) {
      return new Response(JSON.stringify({
        error: "Você não pode cadastrar a si mesmo como funcionário.",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vincula role
    const { error: roleErr } = await admin.from("user_roles").upsert({
      user_id: invitedUser.id,
      owner_id: user.id,
      role,
    }, { onConflict: "user_id,owner_id,role" });

    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atualiza/insere employee vinculado e guarda senha temporária para o owner copiar/reenviar
    const { data: existingEmp } = await admin.from("employees")
      .select("id").eq("user_id", user.id).eq("email", email).maybeSingle();

    // NOTE: Plaintext temp passwords are NEVER persisted. The password is
    // returned once in this HTTP response and shown to the owner in a
    // one-time dialog. To resend, the owner must regenerate via this same
    // endpoint, which sets a brand-new password on the auth user.
    if (existingEmp) {
      await admin.from("employees").update({
        auth_user_id: invitedUser.id,
        app_role: role,
        name,
      }).eq("id", existingEmp.id);
    } else {
      await admin.from("employees").insert({
        user_id: user.id, name, email, role,
        app_role: role, auth_user_id: invitedUser.id,
        active: true, salary: 0, commission_percent: 0,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: invitedUser.id,
      email,
      password,
      created_new: createdNew,
      message: createdNew
        ? "Funcionário criado! Copie e envie o login + senha para ele."
        : "Senha redefinida! Copie e envie a nova senha para ele.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[invite-employee] error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
