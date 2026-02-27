import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'designs';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({
        error: 'Server misconfiguration: missing Supabase URL or service role key'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: { dataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const dataUrl = body?.dataUrl;
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return new Response(
      JSON.stringify({ error: 'Body must include a dataUrl (data:image/...)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const mimeMatch = dataUrl.match(/data:image\/(\w+);base64,/);
  const ext = mimeMatch ? mimeMatch[1] : 'png';
  const base64 = dataUrl.split(',')[1];
  if (!base64) {
    return new Response(
      JSON.stringify({ error: 'Invalid data URL' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const buffer = Buffer.from(base64, 'base64');
  const contentType = `image/${ext}`;
  const filePath = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType
    });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message, details: error }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return new Response(
    JSON.stringify({
      publicUrl: urlData.publicUrl,
      storagePath: data.path ?? filePath
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
