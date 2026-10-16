export const yen = (n) => '¥' + Number(n || 0).toLocaleString('ja-JP');
export const fkm = (d) => (d == null || !Number.isFinite(Number(d)) ? '' :
  (d < 10 ? Number(d).toFixed(1) : String(Math.round(d))).replace('.', ',') + ' km');
export const off = (price, was) => (was && was > price ? Math.round((1 - price / was) * 100) : 0);

export function ago(t) {
  const m = Math.round((Date.now() - new Date(t).getTime()) / 60000);
  if (m < 60) return 'há ' + Math.max(1, m) + ' min';
  const h = Math.round(m / 60);
  return h < 48 ? 'há ' + h + ' h' : 'há ' + Math.round(h / 24) + ' dias';
}
export function until(t) {
  const h = Math.max(1, Math.round((new Date(t).getTime() - Date.now()) / 3600000));
  return h < 48 ? h + ' h' : Math.round(h / 24) + ' dias';
}
export const initials = (n) =>
  (n || '?').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '?';
export const feeText = (p) =>
  p.fee_type === 'pct' ? `${Number(p.fee_value)}% do valor` : `${yen(p.fee_value)} por item`;
export const firstName = (n) => (n || '').trim().split(/\s+/)[0] || 'aluno';

// Reduz a foto antes de enviar (mais rápido e economiza espaço)
export async function compressImage(file, max = 1600) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.82));
    return blob || file;
  } catch {
    return file;
  }
}

export const mapsLink = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export function readLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
export function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
