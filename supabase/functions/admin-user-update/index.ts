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
    return jsonResponse({ error: "Only admins can update users." }, 403);
  }

  const body = await req.json().catch(() => null);
  const userId = String(body?.userId ?? "").trim();
  const username = String(body?.username ?? "").trim();
  const role = String(body?.role ?? "").trim();
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password.trim() : "";

  if (!userId || !username || !role) {
    return jsonResponse({ error: "User ID, username, and role are required." }, 400);
  }

  if (!["visitor", "user", "admin"].includes(role)) {
    return jsonResponse({ error: "Invalid role." }, 400);
  }

  if (requester.id === userId && role !== "admin") {
    return jsonResponse({ error: "You cannot remove your own admin role." }, 400);
  }

  const authUpdates: Record<string, unknown> = {
    user_metadata: {
      username,
    },
  };

  if (email) {
    authUpdates.email = email;
  }

  if (password) {
    authUpdates.password = password;
  }

  const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, authUpdates);

  if (authUpdateError) {
    return jsonResponse({ error: authUpdateError.message }, 400);
  }

  const { error: profileUpdateError } = await adminClient
    .from("profiles")
    .update({ username, role })
    .eq("id", userId);

  if (profileUpdateError) {
    return jsonResponse({ error: profileUpdateError.message }, 400);
  }

  return jsonResponse({ success: true });
});
