// Lojas físicas no raio: Google Places API (New) — Text Search.
// Os termos do Google não permitem guardar os resultados no servidor, então
// cada busca consulta o Google. Para não sair da cota grátis (5.000/mês),
// o app conta as buscas do dia no Supabase e para ao chegar no limite.
import { STORE_TYPES, kmBetween } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const DAILY_LIMIT = Number(process.env.GOOGLE_DAILY_LIMIT) || 150;

// true = ainda pode buscar hoje
async function consumeQuota() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/consume_api_quota`, {
      method: 'POST',
      cache: 'no-store',
      headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_api: 'google_places', p_limit: DAILY_LIMIT }),
    });
    if (!res.ok) return false;
    return (await res.json()) === true;
  } catch {
    return false;
  }
}

const FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
  'places.primaryTypeDisplayName', 'places.googleMapsUri', 'places.businessStatus', 'nextPageToken',
].join(',');

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const lat = Number(sp.get('lat'));
  const lng = Number(sp.get('lng'));
  const radius = Math.min(40, Math.max(0, Number(sp.get('radius')) || 0));
  const type = STORE_TYPES.find((t) => t.key === sp.get('type')) || STORE_TYPES[0];
  const pageToken = sp.get('page') || undefined;
  const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();

  if (!key) return Response.json({ stores: [], error: 'not_configured' });
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || radius <= 0) return Response.json({ stores: [] });
  if (!(await consumeQuota())) return Response.json({ stores: [], error: 'quota' });

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS },
      body: JSON.stringify({
        textQuery: type.query,
        languageCode: 'ja',
        regionCode: 'JP',
        pageSize: 20,
        rankPreference: 'DISTANCE',
        locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: Math.min(50000, radius * 1000) } },
        ...(pageToken ? { pageToken } : {}),
      }),
    });
    if (res.status === 429) return Response.json({ stores: [], error: 'quota' });
    if (!res.ok) {
      console.error('google places', res.status, await res.text());
      return Response.json({ stores: [], error: 'unavailable' });
    }
    const data = await res.json();
    const stores = (data.places || [])
      .filter((p) => p.location && p.businessStatus !== 'CLOSED_PERMANENTLY')
      .map((p) => ({
        id: p.id,
        name: p.displayName?.text || '',
        address: (p.formattedAddress || '').replace(/^日本、\s*/, ''),
        genre: p.primaryTypeDisplayName?.text || '',
        lat: p.location.latitude,
        lng: p.location.longitude,
        url: p.googleMapsUri || null,
        distance_km: kmBetween({ lat, lng }, { lat: p.location.latitude, lng: p.location.longitude }),
        source: 'google',
      }))
      .filter((s) => s.distance_km <= radius);
    return Response.json({ stores, next: data.nextPageToken || null });
  } catch (e) {
    console.error('stores error', e);
    return Response.json({ stores: [], error: 'unavailable' });
  }
}
