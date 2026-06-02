// ── db.js — Supabase client + all DB / storage operations ──

const SUPABASE_URL = "https://zftaoienzvepquhktosm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Jd98MGRtB3sHmVfdlitHsw_dzYDLxgh";

const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Fetch all entries ──────────────────────────────────────
async function dbLoadEntries() {
  const { data, error } = await sbClient
    .from("approval_log")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// ── Insert new entry ───────────────────────────────────────
async function dbInsertEntry(entry) {
  const { error } = await sbClient.from("approval_log").insert([entry]);
  if (error) throw error;
}

// ── Update existing entry ──────────────────────────────────
async function dbUpdateEntry(id, fields) {
  const { error } = await sbClient
    .from("approval_log")
    .update(fields)
    .eq("id", id);
  if (error) throw error;
}

// ── Delete entry ───────────────────────────────────────────
async function dbDeleteEntry(id) {
  const { error } = await sbClient
    .from("approval_log")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Upload image to Storage ────────────────────────────────
// Returns public/signed URL or base64 fallback
async function dbUploadImage(file) {
  const ext = file.name.split(".").pop();
  const path = `creatives/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { data: upData, error: upErr } = await sbClient.storage
    .from("approval-log-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (upErr) {
    // Fallback: base64 stored in DB (no bucket needed)
    return await fileToBase64(file);
  }

  const { data: signedData, error: signedErr } = await sbClient.storage
    .from("approval-log-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

  if (signedErr) {
    return await fileToBase64(file);
  }

  return signedData.signedUrl;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}
