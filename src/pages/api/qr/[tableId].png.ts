import type { APIRoute } from 'astro';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ params, site }) => {
  const { tableId } = params;
  if (!tableId) {
    return new Response('Missing table ID', { status: 400 });
  }

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: table } = await supabase
    .from('tables')
    .select('label, qr_token, tenants(slug)')
    .eq('id', tableId)
    .single();

  if (!table) {
    return new Response('Table not found', { status: 404 });
  }

  const t = table as any;
  const slug = t.tenants?.slug ?? 'demo';
  const baseUrl = site?.origin ?? `${import.meta.env.PUBLIC_SUPABASE_URL?.replace('https://', 'https://')}`;
  const url = `${baseUrl}/${slug}?table=${t.qr_token}`;

  const pngBuffer = await QRCode.toBuffer(url, {
    type: 'png',
    width: 1024,
    margin: 2,
    color: { dark: '#1f2937', light: '#ffffff' },
  });

  return new Response(pngBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="qr-${t.label.replace(/\s+/g, '-').toLowerCase()}.png"`,
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
