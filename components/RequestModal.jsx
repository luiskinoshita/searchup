'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { firstName } from '@/lib/util';
import { Modal } from './ui';

export default function RequestModal({ target, myProfile, onClose, onSent }) {
  const fn = firstName(target.name);
  const common = (target.categories || []).filter((c) => (myProfile?.categories || []).includes(c));
  const initial = common.length
    ? `Oi ${fn}! Eu também trabalho com ${common.join(' e ').toLowerCase()}. Topa conversar sobre uma parceria?`
    : target.buys_for_others
      ? `Oi ${fn}! Vi que você compra para outros alunos. Queria saber se consegue comprar um item pra mim.`
      : `Oi ${fn}! Vi você no SearchUp e queria trocar uma ideia sobre parceria.`;
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function send(e) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc('request_conversation', { p_recipient: target.id, p_intro: text });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSent(data);
  }

  return (
    <Modal onClose={onClose} label={`Solicitar conversa com ${target.name}`}>
      <h2>Solicitar conversa com {target.name}</h2>
      <p className="small muted" style={{ margin: 0 }}>{fn} recebe sua mensagem e decide se aceita. Só depois disso vocês conversam.</p>
      <form onSubmit={send} className="stack">
        <label className="field-l" htmlFor="rq-msg">Mensagem de apresentação
          <textarea id="rq-msg" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} />
        </label>
        {err ? <p className="err">{err}</p> : null}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={busy || !text.trim()}>{busy ? 'Enviando…' : 'Enviar solicitação'}</button>
        </div>
      </form>
    </Modal>
  );
}
