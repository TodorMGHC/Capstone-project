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
    return jsonResponse({ error: "Only admins can delete users." }, 403);
  }

  const body = await req.json().catch(() => null);
  const userId = String(body?.userId ?? "").trim();

  if (!userId) {
    return jsonResponse({ error: "User ID is required." }, 400);
  }

  if (userId === requester.id) {
    return jsonResponse({ error: "You cannot delete your own account." }, 400);
  }

  const { error: lampsDeleteError } = await adminClient.from("lamps").delete().eq("user_id", userId);

  if (lampsDeleteError) {
    return jsonResponse({ error: lampsDeleteError.message }, 400);
  }

  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteUserError) {
    return jsonResponse({ error: deleteUserError.message }, 400);
  }

  return jsonResponse({ success: true });
});
