import { createClient } from 'npm:@supabase/supabase-js@2.119.2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { createImageThumbnail } from '../_shared/imageThumbnail.ts';

// Maintenance-only: the existing private scheduler credential is supplied by
// pg_net, never exposed to clients. Work is bounded to one image per call.
const BodySchema = z.object({ supplyId: z.string().uuid(), kind: z.enum(['photo', 'drawing']).default('photo') }).strict();

Deno.serve(async (req) => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return reply({ error: 'Storage configuration missing' }, 500);
    const client = createClient(url, key);
    const provided = req.headers.get('x-cron-secret');
    if (!provided) return reply({ error: 'Maintenance authorization required' }, 401);
    const { data: credential, error: credentialError } = await client.from('internal_secrets')
      .select('value').eq('key', 'request_digest_cron_token').single();
    if (credentialError || !credential?.value || provided !== credential.value) {
      return reply({ error: 'Invalid maintenance authorization' }, 403);
    }
    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return reply({ error: 'A valid supplyId is required' }, 400);
    const { data: supply, error } = await client.from('supplies')
      .select('image_url, images, illustration_url').eq('id', parsed.data.supplyId).single();
    if (error || !supply) return reply({ error: 'Item not found' }, 404);

    const prefix = `${url}/storage/v1/object/public/supply-images/`;
    const selected = parsed.data.kind === 'drawing' ? supply.illustration_url : (supply.image_url || supply.images?.[0]);
    const sources = new Set<string>([selected].filter(
      (value): value is string => typeof value === 'string' && value.startsWith(prefix)
    ));
    let created = 0;
    let skipped = 0;
    const failures: string[] = [];
    for (const source of sources) {
      try {
        const path = decodeURIComponent(new URL(source).pathname.slice(new URL(prefix).pathname.length));
        if (!path || path.endsWith('.thumb.jpg')) { skipped++; continue; }
        const bucket = client.storage.from('supply-images');
        const thumbnailPath = `${path}.thumb.jpg`;
        const existing = await fetch(`${prefix}${encodeURI(thumbnailPath)}`, { method: 'HEAD' });
        if (existing.ok) { skipped++; continue; }
        const { data: original, error: downloadError } = await bucket.download(path);
        if (downloadError || !original) throw new Error('Original image unavailable');
        if (original.size > 15 * 1024 * 1024) throw new Error('Original exceeds safe conversion size');
        const thumbnail = await createImageThumbnail(new Uint8Array(await original.arrayBuffer()));
        const { error: uploadError } = await bucket.upload(thumbnailPath, thumbnail, {
          contentType: 'image/jpeg', cacheControl: '31536000', upsert: false,
        });
        if (uploadError && !uploadError.message.includes('already exists')) throw new Error('Thumbnail upload failed');
        created++;
      } catch (error) {
        failures.push(error instanceof Error ? error.message : 'Image conversion failed');
      }
    }
    return reply({ created, skipped, failures });
  } catch {
    return reply({ error: 'Image conversion failed' }, 500);
  }
});