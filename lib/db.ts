import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Subscription } from "./types";

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase credentials are not configured");
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

export async function upsertSubscription(
  email: string,
  keyword: string,
  schedule: "daily" | "weekly"
): Promise<Subscription> {
  const { data, error } = await getSupabase()
    .from("subscriptions")
    .upsert(
      { email, keyword, schedule, active: true },
      { onConflict: "email,keyword" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Subscription;
}

export async function deactivateSubscription(
  email: string,
  keyword: string
): Promise<void> {
  const { error } = await getSupabase()
    .from("subscriptions")
    .update({ active: false })
    .eq("email", email)
    .eq("keyword", keyword);

  if (error) throw new Error(error.message);
}

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await getSupabase()
    .from("subscriptions")
    .select("*")
    .eq("active", true);

  if (error) throw new Error(error.message);
  return (data ?? []) as Subscription[];
}

export async function updateLastSentAt(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("subscriptions")
    .update({ last_sent_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}
