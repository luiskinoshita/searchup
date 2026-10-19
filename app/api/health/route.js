// Diagnóstico: mostra só o FORMATO das chaves (nunca o valor) e a resposta
// do Google e do Rakuten, para descobrir problemas de configuração.
export const dynamic = 'force-dynamic';

function shape(v, prefix) {
  if (!v) return 'vazio';
  const t = v.trim();
  const parts = [`${t.length} caracteres`];
  if (prefix) parts.push(t.startsWith(prefix) ? `começa com ${prefix} ✓` : `NÃO começa com ${prefix}`);
  if (/^https?:\/\//.test(t)) parts.push('PARECE UM LINK, não uma chave');
  if (t !== v) parts.push('tem espaços no começo/fim');
  return parts.join(', ');
}

async function testGoogle() {
  const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!key) return 'sem chave';
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id' },
      body: JSON.stringify({ textQuery: 'トレカショップ 名古屋', pageSize: 1 }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return `OK (${(body.places || []).length} resultado)`;
    const e = body.error || {};
    const reasons = (e.details || []).map((d) => [d.reason, d.metadata?.service, d.metadata?.consumer].filter(Boolean).join(' ')).filter(Boolean);
    return `${res.status} ${e.status || ''}: ${e.message || ''} ${reasons.join(' | ')}`.trim();
  } catch (err) {
    return 'falha de rede: ' + err.message;
  }
}

async function testTranslate() {
  const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!key) return 'sem chave';
  try {
    const res = await fetch('https://translation.googleapis.com/language/translate/v2', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
      body: JSON.stringify({ q: 'carrinho de brinquedo azul', target: 'ja', format: 'text' }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return `OK (carrinho de brinquedo azul → ${body?.data?.translations?.[0]?.translatedText})`;
    const e = body.error || {};
    const reasons = (e.details || []).map((d) => [d.reason, d.metadata?.service, d.metadata?.consumer].filter(Boolean).join(' ')).filter(Boolean);
    return `${res.status} ${e.status || ''}: ${e.message || ''} ${reasons.join(' | ')}`.trim();
  } catch (err) {
    return 'falha de rede: ' + err.message;
  }
}

async function testRakuten() {
  const applicationId = (process.env.RAKUTEN_APP_ID || '').trim();
  const accessKey = (process.env.RAKUTEN_ACCESS_KEY || '').trim();
  if (!applicationId || !accessKey) return 'sem chave';
  const site = (process.env.SITE_URL || '').trim().replace(/\/$/, '');
  try {
    const url = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?' + new URLSearchParams({
      applicationId, keyword: 'トミカ', hits: '1', formatVersion: '2', format: 'json',
    });
    const res = await fetch(url, { cache: 'no-store', headers: { accessKey, Referer: site + '/', Origin: site } });
    const text = await res.text();
    if (res.ok) return 'OK';
    return `${res.status}: ${text.replace(applicationId, '[id]').replace(accessKey, '[key]').slice(0, 300)}`;
  } catch (err) {
    return 'falha de rede: ' + err.message;
  }
}

export async function GET() {
  const [google, rakuten, tr] = await Promise.all([testGoogle(), testRakuten(), testTranslate()]);
  return Response.json({
    chaves: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'vazio',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: shape(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'eyJ'),
      GOOGLE_MAPS_API_KEY: shape(process.env.GOOGLE_MAPS_API_KEY, 'AIza'),
      RAKUTEN_APP_ID: shape(process.env.RAKUTEN_APP_ID) + (/^[0-9a-f-]{36}$/i.test((process.env.RAKUTEN_APP_ID || '').trim()) ? ', formato de ID ✓' : ', formato de ID estranho'),
      RAKUTEN_ACCESS_KEY: shape(process.env.RAKUTEN_ACCESS_KEY, 'pk_'),
      SITE_URL: process.env.SITE_URL || 'vazio',
    },
    teste_google: google,
    teste_rakuten: rakuten,
    teste_traducao: tr,
  });
}
