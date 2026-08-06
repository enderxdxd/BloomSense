import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const MOODBOARD_BUCKET = "moodboards";
const PRODUCT_IMAGE_BUCKET = "product-images";

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
  return uploadPublicFile(MOODBOARD_BUCKET, path, png, "image/png", true);
}

/** Uploads a storefront product image and returns its permanent public URL. */
export async function uploadProductImage(
  image: Buffer,
  path: string,
  contentType: string,
): Promise<string> {
  return uploadPublicFile(
    PRODUCT_IMAGE_BUCKET,
    path,
    image,
    contentType,
    false,
  );
}

async function uploadPublicFile(
  bucket: string,
  path: string,
  contents: Buffer,
  contentType: string,
  upsert: boolean,
): Promise<string> {
  const supabase = getClient();

  let { error } = await supabase.storage
    .from(bucket)
    .upload(path, contents, {
      contentType,
      cacheControl: "31536000",
      upsert,
    });

  if (error && /bucket.*not.*found/i.test(error.message)) {
    await supabase.storage.createBucket(bucket, { public: true });
    ({ error } = await supabase.storage
      .from(bucket)
      .upload(path, contents, {
        contentType,
        cacheControl: "31536000",
        upsert,
      }));
  }

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
