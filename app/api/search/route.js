// Busca de preços online: 楽天市場 (e Yahoo!ショッピング, se configurado).
// Roda no servidor, então as chaves nunca chegam ao celular do usuário.
import { resolveQuery } from '@/lib/resolve';

export const dynamic = 'force-dynamic';

const CACHE_SECONDS = 1800; // guarda resultados iguais por 30 min

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

async function searchYahoo(q) {
  const appid = (process.env.YAHOO_CLIENT_ID || '').trim();
  if (!appid) throw new Error('YAHOO_CLIENT_ID não configurado');
  const url = 'https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?' + new URLSearchParams({
    appid, query: q, results: '30', in_stock: 'true',
  });
  const res = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
  if (!res.ok) throw new Error('Yahoo respondeu ' + res.status);
  const data = await res.json();
  return (data.hits || []).map((h) => {
    const price = num(h.price);
    const label = h.priceLabel || {};
    const regular = num(label.fixedPrice) || (label.discountedPrice ? num(label.defaultPrice) : null);
    return {
      source: 'yahoo',
      name: h.name,
      price,
      regularPrice: regular && price && regular > price ? regular : null,
      url: h.url,
      image: h.image?.medium || h.image?.small || null,
      shop: h.seller?.name || '',
      shipping: h.shipping?.code === 2 ? 'Frete grátis' : (h.shipping?.name || ''),
    };
  }).filter((i) => i.price && i.url);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchRakuten(q, hits = 30) {
  const applicationId = (process.env.RAKUTEN_APP_ID || '').trim();
  const accessKey = (process.env.RAKUTEN_ACCESS_KEY || '').trim();
  if (!applicationId || !accessKey) throw new Error('Chaves do Rakuten não configuradas');
  const site = (process.env.SITE_URL || 'https://searchup-idml.vercel.app').trim().replace(/\/$/, '');
  const url = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?' + new URLSearchParams({
    applicationId, keyword: q, hits: String(hits), availability: '1', formatVersion: '2', format: 'json',
  });
  // o Rakuten aceita poucas buscas por segundo: se reclamar (429), espera e tenta de novo
  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, {
      headers: { accessKey, Referer: site + '/', Origin: site },
      next: { revalidate: CACHE_SECONDS },
    });
    if (res.status !== 429) break;
    await wait(1100 * (attempt + 1));
  }
  if (!res.ok) throw new Error('Rakuten respondeu ' + res.status);
  const data = await res.json();
  return (data.items || data.Items || []).map((raw) => {
    const it = raw.item || raw.Item || raw;
    const imgs = it.mediumImageUrls || [];
    const first = imgs[0];
    const image = typeof first === 'string' ? first : first?.imageUrl || null;
    const points = Number(it.pointRate) > 1 ? `${it.pointRate}x pontos` : '';
    return {
      source: 'rakuten',
      name: it.itemName,
      price: num(it.itemPrice),
      regularPrice: null,
      url: it.itemUrl,
      image,
      shop: it.shopName || '',
      shipping: [it.postageFlag === 0 ? 'Frete incluso' : '', points].filter(Boolean).join(' · '),
    };
  }).filter((i) => i.price && i.url);
}

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const q = (sp.get('q') || '').trim().slice(0, 80);
  const kw = (sp.get('kw') || '').trim().slice(0, 80); // palavra japonesa já escolhida (catálogo)
  const hits = Math.min(30, Math.max(1, Number(sp.get('hits')) || 30));
  if (q.length < 2 && !kw) return Response.json({ items: [], errors: [] });

  const resolved = kw ? { text: kw, how: 'catalog' } : await resolveQuery(q, 'online');
  const used = resolved.text;

  // O Yahoo é opcional: só entra se YAHOO_CLIENT_ID estiver configurado
  const useYahoo = !!process.env.YAHOO_CLIENT_ID;
  const [y, r] = await Promise.allSettled([useYahoo ? searchYahoo(used) : Promise.resolve([]), searchRakuten(used, hits)]);
  const items = [];
  const errors = [];
  if (y.status === 'fulfilled') items.push(...y.value); else errors.push({ source: 'yahoo', message: y.reason?.message });
  if (r.status === 'fulfilled') items.push(...r.value); else errors.push({ source: 'rakuten', message: r.reason?.message });

  // tradução automática trouxe pouco? tenta também o texto original
  if (resolved.how === 'translated' && items.length < 5 && q) {
    try {
      const seen = new Set(items.map((i) => i.url));
      for (const i of await searchRakuten(q, hits)) if (!seen.has(i.url)) items.push(i);
    } catch { /* ignora */ }
  }
  if (errors.length) console.error('search errors', errors);

  return Response.json({ items, used, how: resolved.how, errors: errors.map((e) => e.source) });
}
