'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { ago, compressImage, firstName } from '@/lib/util';
import { Avatar } from './ui';

export default function Wall({ userId, isAdmin, myProfile, onTalk, notify }) {
  const [cat, setCat] = useState('Todas');
  const [posts, setPosts] = useState(null);
  const [more, setMore] = useState(false);
  const [photos, setPhotos] = useState({});
  const [body, setBody] = useState('');
  const [postCat, setPostCat] = useState((myProfile?.categories || [])[0] || 'Cartas');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const sign = useCallback(async (list) => {
    const paths = list.map((p) => p.image_path).filter(Boolean);
    if (!paths.length) return;
    const { data } = await supabase.storage.from('community-photos').createSignedUrls(paths, 3600);
    const add = {};
    (data || []).forEach((s) => { if (s.signedUrl) add[s.path] = s.signedUrl; });
    setPhotos((p) => ({ ...p, ...add }));
  }, []);

  const load = useCallback(async (before) => {
    const { data, error } = await supabase.rpc('community_feed', { p_category: cat === 'Todas' ? null : cat, p_before: before || null });
    if (error) { notify('Não foi possível carregar o mural.'); setPosts((p) => p || []); return; }
    setPosts((p) => (before ? [...(p || []), ...(data || [])] : data || []));
    setMore((data || []).length === 50);
    sign(data || []);
  }, [cat, notify, sign]);
  useEffect(() => { load(null); }, [load]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function pick(f) {
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : '');
  }

  async function publish(e) {
    e.preventDefault();
    if (!body.trim() && !file) { notify('Escreva algo ou escolha uma foto.'); return; }
    setBusy(true);
    try {
      let path = null;
      if (file) {
        const blob = await compressImage(file);
        path = `${userId}/${Date.now()}.jpg`;
        const { error } = await supabase.storage.from('community-photos').upload(path, blob, { contentType: 'image/jpeg' });
        if (error) throw error;
      }
      const { error } = await supabase.from('community_posts').insert({ category: postCat, body: body.trim(), image_path: path });
      if (error) throw error;
      setBody('');
      pick(null);
      if (fileRef.current) fileRef.current.value = '';
      notify('Publicado no mural');
      load(null);
    } catch {
      notify('Não foi possível publicar. Tente de novo.');
    }
    setBusy(false);
  }

  async function remove(p) {
    const { error } = await supabase.from('community_posts').delete().eq('id', p.id);
    if (error) { notify('Não foi possível apagar.'); return; }
    if (p.image_path && p.author_id === userId) await supabase.storage.from('community-photos').remove([p.image_path]);
    setPosts((list) => list.filter((x) => x.id !== p.id));
    notify('Post apagado');
  }
  async function report(p) {
    const { error } = await supabase.rpc('report', { p_target_user: p.author_id, p_offer: null, p_thread: null, p_reason: 'Post do mural denunciado', p_post: p.id });
    notify(error ? 'Não foi possível enviar a denúncia.' : 'Denúncia enviada. O administrador vai analisar.');
  }

  return (
    <div>
      <form className="card stack" onSubmit={publish} style={{ marginTop: 12 }}>
        <label className="field-l" htmlFor="wall-body">Compartilhe com os alunos
          <textarea id="wall-body" value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)}
            placeholder="Mostre suas compras, peça dicas ou procure parceiros. Ex: Alguém vai em Akihabara sábado? Divido o frete." />
        </label>
        {preview ? <img className="photo" src={preview} alt="Prévia da foto" /> : null}
        <div className="row between">
          <div className="row">
            <input ref={fileRef} id="wall-file" type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>{file ? 'Trocar foto' : 'Adicionar foto'}</button>
            {file ? <button type="button" className="btn ghost small" onClick={() => { pick(null); if (fileRef.current) fileRef.current.value = ''; }}>Remover foto</button> : null}
            <select className="field" style={{ width: 'auto' }} value={postCat} onChange={(e) => setPostCat(e.target.value)} aria-label="Categoria do post">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Publicando…' : 'Publicar'}</button>
        </div>
      </form>

      <div className="chips" style={{ marginTop: 14 }}>
        {['Todas', ...CATEGORIES].map((c) => <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>

      <div className="feed">
        {posts === null ? <div className="empty">Carregando mural…</div> : posts.length === 0 ? (
          <div className="empty">Nenhum post ainda. Publique o primeiro.</div>
        ) : posts.map((p) => {
          const mine = p.author_id === userId;
          return (
            <article key={p.id} className="post">
              <div className="who">
                <Avatar name={p.author_name} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b>{p.author_name || 'Aluno'}</b> <span className="small muted">· {p.author_prefecture || '—'} · {ago(p.created_at)}</span>
                </div>
                <span className="pill">{p.category}</span>
              </div>
              {p.body ? <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{p.body}</div> : null}
              {p.image_path ? (
                photos[p.image_path]
                  ? <a href={photos[p.image_path]} target="_blank" rel="noopener noreferrer"><img className="wallimg" src={photos[p.image_path]} alt={`Foto publicada por ${p.author_name || 'aluno'}`} loading="lazy" /></a>
                  : <div className="wallimg ph">Carregando foto…</div>
              ) : null}
              <div className="row">
                {!mine && p.author_visible ? <button type="button" className="btn ghost small" onClick={() => onTalk(p.author_id, p.author_name)}>Falar com {firstName(p.author_name)}</button> : null}
                {!mine ? <button type="button" className="btn ghost small" onClick={() => report(p)}>Denunciar</button> : null}
                {mine || isAdmin ? <button type="button" className="btn ghost small danger" onClick={() => remove(p)}>Apagar</button> : null}
              </div>
            </article>
          );
        })}
        {more ? <button type="button" className="btn" onClick={() => load(posts[posts.length - 1].created_at)}>Ver posts mais antigos</button> : null}
      </div>
    </div>
  );
}
