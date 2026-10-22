'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { compressImage } from '@/lib/util';
import { Modal } from './ui';
import PhotoPicker from './PhotoPicker';

export default function FindForm({ initialKind = 'loja', loc, userId, onClose, onSaved }) {
  const [kind, setKind] = useState(initialKind);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Cartas');
  const [address, setAddress] = useState('');
  const [place, setPlace] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [pos, setPos] = useState({ lat: loc.lat, lng: loc.lng, label: loc.label });
  const [gpsBusy, setGpsBusy] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function gps() {
    if (!navigator.geolocation) { setErr('Seu navegador não informa a localização.'); return; }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude, label: 'onde você está agora' }); setGpsBusy(false); },
      () => { setErr('Não foi possível pegar sua localização.'); setGpsBusy(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (title.trim().length < 2) return setErr(kind === 'loja' ? 'Escreva o nome da loja.' : 'Escreva o nome do produto.');
    setBusy(true);
    try {
      let path = null;
      if (file) {
        const blob = await compressImage(file);
        path = `${userId}/${Date.now()}.jpg`;
        const { error } = await supabase.storage.from('find-photos').upload(path, blob, { contentType: 'image/jpeg' });
        if (error) throw new Error('A foto não foi enviada.');
      }
      const row = {
        kind, title: title.trim(), category, note: note.trim(), image_path: path,
        ...(kind === 'loja'
          ? { address: address.trim(), place_label: pos.label === 'onde você está agora' ? '' : pos.label, lat: pos.lat, lng: pos.lng }
          : { place_label: place.trim(), price: Number(price) > 0 ? Math.round(Number(price)) : null }),
      };
      const { error } = await supabase.from('finds').insert(row);
      if (error) throw new Error('Não foi possível salvar: ' + error.message);
      onSaved(kind);
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} label="Adicionar achado">
      <h2>Adicionar achado</h2>
      <div className="seg" role="group" aria-label="Tipo de achado" style={{ justifySelf: 'start' }}>
        <button type="button" aria-pressed={kind === 'loja'} onClick={() => setKind('loja')}>Loja</button>
        <button type="button" aria-pressed={kind === 'produto'} onClick={() => setKind('produto')}>Produto novo</button>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        {kind === 'loja'
          ? 'Uma loja boa para revenda que não aparece na busca. Os alunos perto dela vão ver.'
          : 'Um lançamento ou produto que vale a pena revender. Todos os alunos veem.'}
      </p>
      <form onSubmit={submit} className="stack">
        <label className="field-l" htmlFor="fd-title">{kind === 'loja' ? 'Nome da loja' : 'Produto'}
          <input id="fd-title" type="text" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === 'loja' ? 'Ex: Card shop no 2º andar do shopping X' : 'Ex: Novo box de One Piece (OP-12)'} />
        </label>
        <label className="field-l" htmlFor="fd-cat">Categoria
          <select id="fd-cat" className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        {kind === 'loja' ? (
          <>
            <label className="field-l" htmlFor="fd-addr">Endereço ou referência
              <input id="fd-addr" type="text" value={address} maxLength={200} onChange={(e) => setAddress(e.target.value)} placeholder="Ex: 名古屋市中区栄3丁目, perto da estação Sakae" />
            </label>
            <div className="note small">
              Localização: <b>{pos.label}</b>.{' '}
              <button type="button" className="btn ghost small" onClick={gps} disabled={gpsBusy}>{gpsBusy ? 'Localizando…' : 'Estou na loja agora'}</button>
            </div>
          </>
        ) : (
          <div className="two">
            <label className="field-l" htmlFor="fd-place">Onde viu (opcional)
              <input id="fd-place" type="text" value={place} maxLength={100} onChange={(e) => setPlace(e.target.value)} placeholder="Ex: Yodobashi Nagoya" />
            </label>
            <label className="field-l" htmlFor="fd-price">Preço (¥, opcional)
              <input id="fd-price" type="number" min="0" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
          </div>
        )}
        <label className="field-l" htmlFor="fd-note">Detalhes
          <textarea id="fd-note" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)}
            placeholder={kind === 'loja' ? 'O que tem de bom, horário, se faz sorteio (抽選)…' : 'Por que vale a pena, data de lançamento, onde vende melhor…'} />
        </label>
        <div className="field-l">Foto (opcional)
          <PhotoPicker hasFile={!!file} onPick={(f) => { setFile(f); setPreview(URL.createObjectURL(f)); }} />
          {file ? <button type="button" className="btn ghost small" style={{ justifySelf: 'start' }} onClick={() => { setFile(null); setPreview(''); }}>Remover foto</button> : null}
        </div>
        {preview ? <img className="photo" src={preview} alt="Prévia da foto" /> : null}
        {err ? <p className="err">{err}</p> : null}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar achado'}</button>
        </div>
      </form>
    </Modal>
  );
}
