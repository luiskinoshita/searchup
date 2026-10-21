'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ago } from '@/lib/util';

export default function AdminTab({ notify }) {
  const [emails, setEmails] = useState([]);
  const [paste, setPaste] = useState('');
  const [filter, setFilter] = useState('');
  const [reports, setReports] = useState([]);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [blockInput, setBlockInput] = useState('');

  const load = useCallback(async () => {
    const [{ data: e }, { data: r }, { data: b }] = await Promise.all([
      supabase.from('allowed_emails').select('email, is_admin, added_at').order('added_at', { ascending: false }),
      supabase.rpc('admin_reports'),
      supabase.rpc('admin_blocked_users'),
    ]);
    setEmails(e || []);
    setReports(r || []);
    setBlocked(b || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    const list = [...new Set(paste.toLowerCase().split(/[\s,;]+/).filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))];
    if (!list.length) { notify('Nenhum e-mail válido encontrado.'); return; }
    setBusy(true);
    const { error } = await supabase.from('allowed_emails').upsert(list.map((email) => ({ email })), { onConflict: 'email', ignoreDuplicates: true });
    setBusy(false);
    if (error) { notify('Erro: ' + error.message); return; }
    setPaste('');
    notify(`${list.length} e-mail${list.length > 1 ? 's' : ''} liberado${list.length > 1 ? 's' : ''}`);
    load();
  }
  async function remove(email) {
    const { error } = await supabase.from('allowed_emails').delete().eq('email', email);
    if (error) { notify('Erro: ' + error.message); return; }
    notify('Acesso removido de ' + email);
    load();
  }
  async function setBlock(email, on) {
    const clean = String(email || '').trim().toLowerCase();
    if (!clean) return;
    const { data, error } = await supabase.rpc('admin_set_blocked', { p_email: clean, p_blocked: on });
    if (error) { notify('Erro: ' + error.message); return; }
    notify(data ? (on ? 'Usuário bloqueado: ' : 'Usuário desbloqueado: ') + clean : 'Nenhum usuário com esse e-mail.');
    setBlockInput('');
    load();
  }

  async function deleteOffer(id) {
    const { error } = await supabase.from('offers').delete().eq('id', id);
    notify(error ? 'Erro ao apagar.' : 'Oferta apagada');
    load();
  }

  async function deletePost(id) {
    const { error } = await supabase.from('community_posts').delete().eq('id', id);
    notify(error ? 'Erro ao apagar.' : 'Post apagado');
    load();
  }

  async function deleteFind(id) {
    const { error } = await supabase.from('finds').delete().eq('id', id);
    notify(error ? 'Erro ao apagar.' : 'Achado apagado');
    load();
  }

  const shown = emails.filter((x) => x.email.includes(filter.toLowerCase()));

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="notice"><b>Acesso aberto (beta):</b> qualquer pessoa que fizer login já usa ofertas, achados, comunidade e mensagens. Para tirar alguém, use “Bloquear usuário” abaixo.</div>

      <section className="card stack">
        <h2 className="h2">Bloquear usuário</h2>
        <form className="sbox" onSubmit={(e) => { e.preventDefault(); setBlock(blockInput, true); }}>
          <input type="text" value={blockInput} onChange={(e) => setBlockInput(e.target.value)} placeholder="email@exemplo.com" aria-label="E-mail para bloquear" />
          <button className="btn danger" type="submit">Bloquear</button>
        </form>
        {blocked.length ? (
          <div className="scrollx">
            <table className="table">
              <thead><tr><th>Bloqueados</th><th></th></tr></thead>
              <tbody>
                {blocked.map((x) => (
                  <tr key={x.email}>
                    <td>{x.name || '—'}<div className="small muted">{x.email}</div></td>
                    <td><button type="button" className="btn ghost small" onClick={() => setBlock(x.email, false)}>Desbloquear</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="small muted" style={{ margin: 0 }}>Ninguém bloqueado.</p>}
      </section>

      <section className="card stack">
        <h2 className="h2">Lista de alunos do curso</h2>
        <p className="small muted" style={{ margin: 0 }}>Enquanto o acesso estiver aberto, esta lista não é obrigatória. Ela vai servir quando a assinatura começar (ex.: alunos do curso com acesso garantido).</p>
        <form onSubmit={add} className="stack">
          <label className="field-l" htmlFor="ad-paste">E-mails
            <textarea id="ad-paste" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'aluno1@gmail.com\naluno2@yahoo.co.jp'} style={{ minHeight: 110 }} />
          </label>
          <div className="row"><button className="btn primary" type="submit" disabled={busy}>Liberar acesso</button><span className="small muted num">{emails.length} e-mails na lista</span></div>
        </form>
        <input id="ad-filter" type="text" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Procurar e-mail" aria-label="Procurar e-mail" />
        <div className="scrollx">
          <table className="table">
            <thead><tr><th>E-mail</th><th>Adicionado</th><th></th></tr></thead>
            <tbody>
              {shown.slice(0, 300).map((x) => (
                <tr key={x.email}>
                  <td>{x.email} {x.is_admin ? <span className="pill brand">admin</span> : null}</td>
                  <td className="small muted">{ago(x.added_at)}</td>
                  <td>{x.is_admin ? null : <button type="button" className="btn ghost small danger" onClick={() => remove(x.email)}>Remover</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack">
        <h2 className="h2">Denúncias</h2>
        {reports.length ? (
          <div className="scrollx">
            <table className="table">
              <thead><tr><th>Quando</th><th>Quem denunciou</th><th>Denunciado</th><th>Sobre</th><th></th></tr></thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="small">{ago(r.created_at)}</td>
                    <td>{r.reporter_name || '—'}</td>
                    <td>{r.target_name || '—'}<div className="small muted">{r.target_email}</div></td>
                    <td className="small">
                      {r.offer_product ? `Oferta: ${r.offer_product}` : r.post_id ? `Mural: ${(r.post_body || 'foto').slice(0, 80)}` : r.find_id ? `Achado: ${r.find_title || ''}` : r.thread_id ? 'Conversa' : ''}
                      <div className="muted">{r.reason}</div>
                    </td>
                    <td>
                      {r.offer_id ? <button type="button" className="btn ghost small danger" onClick={() => deleteOffer(r.offer_id)}>Apagar oferta</button> : null}
                      {r.post_id ? <button type="button" className="btn ghost small danger" onClick={() => deletePost(r.post_id)}>Apagar post</button> : null}
                      {r.find_id ? <button type="button" className="btn ghost small danger" onClick={() => deleteFind(r.find_id)}>Apagar achado</button> : null}
                      {r.target_email ? <button type="button" className="btn ghost small danger" onClick={() => setBlock(r.target_email, true)}>Bloquear usuário</button> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty">Nenhuma denúncia.</div>}
      </section>
    </div>
  );
}
