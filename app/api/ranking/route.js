// "Em alta": os mais vendidos agora no 楽天市場 para um gênero (categoria do catálogo).
import { rakutenGet, num, firstImage } from '@/lib/rakuten';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const genre = String(new URL(request.url).searchParams.get('genre') || '').replace(/\D/g, '').slice(0, 9);
  if (!genre) return Response.json({ items: [] });
  try {
    const data = await rakutenGet('https://openapi.rakuten.co.jp/ichibaranking/api/IchibaItem/Ranking/20220601', { genreId: genre }, 3600);
    const items = (data?.Items || data?.items || []).map((raw) => {
      const it = raw.Item || raw.item || raw;
      return {
        rank: it.rank,
        name: it.itemName,
        price: num(it.itemPrice),
        url: it.affiliateUrl || it.itemUrl,
        image: firstImage(it.mediumImageUrls),
        shop: it.shopName || '',
      };
    }).filter((i) => i.price && i.url).sort((a, b) => a.rank - b.rank).slice(0, 12);
    return Response.json({ items, title: data?.title || '' });
  } catch (e) {
    console.error('ranking', e.message);
    return Response.json({ items: [], error: 'unavailable' });
  }
}
