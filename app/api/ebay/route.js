// Preço de revenda lá fora: anúncios do eBay (EUA) via Browse API.
// Precisa de EBAY_CLIENT_ID e EBAY_CLIENT_SECRET (chaves de produção do eBay Developers).
// Sem as chaves, responde { configured: false } e o app mostra só o link para os vendidos.
import { resolveEnglish } from '@/lib/resolve';

export const dynamic = 'force-dynamic';

let token = null; // { value, exp }
let fx = null; // { usdJpy, exp }

async function getToken() {
  const id = (process.env.EBAY_CLIENT_ID || '').trim();
  const secret = (process.env.EBAY_CLIENT_SECRET || '').trim();
  if (!id || !secret) return null;
  if (token && token.exp > Date.now()) return token.value;
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'https://api.ebay.com/oauth/api_scope' }),
  });
  if (!res.ok) throw new Error('eBay token ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const data = await res.json();
  token = { value: data.access_token, exp: Date.now() + (Number(data.expires_in) - 120) * 1000 };
  return token.value;
}

// cotação USD→JPY (Banco Central Europeu via Frankfurter), guardada por 6 h
async function usdJpy() {
  if (fx && fx.exp > Date.now()) return fx.usdJpy;
  for (const url of ['https://api.frankfurter.dev/v1/latest?base=USD&symbols=JPY', 'https://api.frankfurter.app/latest?from=USD&to=JPY']) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const rate = Number((await res.json())?.rates?.JPY);
      if (rate > 0) { fx = { usdJpy: rate, exp: Date.now() + 6 * 3600e3 }; return rate; }
    } catch { /* tenta a próxima */ }
  }
  return null;
}

function median(nums) {
  if (!nums.length) return null;
  const a = [...nums].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const q = (sp.get('q') || '').trim().slice(0, 80);
  const en = (sp.get('en') || '').trim().slice(0, 80);
  if (q.length < 2 && !en) return Response.json({ items: [] });

  const query = en || (await resolveEnglish(q)).text;
  const soldUrl = 'https://www.ebay.com/sch/i.html?' + new URLSearchParams({ _nkw: query, LH_Sold: '1', LH_Complete: '1' });

  let access;
  try {
    access = await getToken();
  } catch (e) {
    console.error('ebay', e.message);
    return Response.json({ configured: true, error: 'unavailable', query, soldUrl, items: [] });
  }
  if (!access) return Response.json({ configured: false, query, soldUrl, items: [] });

  try {
    const url = 'https://api.ebay.com/buy/browse/v1/item_summary/search?' + new URLSearchParams({
      q: query, limit: '24', filter: 'buyingOptions:{FIXED_PRICE},priceCurrency:USD',
    });
    const [res, rate] = await Promise.all([
      fetch(url, {
        headers: { Authorization: `Bearer ${access}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US', 'Accept-Language': 'en-US' },
        next: { revalidate: 1800 },
      }),
      usdJpy(),
    ]);
    if (!res.ok) {
      console.error('ebay search', res.status, (await res.text()).slice(0, 300));
      return Response.json({ configured: true, error: res.status === 429 ? 'quota' : 'unavailable', query, soldUrl, items: [] });
    }
    const data = await res.json();
    const items = (data.itemSummaries || [])
      .filter((i) => i.price?.currency === 'USD' && Number(i.price.value) > 0)
      .map((i) => {
        const usd = Number(i.price.value);
        return {
          source: 'ebay',
          name: i.title,
          usd,
          price: rate ? Math.round(usd * rate) : null, // em ienes (aproximado)
          url: i.itemWebUrl,
          image: i.image?.imageUrl || i.thumbnailImages?.[0]?.imageUrl || null,
          condition: i.condition || '',
          from: i.itemLocation?.country || '',
        };
      });
    const med = median(items.map((i) => i.usd));
    return Response.json({
      configured: true, query, soldUrl, rate, items,
      medianUsd: med, medianJpy: med && rate ? Math.round(med * rate) : null,
      total: data.total || items.length,
    });
  } catch (e) {
    console.error('ebay', e);
    return Response.json({ configured: true, error: 'unavailable', query, soldUrl, items: [] });
  }
}
