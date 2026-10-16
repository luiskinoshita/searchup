'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { ago, firstName, fkm, until } from '@/lib/util';
import { Avatar, Price, PriceTag } from './ui';

export default function OffersTab({ loc, radius, userId, isAdmin, notify, onNewOffer, onTalk, reloadKey }) {
  const [cat, setCat] = useState('Todas');
  const [offers, setOffers] = useState(null);
  const [pending, setPending] = useState(null);
  const [photos, setPhotos] = useState({});

  const load = useCallback(async () => {
    const [{ data, error }, pend] = await Promise.all([
      supabase.rpc('feed_offers', { p_lat: loc.lat, p_lng: loc.lng, p_radius_km: radius, p_category: cat === 'Todas' ? null : cat }),
      supabase.rpc('pending_offers', { p_lat: loc.lat, p_lng: loc.lng, p_radius_km: radius }),
    ]);
    if (error) { notify('Não foi possível carregar as ofertas.'); setOffers([]); return; }
    setOffers(data || []);
    setPending(pend.data?.[0] || null);
    const paths = (data || []).map((o) => o.photo_path).filter(Boolean);
    if (paths.length) {
      const { data: signed } = await supabase.storage.from('offer-photos').createSignedUrls(paths, 3600);
      const map = {};
      (signed || []).forEach((s) => { if (s.signedUrl) map[s.path] = s.signedUrl; });
      setPhotos(map);
    }
  }, [loc.lat, loc.lng, radius, cat, notify]);

  useEffect(() => { load(); }, [load, reloadKey]);

  async function vote(id, v) {
    const { error } = await supabase.rpc('vote_offer', { p_offer: id, p_vote: v });
    if (error) notify('Não foi possível registrar o voto.');
    load();
  }
  async function remove(o) {
    const { error } = await supabase.from('offers').delete().eq('id', o.id);
    if (error) { notify('Não foi possível apagar.'); return; }
    if (o.photo_path) await supabase.storage.from('offer-photos').remove([o.photo_path]);
    notify('Oferta apagada');
    load();
  }
  async function report(o) {
    const { error } = await supabase.rpc('report', { p_target_user: o.author_id, p_offer: o.id, p_thread: null, p_reason: 'Oferta denunciada pelo feed' });
    notify(error ? 'Não foi possível enviar a denúncia.' : 'Denúncia enviada. O administrador vai analisar.');
  }

  const now = Date.now();
  return (
    <div>
      <div className="row between">
        <div>
          <h2 className="h2">Ofertas dos alunos</h2>
          <p className="small muted" style={{ margin: '2px 0 0' }}>Compartilhadas em até {radius} km de {loc.label}. Cada oferta expira sozinha.</p>
        </div>
        <button className="btn primary" type="button" onClick={() => onNewOffer(null)}>+ Publicar oferta</button>
      </div>
      <div className="chips" style={{ marginTop: 12 }}>
        {['Todas', ...CATEGORIES].map((c) => <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>

      <div className="feed">
        {pending && pending.total > 0 ? (
          <div className="notice">
            <b className="num">{pending.total}</b> oferta{pending.total > 1 ? 's' : ''} de {(pending.categories || []).join(', ')} {pending.total > 1 ? 'serão liberadas' : 'será liberada'} em breve. O autor aproveita primeiro e compartilha depois (próxima em {until(pending.next_release)}).
          </div>
        ) : null}

        {offers === null ? <div className="empty">Carregando ofertas…</div> : offers.length === 0 ? (
          <div className="empty">Nenhuma oferta compartilhada nesse raio ainda. Aumente a distância ou publique a primeira.</div>
        ) : offers.map((o) => {
          const mine = o.author_id === userId;
          const notYet = new Date(o.release_at).getTime() > now;
          const dead = o.votes_no >= o.votes_ok + 2;
          return (
            <article key={o.id} className={'post' + (dead ? ' gone' : '')}>
              <div className="who">
                <Avatar name={o.author_name} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b>{o.author_name || 'Aluno'}</b> <span className="small muted">· {o.author_prefecture || '—'} · {ago(o.created_at)}</span>
                </div>
                <div className="row">
                  {mine && notYet ? <span className="pill warn">Sua oferta · liberada em {until(o.release_at)}</span> : null}
                  {mine && !notYet ? <span className="pill brand">Sua oferta</span> : null}
                  {dead ? <span className="pill hot">Provavelmente acabou</span> : o.votes_ok >= 3 ? <span className="pill ok">Confirmada por {o.votes_ok} alunos</span> : null}
                </div>
              </div>
              <div className="postbody">
                <PriceTag price={o.price} was={o.regular_price} />
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontFamily: 'var(--body)', fontSize: 15 }}>{o.product}</h3>
                  <div className="meta">
                    <span className="small muted">{o.store_name}</span>
                    <span className="pill brand num">{fkm(o.distance_km)}</span>
                    <span className="pill">{o.category}</span>
                    <span className="pill">Expira em {until(o.expires_at)}</span>
                  </div>
                </div>
                <Price price={o.price} was={o.regular_price} />
              </div>
              {o.note ? <div className="note">{o.note}</div> : null}
              {o.photo_path && photos[o.photo_path] ? <img className="photo" src={photos[o.photo_path]} alt={`Foto da etiqueta de ${o.product}`} loading="lazy" /> : null}
              <div className="row">
                {!mine && !notYet ? (
                  <>
                    <span className="small muted">Você passou lá?</span>
                    <button type="button" className={'vote ok' + (o.my_vote === 'ok' ? ' on' : '')} onClick={() => vote(o.id, 'ok')}>✓ Ainda vale <span className="num">{o.votes_ok}</span></button>
                    <button type="button" className={'vote no' + (o.my_vote === 'no' ? ' on' : '')} onClick={() => vote(o.id, 'no')}>✕ Acabou <span className="num">{o.votes_no}</span></button>
                    <button type="button" className="btn ghost small" onClick={() => onTalk(o.author_id, o.author_name)}>Falar com {firstName(o.author_name)}</button>
                    <button type="button" className="btn ghost small" onClick={() => report(o)}>Denunciar</button>
                  </>
                ) : (
                  <span className="small muted">✓ {o.votes_ok} · ✕ {o.votes_no}</span>
                )}
                {mine || isAdmin ? <button type="button" className="btn ghost small danger" onClick={() => remove(o)}>Apagar</button> : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
