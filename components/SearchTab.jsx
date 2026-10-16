'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { STORE_TYPES } from '@/lib/constants';
import { CATALOG, findCategory, matchCatalog, normalize } from '@/lib/catalog';
import { fkm, mapsLink, yen } from '@/lib/util';
import { Price } from './ui';

const norm = (s) => String(s || '').normalize('NFKC').toLowerCase();
const SECTIONS_STEP = 6; // quantos subtítulos carregar por vez na visão de categoria

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
        <circle key={s.id} cx={cx + s.dx * sc} cy={cy - s.dy * sc} r="4" fill="var(--navy)" stroke="var(--snow)" strokeWidth="1">
          <title>{`${s.name} · ${fkm(s.distance_km)}`}</title>
        </circle>
      ))}
      <circle cx={cx} cy={cy} r="4" fill="var(--hot)" />
    </svg>
  );
}

function MiniItem({ i }) {
  return (
    <a className="mini" href={i.url} target="_blank" rel="noopener noreferrer">
      {i.image ? <img src={i.image} alt="" loading="lazy" /> : <div className="ph" />}
      <span className="nm">{i.name}</span>
      <span className="pr num">{yen(i.price)}</span>
    </a>
  );
}

export default function SearchTab({ loc, radius, isStudent, onShareStore, onAddFind }) {
  const [q, setQ] = useState('');
  const [lastQ, setLastQ] = useState('');
  const [mode, setMode] = useState('idle'); // idle | list | cat
  const [catKey, setCatKey] = useState(null);
  const [subLabel, setSubLabel] = useState(null);
  const [items, setItems] = useState([]);
  const [used, setUsed] = useState('');
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState({}); // subtítulo → { state, items }
  const [visible, setVisible] = useState(SECTIONS_STEP);
  const [sort, setSort] = useState('preco');
  const [minPrice, setMinPrice] = useState('');

  const [storeType, setStoreType] = useState(STORE_TYPES[0].key);
  const [storeInput, setStoreInput] = useState('');
  const [storeQuery, setStoreQuery] = useState(''); // busca livre aplicada (vazio = usa o tipo)
  const [storeUsed, setStoreUsed] = useState('');
  const [gStores, setGStores] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [studentStores, setStudentStores] = useState([]);
  const [storesState, setStoresState] = useState('idle');
  const [studentOffers, setStudentOffers] = useState([]);
  const [studentFinds, setStudentFinds] = useState([]);
  const cache = useRef(new Map()); // guarda resultados só enquanto a página está aberta
  const searchSeq = useRef(0);
  const loaded = useRef(new Set()); // subtítulos já pedidos na categoria aberta
  const [catRun, setCatRun] = useState(0); // muda a cada vez que uma categoria é aberta
  const catRunRef = useRef(0);
  catRunRef.current = catRun;

  const cat = catKey ? findCategory(catKey) : null;

  async function fetchList(params, label) {
    const seq = ++searchSeq.current;
    setMode('list');
    setLastQ(label);
    setLoading(true);
    setItems([]);
    try {
      const res = await fetch('/api/search?' + new URLSearchParams(params));
      const data = await res.json();
      if (seq !== searchSeq.current) return;
      setItems(data.items || []);
      setUsed(data.used || '');
      setErrors(data.errors || []);
    } catch {
      if (seq !== searchSeq.current) return;
      setItems([]);
      setErrors(['rakuten']);
    }
    setLoading(false);
  }

  function openCategory(c) {
    ++searchSeq.current;
    setCatKey(c.key);
    setSubLabel(null);
    setMode('cat');
    setLastQ(c.label);
    setGroups({});
    loaded.current = new Set();
    setCatRun((n) => n + 1);
    setVisible(SECTIONS_STEP);
    setLoading(false);
    setStoreInput(c.label);
  }

  function openSub(c, s, typed) {
    setCatKey(c.key);
    setSubLabel(s.label);
    if (!typed) setQ(s.label);
    setStoreInput(s.label);
    fetchList({ q: s.label, kw: s.kw }, s.label);
  }

  function runSearch(term) {
    const t = (term ?? q).trim();
    if (t.length < 2) return;
    setQ(t);
    const m = matchCatalog(t);
    if (m?.sub) return openSub(m.cat, m.sub, true);
    if (m?.cat) return openCategory(m.cat);
    setCatKey(null);
    setSubLabel(null);
    setStoreInput(t);
    fetchList({ q: t }, t);
  }

  // Visão de categoria: carrega os subtítulos um por vez (o Rakuten não gosta de muitas buscas juntas)
  useEffect(() => {
    if (mode !== 'cat' || !cat) return;
    let alive = true;
    const run = catRun;
    (async () => {
      for (const s of cat.subs.slice(0, visible)) {
        if (!alive) return;
        if (loaded.current.has(s.label)) continue;
        loaded.current.add(s.label);
        setGroups((g) => ({ ...g, [s.label]: { state: 'loading', items: [] } }));
        let next;
        try {
          const res = await fetch('/api/search?' + new URLSearchParams({ q: s.label, kw: s.kw, hits: '12' }));
          const data = await res.json();
          const list = (data.items || []).sort((a, b) => a.price - b.price);
          next = { state: data.errors?.length && !list.length ? 'error' : 'done', items: list };
        } catch {
          next = { state: 'error', items: [] };
        }
        if (run !== catRunRef.current) return; // outra categoria foi aberta
        setGroups((g) => ({ ...g, [s.label]: next }));
      }
    })();
    return () => { alive = false; };
  }, [mode, catKey, visible, catRun]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ofertas dos alunos que combinam com a busca
  useEffect(() => {
    if (!isStudent || !supabase || !lastQ) { setStudentOffers([]); setStudentFinds([]); return; }
    let alive = true;
    const words = norm(lastQ).split(/\s+/).filter((w) => w.length > 1);
    const catName = cat ? cat.label : '';
    const match = (s) => words.some((w) => norm(s).includes(w));
    Promise.all([
      supabase.rpc('feed_offers', { p_lat: loc.lat, p_lng: loc.lng, p_radius_km: radius, p_category: null }),
      supabase.rpc('finds_feed', { p_lat: loc.lat, p_lng: loc.lng, p_radius_km: radius, p_kind: 'produto', p_category: null }),
    ]).then(([o, f]) => {
      if (!alive) return;
      setStudentOffers((o.data || []).filter((x) => match(x.product + ' ' + x.store_name + ' ' + x.category + ' ' + catName)));
      setStudentFinds((f.data || []).filter((x) => match(x.title + ' ' + x.note + ' ' + x.category + ' ' + catName)));
    });
    return () => { alive = false; };
  }, [isStudent, lastQ, catKey, loc.lat, loc.lng, radius]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lojas cadastradas pelos alunos (Achados)
  useEffect(() => {
    if (!isStudent || !supabase || radius <= 0) { setStudentStores([]); return; }
    const cat = storeQuery ? null : (STORE_TYPES.find((t) => t.key === storeType)?.category || null);
    const words = storeQuery ? normalize(storeQuery).split(' ').filter((w) => w.length > 1) : [];
    let alive = true;
    supabase.rpc('finds_feed', { p_lat: loc.lat, p_lng: loc.lng, p_radius_km: radius, p_kind: 'loja', p_category: cat })
      .then(({ data }) => alive && setStudentStores((data || [])
        .filter((f) => f.lat != null && f.distance_km != null)
        .filter((f) => !words.length || words.some((w) => normalize(`${f.title} ${f.note} ${f.category}`).includes(w)))
        .map((f) => ({
          id: 'f-' + f.id, name: f.title, address: f.address || f.place_label, genre: '', lat: f.lat, lng: f.lng,
          distance_km: f.distance_km, source: 'aluno', author: f.author_name,
        }))));
    return () => { alive = false; };
  }, [isStudent, loc.lat, loc.lng, radius, storeType, storeQuery]);

  const storeKey = `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)},${radius},${storeQuery ? 'q:' + storeQuery : storeType}`;
  const storeParams = () => `/api/stores?lat=${loc.lat}&lng=${loc.lng}&radius=${radius}` +
    (storeQuery ? `&q=${encodeURIComponent(storeQuery)}` : `&type=${encodeURIComponent(storeType)}`);

  // Lojas físicas no raio (Google Maps)
  useEffect(() => {
    if (radius <= 0) { setGStores([]); setNextPage(null); setStoresState('idle'); return; }
    const hit = cache.current.get(storeKey);
    if (hit) { setGStores(hit.stores); setNextPage(hit.next); setStoreUsed(hit.used || ''); setStoresState('done'); return; }
    let alive = true;
    setStoresState('loading');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(storeParams());
        const data = await res.json();
        if (!alive) return;
        setGStores(data.stores || []);
        setNextPage(data.next || null);
        setStoreUsed(data.used || '');
        setStoresState(data.error ? data.error : 'done');
        if (!data.error) cache.current.set(storeKey, { stores: data.stores || [], next: data.next || null, used: data.used || '' });
      } catch {
        if (alive) setStoresState('unavailable');
      }
    }, 800);
    return () => { alive = false; clearTimeout(t); };
  }, [storeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMoreStores() {
    if (!nextPage) return;
    const res = await fetch(storeParams() + `&page=${encodeURIComponent(nextPage)}`);
    const data = await res.json();
    const ids = new Set(gStores.map((s) => s.id));
    const merged = [...gStores, ...(data.stores || []).filter((s) => !ids.has(s.id))];
    setGStores(merged);
    setNextPage(data.next || null);
    cache.current.set(storeKey, { stores: merged, next: data.next || null, used: storeUsed });
  }

  function searchStores(e) {
    e.preventDefault();
    const t = storeInput.trim();
    setStoreQuery(t.length >= 2 ? t : '');
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
  const typeLabel = STORE_TYPES.find((t) => t.key === storeType)?.label || '';

  return (
    <div className="sgrid">
      <div style={{ minWidth: 0 }}>
        <form className="sbox" onSubmit={(e) => { e.preventDefault(); runSearch(); }}>
          <input id="q" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: maquiagem, carrinho de brinquedo, ポケモンカード" aria-label="Buscar produto ou categoria" />
          <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Buscando…' : 'Buscar'}</button>
        </form>

        <div className="eyebrow" style={{ marginTop: 12 }}>Categorias</div>
        <div className="chips scroll" style={{ marginTop: 6 }}>
          {CATALOG.map((c) => (
            <button key={c.key} className="chip" type="button" aria-pressed={catKey === c.key} onClick={() => { setQ(c.label); openCategory(c); }}>{c.label}</button>
          ))}
        </div>

        {cat ? (
          <div className="subcats">
            <div className="eyebrow">{cat.label}</div>
            <div className="chips scroll" style={{ marginTop: 6 }}>
              <button className="chip" type="button" aria-pressed={mode === 'cat'} onClick={() => { setQ(cat.label); openCategory(cat); }}>Ver tudo</button>
              {cat.subs.map((s) => (
                <button key={s.label} className="chip" type="button" aria-pressed={mode === 'list' && subLabel === s.label} onClick={() => openSub(cat, s)}>{s.label}</button>
              ))}
            </div>
          </div>
        ) : null}

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
            <h2>{mode === 'cat' && cat ? `Lojas online · ${cat.label}` : 'Lojas online'}</h2>
            {mode === 'list' && items.length ? (
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

          {mode === 'idle' ? (
            <div className="empty" style={{ marginTop: 8 }}>Escreva o que procura (pode ser em português, como “maquiagem” ou “carrinho de brinquedo”) ou toque numa categoria.</div>
          ) : mode === 'cat' && cat ? (
            <>
              {cat.subs.slice(0, visible).map((s) => {
                const g = groups[s.label];
                return (
                  <div key={s.label} className="subsect">
                    <div className="subhead">
                      <h3>{s.label}</h3>
                      <button type="button" className="btn small ghost" onClick={() => openSub(cat, s)}>Ver todos</button>
                    </div>
                    {!g || g.state === 'loading' ? (
                      <p className="small muted" style={{ margin: '6px 0 0' }}>Carregando…</p>
                    ) : g.items.length ? (
                      <div className="grid4">{g.items.slice(0, 8).map((i, idx) => <MiniItem key={i.url + idx} i={i} />)}</div>
                    ) : (
                      <p className="small muted" style={{ margin: '6px 0 0' }}>{g.state === 'error' ? 'Não foi possível carregar agora.' : 'Nada encontrado.'}</p>
                    )}
                  </div>
                );
              })}
              {visible < cat.subs.length ? (
                <button type="button" className="btn small" style={{ marginTop: 14 }} onClick={() => setVisible((v) => v + SECTIONS_STEP)}>
                  Mostrar mais subcategorias ({cat.subs.length - visible})
                </button>
              ) : null}
            </>
          ) : (
            <>
              {used && used !== lastQ && !loading ? <p className="small muted" style={{ margin: '4px 0 0' }}>Buscando no Rakuten como <b lang="ja">{used}</b></p> : null}
              {errors.length ? <p className="small" style={{ color: 'var(--warn)' }}>Não foi possível consultar {errors.map((e) => (e === 'yahoo' ? 'Yahoo' : 'Rakuten')).join(' e ')} agora.</p> : null}
              {loading ? (
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
                <div className="empty" style={{ marginTop: 8 }}>Nada encontrado para “{lastQ}”. Tente outra palavra, escolha uma categoria ou baixe o preço mínimo.</div>
              )}
            </>
          )}
        </section>

        <section className="sect">
          <div className="row between">
            <h2>Lojas físicas em até {radius} km</h2>
            <span className="small muted num">{storesState === 'done' ? `${stores.length} loja${stores.length === 1 ? '' : 's'}` : ''}</span>
          </div>
          <form className="sbox" style={{ marginTop: 8 }} onSubmit={searchStores}>
            <input type="text" value={storeInput} onChange={(e) => setStoreInput(e.target.value)} placeholder="Que loja ou produto? Ex.: maquiagem, Pokémon Center, ブックオフ" aria-label="Buscar lojas físicas" />
            <button className="btn" type="submit">Buscar lojas</button>
          </form>
          <div className="chips" style={{ marginTop: 8 }}>
            {STORE_TYPES.map((t) => (
              <button key={t.key} type="button" className="chip" aria-pressed={!storeQuery && storeType === t.key} onClick={() => { setStoreQuery(''); setStoreType(t.key); }}>{t.label}</button>
            ))}
          </div>
          {storeQuery ? <p className="small muted" style={{ margin: '6px 0 0' }}>Lojas para “{storeQuery}”{storeUsed && storeUsed !== storeQuery ? <> (no mapa: <span lang="ja">{storeUsed}</span>)</> : null}</p> : null}
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
                <div className="empty" style={{ marginTop: 8 }}>Nenhuma loja {storeQuery ? `para “${storeQuery}”` : `de ${typeLabel.toLowerCase()}`} dentro de {radius} km.</div>
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
        {mode === 'list' && shown.length ? <p className="small" style={{ margin: '8px 0 0' }}>Menor preço online: <b className="num">{yen(cheapest.price)}</b></p> : null}
      </aside>
    </div>
  );
}
