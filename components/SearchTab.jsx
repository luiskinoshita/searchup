'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { QUICK_SEARCHES, STORE_TYPES } from '@/lib/constants';
import { fkm, mapsLink, yen } from '@/lib/util';
import { Price } from './ui';

const norm = (s) => String(s || '').normalize('NFKC').toLowerCase();

function Radar({ stores, radius }) {
  const sc = 100 / 40, cx = 120, cy = 120;
  const rings = [10, 20, 30, 40];
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label="Lojas em volta do ponto de busca">
      {rings.map((k) => (
        <g key={k}>
          <circle cx={cx} cy={cy} r={k * sc} fill="none" stroke="var(--line)" strokeWidth="1" />
          <text x={cx + 3} y={cy - k * sc + 11} fontSize="9" fill="var(--muted)">{k}</text>
        </g>
      ))}
      <circle cx={cx} cy={cy} r={Math.max(0.5, radius * sc)} fill="color-mix(in srgb, var(--brand) 14%, transparent)" stroke="var(--brand)" strokeWidth="1.5" />
      {stores.map((s) => (
        <circle key={s.id} cx={cx + s.dx * sc} cy={cy - s.dy * sc} r="4" fill="var(--tag)" stroke="var(--fg)" strokeWidth="1">
          <title>{`${s.name} · ${fkm(s.distance_km)}`}</title>
        </circle>
      ))}
      <circle cx={cx} cy={cy} r="4" fill="var(--hot)" />
    </svg>
  );
}

export default function SearchTab({ loc, radius, isStudent, onShareStore, onAddFind }) {
  const [q, setQ] = useState('');
  const [lastQ, setLastQ] = useState('');
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('preco');
  const [minPrice, setMinPrice] = useState('');
  const [storeType, setStoreType] = useState(STORE_TYPES[0].key);
  const [gStores, setGStores] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [studentStores, setStudentStores] = useState([]);
  const [storesState, setStoresState] = useState('idle');
  const [studentOffers, setStudentOffers] = useState([]);
  const [studentFinds, setStudentFinds] = useState([]);
  const cache = useRef(new Map()); // guarda resultados só enquanto a página está aberta

  async function runSearch(term) {
    const t = (term ?? q).trim();
    if (t.length < 2) return;
    setQ(t);
    setLastQ(t);
    setLoading(true);
    try {
      const res = await fetch('/api/search?q=' + encodeURIComponent(t));
      const data = await res.json();
      setItems(data.items || []);
      setErrors(data.errors || []);
    } catch {
      setItems([]);
      setErrors(['yahoo', 'rakuten']);
    }
    setLoading(false);
  }

  // Ofertas dos alunos que combinam com a busca
  useEffect(() => {
    if (!isStudent || !supabase || !lastQ) { setStudentOffers([]); return; }
    let alive = true;
    const words = norm(lastQ).split(/\s+/).filter(Boolean);
    const match = (s) => words.some((w) => norm(s).includes(w));
    Promise.all([
      supabase.rpc('feed_offers', { p_lat: loc.lat, p_lng: loc.lng, p_radius_km: radius, p_category: null }),
      supabase.rpc('finds_feed', { p_lat: loc.lat, p_lng: loc.lng, p_radius_km: radius, p_kind: 'produto', p_category: null }),
    ]).then(([o, f]) => {
      if (!alive) return;
      setStudentOffers((o.data || []).filter((x) => match(x.product + ' ' + x.store_name + ' ' + x.category)));
      setStudentFinds((f.data || []).filter((x) => match(x.title + ' ' + x.note + ' ' + x.category)));
    });
    return () => { alive = false; };
  }, [isStudent, lastQ, loc.lat, loc.lng, radius]);

  // Lojas cadastradas pelos alunos (Achados)
  useEffect(() => {
    if (!isStudent || !supabase || radius <= 0) { setStudentStores([]); return; }
    const cat = STORE_TYPES.find((t) => t.key === storeType)?.category || null;
    let alive = true;
    supabase.rpc('finds_feed', { p_lat: loc.lat, p_lng: loc.lng, p_radius_km: radius, p_kind: 'loja', p_category: cat })
      .then(({ data }) => alive && setStudentStores((data || []).filter((f) => f.lat != null && f.distance_km != null).map((f) => ({
        id: 'f-' + f.id, name: f.title, address: f.address || f.place_label, genre: '', lat: f.lat, lng: f.lng,
        distance_km: f.distance_km, source: 'aluno', author: f.author_name,
      }))));
    return () => { alive = false; };
  }, [isStudent, loc.lat, loc.lng, radius, storeType]);

  // Lojas físicas no raio (Google Maps)
  useEffect(() => {
    if (radius <= 0) { setGStores([]); setNextPage(null); setStoresState('idle'); return; }
    const key = `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)},${radius},${storeType}`;
    const hit = cache.current.get(key);
    if (hit) { setGStores(hit.stores); setNextPage(hit.next); setStoresState('done'); return; }
    let alive = true;
    setStoresState('loading');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stores?lat=${loc.lat}&lng=${loc.lng}&radius=${radius}&type=${encodeURIComponent(storeType)}`);
        const data = await res.json();
        if (!alive) return;
        setGStores(data.stores || []);
        setNextPage(data.next || null);
        setStoresState(data.error ? data.error : 'done');
        if (!data.error) cache.current.set(key, { stores: data.stores || [], next: data.next || null });
      } catch {
        if (alive) setStoresState('unavailable');
      }
    }, 800);
    return () => { alive = false; clearTimeout(t); };
  }, [loc.lat, loc.lng, radius, storeType]);

  async function loadMoreStores() {
    if (!nextPage) return;
    const key = `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)},${radius},${storeType}`;
    const res = await fetch(`/api/stores?lat=${loc.lat}&lng=${loc.lng}&radius=${radius}&type=${encodeURIComponent(storeType)}&page=${encodeURIComponent(nextPage)}`);
    const data = await res.json();
    const ids = new Set(gStores.map((s) => s.id));
    const merged = [...gStores, ...(data.stores || []).filter((s) => !ids.has(s.id))];
    setGStores(merged);
    setNextPage(data.next || null);
    cache.current.set(key, { stores: merged, next: data.next || null });
  }

  const stores = useMemo(
    () => [...studentStores, ...gStores].sort((a, b) => a.distance_km - b.distance_km),
    [studentStores, gStores],
  );

  const shown = useMemo(() => {
    const min = Number(minPrice) || 0;
    const list = items.filter((i) => i.price >= min);
    if (sort === 'preco') list.sort((a, b) => a.price - b.price);
    return list;
  }, [items, sort, minPrice]);

  const radarStores = useMemo(() => stores.map((s) => ({
    ...s,
    dx: (s.lng - loc.lng) * 111.32 * Math.cos((loc.lat * Math.PI) / 180),
    dy: (s.lat - loc.lat) * 110.57,
  })), [stores, loc.lat, loc.lng]);

  const cheapest = shown.length ? shown.reduce((m, i) => (i.price < m.price ? i : m), shown[0]) : null;

  return (
    <div className="sgrid">
      <div style={{ minWidth: 0 }}>
        <form className="sbox" onSubmit={(e) => { e.preventDefault(); runSearch(); }}>
          <input id="q" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Produto em japonês dá mais resultado: ポケモンカード" aria-label="Buscar produto" />
          <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Buscando…' : 'Buscar'}</button>
        </form>
        <div className="chips" style={{ marginTop: 10 }}>
          {QUICK_SEARCHES.map((s) => (
            <button key={s.q} className="chip" type="button" onClick={() => runSearch(s.q)}>{s.label}</button>
          ))}
        </div>

        {isStudent && (studentOffers.length || studentFinds.length) ? (
          <section className="sect">
            <div className="row between"><h2>Dos alunos para “{lastQ}”</h2><span className="pill brand">Só alunos</span></div>
            <div className="list">
              {studentOffers.slice(0, 5).map((o) => (
                <div key={o.id} className="store">
                  <div style={{ minWidth: 0 }}>
                    <b>{o.product}</b>
                    <div className="meta"><span className="pill warn">Oferta</span><span className="small muted">{o.store_name}</span><span className="pill brand num">{fkm(o.distance_km)}</span><span className="pill">por {o.author_name || 'aluno'}</span></div>
                  </div>
                  <Price price={o.price} was={o.regular_price} />
                </div>
              ))}
              {studentFinds.slice(0, 5).map((f) => (
                <div key={f.id} className="store">
                  <div style={{ minWidth: 0 }}>
                    <b>{f.title}</b>
                    <div className="meta"><span className="pill ok">Achado</span><span className="small muted">{f.place_label || f.category}</span><span className="pill">por {f.author_name || 'aluno'}</span></div>
                  </div>
                  {f.price ? <Price price={f.price} /> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="sect">
          <div className="row between">
            <h2>Lojas online</h2>
            {items.length ? (
              <div className="row small">
                <label className="row" style={{ gap: 6 }} htmlFor="minp">Preço mínimo
                  <input id="minp" type="number" min="0" step="100" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} style={{ width: 100 }} />
                </label>
                <select className="field" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar">
                  <option value="preco">Menor preço</option>
                  <option value="relevancia">Mais relevante</option>
                </select>
              </div>
            ) : null}
          </div>
          {errors.length ? <p className="small" style={{ color: 'var(--warn)' }}>Não foi possível consultar {errors.map((e) => (e === 'yahoo' ? 'Yahoo' : 'Rakuten')).join(' e ')} agora.</p> : null}
          {!lastQ ? (
            <div className="empty" style={{ marginTop: 8 }}>Busque um produto para comparar preços no 楽天市場. Use o “Preço mínimo” para esconder acessórios baratos.</div>
          ) : loading ? (
            <div className="empty" style={{ marginTop: 8 }}>Buscando preços…</div>
          ) : shown.length ? (
            <div className="list">
              {shown.slice(0, 40).map((i, idx) => (
                <article key={i.source + i.url + idx} className="item">
                  {i.image ? <img className="thumb" src={i.image} alt="" loading="lazy" /> : <div className="thumb" />}
                  <div style={{ minWidth: 0 }}>
                    <h3>{i.name}</h3>
                    <div className="meta">
                      <span className="pill">{i.source === 'yahoo' ? 'Yahoo!' : 'Rakuten'}</span>
                      <span className="small muted">{i.shop}</span>
                      {i.shipping ? <span className="pill ok">{i.shipping}</span> : null}
                      {cheapest === i ? <span className="pill warn">Menor preço</span> : null}
                    </div>
                  </div>
                  <div className="act">
                    <Price price={i.price} was={i.regularPrice} />
                    <a className="btn small" href={i.url} target="_blank" rel="noopener noreferrer">Ver na loja</a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ marginTop: 8 }}>Nada encontrado para “{lastQ}”. Tente escrever em japonês ou baixar o preço mínimo.</div>
          )}
        </section>

        <section className="sect">
          <div className="row between">
            <h2>Lojas físicas em até {radius} km</h2>
            <span className="small muted num">{storesState === 'done' ? `${stores.length} loja${stores.length === 1 ? '' : 's'}` : ''}</span>
          </div>
          <div className="chips" style={{ marginTop: 8 }}>
            {STORE_TYPES.map((t) => (
              <button key={t.key} type="button" className="chip" aria-pressed={storeType === t.key} onClick={() => setStoreType(t.key)}>{t.label}</button>
            ))}
          </div>
          {radius <= 0 ? (
            <div className="empty" style={{ marginTop: 8 }}>Com raio 0 km só aparecem lojas online. Aumente a distância.</div>
          ) : (
            <>
              {storesState === 'loading' ? <p className="small muted">Procurando lojas no Google Maps…</p> : null}
              {storesState === 'not_configured' ? <p className="small muted">A busca de lojas do Google ainda não foi configurada.</p> : null}
              {storesState === 'quota' ? <p className="small" style={{ color: 'var(--warn)' }}>O limite diário de buscas de lojas acabou. Volta amanhã; as lojas dos alunos continuam aparecendo.</p> : null}
              {storesState === 'unavailable' ? <p className="small" style={{ color: 'var(--warn)' }}>A busca de lojas do Google está indisponível agora.</p> : null}
              {stores.length ? (
                <div className="list">
                  {stores.slice(0, 60).map((s) => (
                    <div key={s.id} className="store">
                      <div style={{ minWidth: 0 }}>
                        <b>{s.name}</b>
                        <div className="meta">
                          <span className="pill brand num">{fkm(s.distance_km)}</span>
                          {s.source === 'aluno' ? <span className="pill ok">Achado de {s.author || 'aluno'}</span> : null}
                          {s.genre ? <span className="pill">{s.genre}</span> : null}
                          <span className="small muted">{s.address}</span>
                        </div>
                      </div>
                      <div className="act">
                        <a className="btn small" href={s.url || mapsLink(s.lat, s.lng)} target="_blank" rel="noopener noreferrer">Mapa</a>
                        {isStudent ? <button className="btn ghost small" type="button" onClick={() => onShareStore(s, storeType)}>Postar oferta</button> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : storesState !== 'loading' ? (
                <div className="empty" style={{ marginTop: 8 }}>Nenhuma loja desse tipo dentro de {radius} km.</div>
              ) : null}
              <div className="row between" style={{ marginTop: 8 }}>
                {gStores.length ? <span className="gattr" translate="no">Google Maps</span> : <span />}
                <div className="row">
                  {nextPage ? <button type="button" className="btn small" onClick={loadMoreStores}>Ver mais lojas</button> : null}
                  {isStudent && onAddFind ? <button type="button" className="btn ghost small" onClick={() => onAddFind('loja')}>Conhece uma loja que não aparece? Adicionar</button> : null}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <aside className="card radar">
        <div className="row between"><span className="eyebrow">Mapa do raio</span><span className="small muted num">{stores.length} lojas</span></div>
        <Radar stores={radarStores} radius={radius} />
        <p className="small muted" style={{ margin: '6px 0 0' }}>Centro: {loc.label}. Anéis a cada 10 km.</p>
        {lastQ && shown.length ? <p className="small" style={{ margin: '8px 0 0' }}>Menor preço online: <b className="num">{yen(cheapest.price)}</b></p> : null}
      </aside>
    </div>
  );
}
