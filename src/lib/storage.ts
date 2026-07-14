import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "moodboards";

let client: SupabaseClient | null = null;

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase storage environment variables are not set");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

/**
 * Uploads a PNG to the public moodboards bucket and returns its public URL.
 * Creates the bucket on first use.
 */
export async function uploadMoodBoard(
  png: Buffer,
  path: string,
): Promise<string> {
  const supabase = getClient();

  let { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, png, { contentType: "image/png", upsert: true });

  if (error && /bucket.*not.*found/i.test(error.message)) {
    await supabase.storage.createBucket(BUCKET, { public: true });
    ({ error } = await supabase.storage
      .from(BUCKET)
      .upload(path, png, { contentType: "image/png", upsert: true }));
  }

  if (error) {
    throw new Error(`Mood board upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
