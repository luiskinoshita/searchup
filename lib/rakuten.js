// Ajudante comum para as APIs do Rakuten (novo openapi.rakuten.co.jp, 2026).
// Cuida da chave, do Referer, de esperar e tentar de novo quando o Rakuten pede calma (429)
// e, se houver RAKUTEN_AFFILIATE_ID, liga a afiliação (os links passam a gerar comissão).
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function rakutenKeys() {
  const applicationId = (process.env.RAKUTEN_APP_ID || '').trim();
  const accessKey = (process.env.RAKUTEN_ACCESS_KEY || '').trim();
  const affiliateId = (process.env.RAKUTEN_AFFILIATE_ID || '').trim();
  const site = (process.env.SITE_URL || 'https://searchup-idml.vercel.app').trim().replace(/\/$/, '');
  return { applicationId, accessKey, affiliateId, site };
}

// base: URL sem parâmetros; params: objeto; revalidate: segundos de cache
export async function rakutenGet(base, params, revalidate = 1800) {
  const { applicationId, accessKey, affiliateId, site } = rakutenKeys();
  if (!applicationId || !accessKey) throw new Error('Chaves do Rakuten não configuradas');
  const url = base + '?' + new URLSearchParams({
    applicationId, format: 'json', formatVersion: '2', ...(affiliateId ? { affiliateId } : {}), ...params,
  });
  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, { headers: { accessKey, Referer: site + '/', Origin: site }, next: { revalidate } });
    if (res.status !== 429) break;
    await wait(1100 * (attempt + 1));
  }
  if (res.status === 404) return null; // "nada encontrado"
  if (!res.ok) {
    const body = (await res.text()).replace(applicationId, '[id]').replace(accessKey, '[key]').slice(0, 200);
    throw new Error(`Rakuten ${res.status} ${body}`);
  }
  return res.json();
}

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

export const firstImage = (imgs) => {
  const f = (imgs || [])[0];
  return typeof f === 'string' ? f : f?.imageUrl || null;
};
