import { requireSupabase } from "./supabase";
import type { AllProgress } from "@/hooks/useProgress";

const TABLE_NAME = "user_progress";

export async function loadUserProgress(userId: string): Promise<AllProgress | null> {
  const { data, error } = await requireSupabase()
    .from(TABLE_NAME)
    .select("progress")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data?.progress as AllProgress | undefined) ?? null;
}

export async function saveUserProgress(userId: string, progress: AllProgress) {
  const { error } = await requireSupabase()
    .from(TABLE_NAME)
    .upsert(
      {
        user_id: userId,
        progress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}
