'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { ago, firstName, fkm, mapsLink, yen } from '@/lib/util';
import { Avatar } from './ui';

export default function FindsTab({ loc, radius, userId, isAdmin, notify, onAdd, onTalk, reloadKey }) {
  const [kind, setKind] = useState('todos');
  const [cat, setCat] = useState('Todas');
  const [finds, setFinds] = useState(null);
  const [photos, setPhotos] = useState({});

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('finds_feed', {
      p_lat: loc.lat, p_lng: loc.lng, p_radius_km: radius,
      p_kind: kind === 'todos' ? null : kind, p_category: cat === 'Todas' ? null : cat,
    });
    if (error) { notify('Não foi possível carregar os achados.'); setFinds([]); return; }
    setFinds(data || []);
    const paths = (data || []).map((f) => f.image_path).filter(Boolean);
    if (paths.length) {
      const { data: signed } = await supabase.storage.from('find-photos').createSignedUrls(paths, 3600);
      const map = {};
      (signed || []).forEach((s) => { if (s.signedUrl) map[s.path] = s.signedUrl; });
      setPhotos(map);
    }
  }, [loc.lat, loc.lng, radius, kind, cat, notify]);
  useEffect(() => { load(); }, [load, reloadKey]);

  async function like(f) {
    const { error } = await supabase.rpc('like_find', { p_find: f.id });
    if (error) { notify('Não foi possível marcar.'); return; }
    setFinds((list) => list.map((x) => (x.id === f.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x)));
  }
  async function remove(f) {
    const { error } = await supabase.from('finds').delete().eq('id', f.id);
    if (error) { notify('Não foi possível apagar.'); return; }
    if (f.image_path && f.author_id === userId) await supabase.storage.from('find-photos').remove([f.image_path]);
    setFinds((list) => list.filter((x) => x.id !== f.id));
    notify('Achado apagado');
  }
  async function report(f) {
    const { error } = await supabase.rpc('report', { p_target_user: f.author_id, p_offer: null, p_thread: null, p_reason: 'Achado denunciado', p_post: null, p_find: f.id });
    notify(error ? 'Não foi possível enviar a denúncia.' : 'Denúncia enviada. O administrador vai analisar.');
  }

  return (
    <div>
      <div className="row between">
        <div>
          <h2 className="h2">Achados</h2>
          <p className="small muted" style={{ margin: '2px 0 0' }}>Lojas e produtos novos que os alunos encontraram. Lojas aparecem num raio de {radius} km de {loc.label}; produtos aparecem para todos.</p>
        </div>
        <div className="row">
          <button className="btn" type="button" onClick={() => onAdd('produto')}>+ Produto</button>
          <button className="btn primary" type="button" onClick={() => onAdd('loja')}>+ Loja</button>
        </div>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <div className="seg" role="group" aria-label="Tipo">
          {[['todos', 'Tudo'], ['loja', 'Lojas'], ['produto', 'Produtos']].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="chips" style={{ marginTop: 10 }}>
        {['Todas', ...CATEGORIES].map((c) => <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>

      <div className="feed">
        {finds === null ? <div className="empty">Carregando achados…</div> : finds.length === 0 ? (
          <div className="empty">Nenhum achado por aqui ainda. Adicione a primeira loja ou produto.</div>
        ) : finds.map((f) => {
          const mine = f.author_id === userId;
          return (
            <article key={f.id} className="post">
              <div className="who">
                <Avatar name={f.author_name} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b>{f.author_name || 'Aluno'}</b> <span className="small muted">· {f.author_prefecture || '—'} · {ago(f.created_at)}</span>
                </div>
                <span className={'pill ' + (f.kind === 'loja' ? 'brand' : 'ok')}>{f.kind === 'loja' ? 'Loja' : 'Produto novo'}</span>
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--body)', fontSize: 16 }}>{f.title}</h3>
                <div className="meta">
                  <span className="pill">{f.category}</span>
                  {f.distance_km != null ? <span className="pill brand num">{fkm(f.distance_km)}</span> : null}
                  {f.price ? <span className="pill warn num">{yen(f.price)}</span> : null}
                  {f.address ? <span className="small muted">{f.address}</span> : null}
                  {f.kind === 'produto' && f.place_label ? <span className="small muted">Visto em {f.place_label}</span> : null}
                </div>
              </div>
              {f.note ? <div className="note">{f.note}</div> : null}
              {f.image_path && photos[f.image_path] ? (
                <a href={photos[f.image_path]} target="_blank" rel="noopener noreferrer"><img className="wallimg" src={photos[f.image_path]} alt={`Foto de ${f.title}`} loading="lazy" /></a>
              ) : null}
              <div className="row">
                <button type="button" className={'vote ok' + (f.liked ? ' on' : '')} onClick={() => like(f)} disabled={mine}>✓ Útil <span className="num">{f.likes}</span></button>
                {f.kind === 'loja' && f.lat != null ? <a className="btn ghost small" href={mapsLink(f.lat, f.lng)} target="_blank" rel="noopener noreferrer">Mapa</a> : null}
                {!mine && f.author_visible ? <button type="button" className="btn ghost small" onClick={() => onTalk(f.author_id, f.author_name)}>Falar com {firstName(f.author_name)}</button> : null}
                {!mine ? <button type="button" className="btn ghost small" onClick={() => report(f)}>Denunciar</button> : null}
                {mine || isAdmin ? <button type="button" className="btn ghost small danger" onClick={() => remove(f)}>Apagar</button> : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
