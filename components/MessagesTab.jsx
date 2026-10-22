'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ago, compressImage, feeText, firstName } from '@/lib/util';
import { Avatar } from './ui';
import PhotoPicker, { imageFromPaste } from './PhotoPicker';

const MSG_COLS = 'id, sender_id, body, image_path, created_at';

export default function MessagesTab({ userId, threads, selectedId, onSelect, onChanged, notify }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [photos, setPhotos] = useState({});
  const boxRef = useRef(null);
  const fileRef = useRef(null);
  const t = threads.find((x) => x.id === selectedId) || threads[0] || null;

  // Gera links temporários para as fotos do chat
  useEffect(() => {
    const missing = msgs.map((m) => m.image_path).filter((p) => p && !photos[p]);
    if (!missing.length) return;
    supabase.storage.from('chat-photos').createSignedUrls(missing, 3600).then(({ data }) => {
      const add = {};
      (data || []).forEach((s) => { if (s.signedUrl) add[s.path] = s.signedUrl; });
      setPhotos((p) => ({ ...p, ...add }));
    });
  }, [msgs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!t) { setMsgs([]); return; }
    let alive = true;
    supabase.from('messages').select(MSG_COLS).eq('thread_id', t.id).order('created_at')
      .then(({ data }) => alive && setMsgs(data || []));
    const ch = supabase.channel('thread-' + t.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${t.id}` }, (payload) => {
        setMsgs((m) => (m.some((x) => x.id === payload.new.id) ? m : [...m, payload.new]));
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [t?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, [msgs]);

  async function respond(accept) {
    const { error } = await supabase.rpc('respond_request', { p_thread: t.id, p_accept: accept });
    if (error) { notify('Não foi possível responder.'); return; }
    notify(accept ? 'Solicitação aceita' : 'Solicitação recusada');
    onChanged();
  }
  async function post(body, imagePath) {
    const { data, error } = await supabase.from('messages')
      .insert({ thread_id: t.id, body, image_path: imagePath }).select(MSG_COLS).single();
    if (error) { notify('Mensagem não enviada.'); return false; }
    setMsgs((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]));
    onChanged();
    return true;
  }
  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    if (await post(body, null)) setText('');
    setSending(false);
  }
  async function sendPhoto(file) {
    if (!file) return;
    setSending(true);
    try {
      const blob = await compressImage(file);
      const path = `${t.id}/${userId}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('chat-photos').upload(path, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      if (await post(text.trim(), path)) setText('');
    } catch {
      notify('A foto não foi enviada. Tente de novo.');
    }
    setSending(false);
    if (fileRef.current) fileRef.current.value = '';
  }
  async function report() {
    const { error } = await supabase.rpc('report', { p_target_user: t.other_id, p_offer: null, p_thread: t.id, p_reason: 'Denúncia pela conversa' });
    notify(error ? 'Não foi possível enviar a denúncia.' : 'Denúncia enviada. O administrador vai analisar.');
  }

  const groups = [
    ['in', 'Solicitações recebidas', threads.filter((x) => x.status === 'pending' && x.incoming)],
    ['act', 'Conversas', threads.filter((x) => x.status === 'accepted')],
    ['out', 'Enviadas, aguardando', threads.filter((x) => x.status === 'pending' && !x.incoming)],
    ['dec', 'Recusadas', threads.filter((x) => x.status === 'declined')],
  ];

  return (
    <div>
      <p className="small muted" style={{ margin: '0 0 12px' }}>Acordos de compra e pagamento são feitos diretamente entre os alunos. O SnagMap não intermedia dinheiro.</p>
      <div className="mgrid">
        <div className="mlist">
          {threads.length === 0 ? <div className="empty">Nenhuma conversa ainda. Encontre parceiros na aba Comunidade.</div> : null}
          {groups.map(([k, label, ts]) => ts.length ? (
            <div key={k}>
              <h3>{label}</h3>
              {ts.map((x) => (
                <button key={x.id} type="button" className="th" aria-current={t?.id === x.id} onClick={() => onSelect(x.id)}>
                  <Avatar name={x.other_name} />
                  <div className="t"><b>{x.other_name || 'Aluno'}</b><span>{x.last_from_me ? 'Você: ' : ''}{x.last_body || ''}</span></div>
                  {k === 'in' ? <span className="badge">novo</span> : null}
                </button>
              ))}
            </div>
          ) : null)}
        </div>

        {t ? (
          <div className="chat">
            <div className="chathead">
              <Avatar name={t.other_name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{t.other_name || 'Aluno'}</b>
                <div className="small muted">{t.other_prefecture || '—'} · {(t.other_categories || []).join(', ')}</div>
              </div>
              {t.other_buys ? <span className="pill brand">Compra para outros: {feeText({ fee_type: t.other_fee_type, fee_value: t.other_fee_value })}</span> : null}
              <button type="button" className="btn ghost small" onClick={report}>Denunciar</button>
            </div>
            <div className="msgs" ref={boxRef}>
              {msgs.map((m) => (
                <div key={m.id} className={'bub' + (m.sender_id === userId ? ' me' : '')}>
                  {m.image_path ? (
                    photos[m.image_path]
                      ? <a href={photos[m.image_path]} target="_blank" rel="noopener noreferrer"><img className="chatimg" src={photos[m.image_path]} alt="Foto enviada na conversa" loading="lazy" /></a>
                      : <div className="chatimg ph">Carregando foto…</div>
                  ) : null}
                  {m.body}
                  <time>{ago(m.created_at)}</time>
                </div>
              ))}
            </div>
            {t.status === 'pending' && t.incoming ? (
              <div className="reqbox">
                <p className="small" style={{ margin: 0 }}><b>{firstName(t.other_name)}</b> quer conversar com você. Se aceitar, vocês trocam mensagens aqui.</p>
                <div className="row">
                  <button type="button" className="btn primary" onClick={() => respond(true)}>Aceitar</button>
                  <button type="button" className="btn" onClick={() => respond(false)}>Recusar</button>
                </div>
              </div>
            ) : t.status === 'pending' ? (
              <div className="reqbox"><p className="small muted" style={{ margin: 0 }}>Solicitação enviada. Você poderá conversar quando {firstName(t.other_name)} aceitar.</p></div>
            ) : t.status === 'declined' ? (
              <div className="reqbox"><p className="small muted" style={{ margin: 0 }}>{firstName(t.other_name)} não aceitou a conversa.</p></div>
            ) : (
              <form className="chatin" onSubmit={send}>
                <PhotoPicker compact onPick={sendPhoto} disabled={sending} />
                <input id="chatmsg" type="text" value={text} onChange={(e) => setText(e.target.value)}
                  onPaste={(e) => { const f = imageFromPaste(e); if (f) { e.preventDefault(); sendPhoto(f); } }} placeholder="Escreva uma mensagem" aria-label="Mensagem" autoComplete="off" maxLength={2000} />
                <button className="btn primary" type="submit" disabled={sending}>Enviar</button>
              </form>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
