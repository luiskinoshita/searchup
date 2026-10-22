'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CATEGORIES, STORE_TYPES } from '@/lib/constants';
import { compressImage, fkm } from '@/lib/util';
import { Modal } from './ui';
import PhotoPicker from './PhotoPicker';

export default function OfferForm({ draft, loc, userId, onClose, onSaved }) {
  const [product, setProduct] = useState(draft?.product || '');
  const [category, setCategory] = useState(draft?.category || 'Cartas');
  const [store, setStore] = useState(draft?.store || null); // {name, lat, lng}
  const [storeName, setStoreName] = useState(draft?.store?.name || '');
  const [price, setPrice] = useState('');
  const [regular, setRegular] = useState('');
  const [note, setNote] = useState('');
  const [delay, setDelay] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [nearby, setNearby] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [nearbyBusy, setNearbyBusy] = useState(false);
  // Busca lojas próximas só quando o aluno pede (cada busca conta na cota do Google)
  async function findNearby() {
    const type = STORE_TYPES.find((t) => t.category === category)?.key || 'Usados';
    setNearbyBusy(true);
    try {
      const [g, s] = await Promise.all([
        fetch(`/api/stores?lat=${loc.lat}&lng=${loc.lng}&radius=10&type=${encodeURIComponent(type)}`).then((r) => r.json()),
        supabase.rpc('finds_feed', { p_lat: loc.lat, p_lng: loc.lng, p_radius_km: 10, p_kind: 'loja', p_category: category }),
      ]);
      const mine = (s.data || []).map((f) => ({ id: 'f-' + f.id, name: f.title, lat: f.lat, lng: f.lng, distance_km: f.distance_km }));
      const list = [...mine, ...(g.stores || [])].sort((a, b) => a.distance_km - b.distance_km);
      setNearby(list);
      if (!list.length) setErr('Nenhuma loja encontrada perto. Escreva o nome da loja.');
    } catch {
      setErr('Não foi possível buscar lojas agora. Escreva o nome da loja.');
    }
    setNearbyBusy(false);
  }

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function pickStore(id) {
    if (!id) { setStore(null); return; }
    const s = nearby.find((x) => String(x.id) === id);
    if (s) { setStore({ name: s.name, lat: s.lat, lng: s.lng }); setStoreName(s.name); }
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    const p = Number(price), r = Number(regular) || 0;
    if (product.trim().length < 2) return setErr('Escreva o nome do produto.');
    if (!storeName.trim()) return setErr('Escreva o nome da loja.');
    if (!p || p < 1) return setErr('Coloque o preço que você viu.');
    setBusy(true);
    let photoPath = null;
    try {
      if (file) {
        const blob = await compressImage(file);
        photoPath = `${userId}/${Date.now()}.jpg`;
        const { error } = await supabase.storage.from('offer-photos').upload(photoPath, blob, { contentType: 'image/jpeg' });
        if (error) throw new Error('A foto não foi enviada: ' + error.message);
      }
      const pos = store || { lat: loc.lat, lng: loc.lng };
      const { error } = await supabase.rpc('create_offer', {
        p_product: product.trim(), p_category: category, p_store_name: storeName.trim(), p_city_label: loc.label,
        p_lat: pos.lat, p_lng: pos.lng, p_price: Math.round(p), p_regular_price: Math.round(r),
        p_note: note.trim(), p_photo_path: photoPath, p_delay_hours: delay,
      });
      if (error) throw new Error(error.message);
      onSaved(delay);
    } catch (ex) {
      setErr(ex.message || 'Não foi possível publicar.');
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} label="Publicar oferta">
      <h2>Publicar oferta</h2>
      <p className="small muted" style={{ margin: 0 }}>Alunos num raio de até 40 km da loja vão ver. A oferta some sozinha depois de 48 horas.</p>
      <form onSubmit={submit} className="stack">
        <label className="field-l" htmlFor="of-p">Produto
          <input id="of-p" type="text" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Ex: Pokémon TCG box (coleção nova)" maxLength={140} />
        </label>
        <label className="field-l" htmlFor="of-c">Categoria
          <select id="of-c" className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        {draft?.store ? (
          <div className="note small">Loja: <b>{draft.store.name}</b>. A localização vem do mapa.</div>
        ) : (
          <>
            {nearby.length ? (
              <label className="field-l" htmlFor="of-near">Escolher loja próxima
                <select id="of-near" className="field" defaultValue="" onChange={(e) => pickStore(e.target.value)}>
                  <option value="">Outra loja (escrever o nome)</option>
                  {nearby.slice(0, 40).map((s) => <option key={s.id} value={String(s.id)}>{s.name} · {fkm(s.distance_km)}</option>)}
                </select>
              </label>
            ) : (
              <button type="button" className="btn small" style={{ justifySelf: 'start' }} onClick={findNearby} disabled={nearbyBusy}>
                {nearbyBusy ? 'Buscando lojas…' : 'Escolher entre lojas próximas'}
              </button>
            )}
            <label className="field-l" htmlFor="of-store">Nome da loja
              <input id="of-store" type="text" value={storeName} onChange={(e) => { setStoreName(e.target.value); if (store && e.target.value !== store.name) setStore(null); }} maxLength={100} />
            </label>
            {!store ? <p className="small muted" style={{ margin: 0 }}>Sem loja do mapa, a oferta usa o ponto de busca atual ({loc.label}) como localização.</p> : null}
          </>
        )}
        <div className="two">
          <label className="field-l" htmlFor="of-price">Preço que você viu (¥)
            <input id="of-price" type="number" min="1" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label className="field-l" htmlFor="of-reg">Preço normal (¥, opcional)
            <input id="of-reg" type="number" min="0" inputMode="numeric" value={regular} onChange={(e) => setRegular(e.target.value)} />
          </label>
        </div>
        <label className="field-l" htmlFor="of-note">Dica para os outros
          <textarea id="of-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Onde fica na loja, limite por pessoa, se é sorteio (抽選)…" />
        </label>
        <div className="field-l">Foto da etiqueta ou do produto (opcional)
          <PhotoPicker hasFile={!!file} onPick={(f) => { setFile(f); setPreview(URL.createObjectURL(f)); }} />
          {file ? <button type="button" className="btn ghost small" style={{ justifySelf: 'start' }} onClick={() => { setFile(null); setPreview(''); }}>Remover foto</button> : null}
        </div>
        {preview ? <img className="photo" src={preview} alt="Prévia da foto" /> : null}
        <div className="field-l">Quando liberar para os outros
          <div className="opts">
            {[[0, 'Agora', 'todos veem já'], [12, 'Em 12 h', 'você aproveita antes'], [24, 'Em 24 h', 'você aproveita antes']].map(([v, l, s]) => (
              <button key={v} type="button" className="opt" aria-pressed={delay === v} onClick={() => setDelay(v)}>{l}<small>{s}</small></button>
            ))}
          </div>
        </div>
        {err ? <p className="err">{err}</p> : null}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Publicando…' : 'Compartilhar'}</button>
        </div>
      </form>
    </Modal>
  );
}
