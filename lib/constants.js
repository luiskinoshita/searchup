export const CATEGORIES = ['Cartas', 'Brinquedos', 'Tênis', 'Eletrônicos', 'Games', 'Cosméticos', 'Outros'];

// Busca usada para achar lojas físicas daquele tipo no raio (Google Maps)
// "category" liga o tipo de loja aos Achados dos alunos
export const STORE_TYPES = [
  { key: 'Cartas', label: 'Lojas de cartas', query: 'トレカショップ', category: 'Cartas' },
  { key: 'Brinquedos', label: 'Brinquedos', query: 'おもちゃ屋', category: 'Brinquedos' },
  { key: 'Tênis', label: 'Tênis', query: 'スニーカーショップ', category: 'Tênis' },
  { key: 'Eletrônicos', label: 'Eletrônicos', query: '家電量販店', category: 'Eletrônicos' },
  { key: 'Games', label: 'Games', query: 'ゲームショップ', category: 'Games' },
  { key: 'Cosméticos', label: 'Drogarias', query: 'ドラッグストア', category: 'Cosméticos' },
  { key: 'Usados', label: 'Lojas de usados', query: 'リサイクルショップ', category: 'Outros' },
];

// Atalhos de busca em japonês (lojas online buscam melhor em japonês)
export const QUICK_SEARCHES = [
  { label: 'Pokémon box', q: 'ポケモンカード BOX' },
  { label: 'One Piece box', q: 'ワンピースカード BOX' },
  { label: 'Tomica', q: 'トミカ' },
  { label: 'Gunpla', q: 'ガンプラ HG' },
  { label: 'Nike Dunk', q: 'ナイキ ダンク ロー' },
  { label: 'Switch', q: 'Nintendo Switch ソフト' },
];

export const PREFECTURES = [
  'Hokkaido', 'Aomori', 'Iwate', 'Miyagi', 'Akita', 'Yamagata', 'Fukushima', 'Ibaraki', 'Tochigi', 'Gunma',
  'Saitama', 'Chiba', 'Tóquio', 'Kanagawa', 'Niigata', 'Toyama', 'Ishikawa', 'Fukui', 'Yamanashi', 'Nagano',
  'Gifu', 'Shizuoka', 'Aichi', 'Mie', 'Shiga', 'Kyoto', 'Osaka', 'Hyogo', 'Nara', 'Wakayama', 'Tottori',
  'Shimane', 'Okayama', 'Hiroshima', 'Yamaguchi', 'Tokushima', 'Kagawa', 'Ehime', 'Kochi', 'Fukuoka', 'Saga',
  'Nagasaki', 'Kumamoto', 'Oita', 'Miyazaki', 'Kagoshima', 'Okinawa',
];

export const CITIES = [
  { key: 'nagoya', label: 'Nagoya (Sakae)', lat: 35.1709, lng: 136.9084 },
  { key: 'okazaki', label: 'Okazaki', lat: 34.9551, lng: 137.1746 },
  { key: 'toyota', label: 'Toyota', lat: 35.0825, lng: 137.1561 },
  { key: 'anjo', label: 'Anjo', lat: 34.9588, lng: 137.0803 },
  { key: 'toyohashi', label: 'Toyohashi', lat: 34.7692, lng: 137.3915 },
  { key: 'ichinomiya', label: 'Ichinomiya', lat: 35.3039, lng: 136.8031 },
  { key: 'gifu', label: 'Gifu', lat: 35.4233, lng: 136.7606 },
  { key: 'ogaki', label: 'Ogaki', lat: 35.3594, lng: 136.6129 },
  { key: 'hamamatsu', label: 'Hamamatsu', lat: 34.7108, lng: 137.7261 },
  { key: 'yokkaichi', label: 'Yokkaichi', lat: 34.9652, lng: 136.6245 },
  { key: 'ota', label: 'Ota (Gunma)', lat: 36.2914, lng: 139.3754 },
  { key: 'tokyo', label: 'Tóquio (Akihabara)', lat: 35.6984, lng: 139.7731 },
  { key: 'yokohama', label: 'Yokohama', lat: 35.4658, lng: 139.6223 },
  { key: 'osaka', label: 'Osaka (Nipponbashi)', lat: 34.6623, lng: 135.5065 },
];

export function kmBetween(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
