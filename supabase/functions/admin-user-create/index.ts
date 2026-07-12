import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase environment variables." }, 500);
  }

  const authorization = req.headers.get("Authorization") ?? "";

  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const {
    data: { user: requester },
    error: requesterError,
  } = await authClient.auth.getUser();

  if (requesterError || !requester) {
    return jsonResponse({ error: "Unauthorized request." }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: requesterProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", requester.id)
    .maybeSingle();

  if (profileError || requesterProfile?.role !== "admin") {
    return jsonResponse({ error: "Only admins can create users." }, 403);
  }

  const body = await req.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "").trim();
  const role = String(body?.role ?? "user").trim();

  if (!username || !email || !password) {
    return jsonResponse({ error: "Username, email, and password are required." }, 400);
  }

  if (!["visitor", "user", "admin"].includes(role)) {
    return jsonResponse({ error: "Invalid role." }, 400);
  }

  const { data: createdUserData, error: createUserError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
    },
  });

  if (createUserError || !createdUserData.user) {
    return jsonResponse({ error: createUserError?.message ?? "Failed to create user." }, 400);
  }

  const { error: profileUpsertError } = await adminClient.from("profiles").upsert(
    {
      id: createdUserData.user.id,
      username,
      role,
    },
    { onConflict: "id" },
  );

  if (profileUpsertError) {
    return jsonResponse({ error: profileUpsertError.message }, 400);
  }

  return jsonResponse({
    success: true,
    user: {
      id: createdUserData.user.id,
      email: createdUserData.user.email,
      username,
      role,
    },
  });
});
