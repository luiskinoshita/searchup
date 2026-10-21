// "Comparar preços": o mesmo produto em várias lojas do 楽天市場 (menor, maior e preço médio).
import { rakutenGet, num } from '@/lib/rakuten';
import { resolveQuery } from '@/lib/resolve';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const q = (sp.get('q') || '').trim().slice(0, 80);
  const kw = (sp.get('kw') || '').trim().slice(0, 80);
  if (q.length < 2 && !kw) return Response.json({ products: [] });
  const keyword = kw || (await resolveQuery(q, 'online')).text;
  try {
    const data = await rakutenGet('https://openapi.rakuten.co.jp/ichibaproduct/api/Product/Search/20250801', { keyword, hits: '10' });
    const products = (data?.Products || data?.products || []).map((raw) => {
      const p = raw.Product || raw.product || raw;
      const min = num(p.salesMinPrice) || num(p.minPrice);
      const max = num(p.salesMaxPrice) || num(p.maxPrice);
      return {
        id: p.productId,
        name: p.productName,
        brand: p.brandName || p.makerName || '',
        image: p.mediumImageUrl || null,
        min, max,
        avg: num(p.averagePrice),
        shops: Number(p.salesItemCount || p.itemCount) || 0,
        url: p.affiliateUrl || p.productUrlPC || p.productUrlMobile,
      };
    }).filter((p) => p.min && p.url && p.shops >= 2).slice(0, 4);
    return Response.json({ products, used: keyword });
  } catch (e) {
    console.error('products', e.message);
    return Response.json({ products: [], error: 'unavailable' });
  }
}
