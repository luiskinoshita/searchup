'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CATEGORIES, PREFECTURES } from '@/lib/constants';
import { yen } from '@/lib/util';
import { ProfileCard } from './ui';

export default function ProfileTab({ profile, email, onSaved, notify }) {
  const [f, setF] = useState({
    name: profile.name || '', prefecture: profile.prefecture || 'Aichi', categories: profile.categories || [],
    bio: profile.bio || '', visible: profile.visible, buys_for_others: profile.buys_for_others,
    fee_type: profile.fee_type || 'pct', fee_value: Number(profile.fee_value ?? 10), fee_note: profile.fee_note || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggleCat = (c) => set('categories', f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c]);

  async function save(e) {
    e.preventDefault();
    if (!f.name.trim()) { notify('Coloque seu nome.'); return; }
    setBusy(true);
    const { error } = await supabase.from('profiles').update({
      ...f, name: f.name.trim().slice(0, 60), fee_value: Math.max(0, Number(f.fee_value) || 0),
    }).eq('id', profile.id);
    setBusy(false);
    if (error) { notify('Não foi possível salvar: ' + error.message); return; }
    notify('Perfil salvo');
    onSaved();
  }

  const example = f.fee_type === 'pct'
    ? `Exemplo: numa compra de ¥6.600 você recebe ${yen(Math.round(6600 * (Number(f.fee_value) || 0) / 100))} de taxa.`
    : `Exemplo: 3 itens = ${yen((Number(f.fee_value) || 0) * 3)} de taxa.`;

  return (
    <div className="pgrid">
      <form className="form" onSubmit={save}>
        <div>
          <h2 className="h2">Meu perfil</h2>
          <p className="small muted" style={{ margin: '2px 0 0' }}>Conta: {email}. Seu e-mail nunca aparece para os outros alunos.</p>
        </div>
        <div className="two">
          <label className="field-l" htmlFor="pf-name">Nome
            <input id="pf-name" type="text" value={f.name} maxLength={60} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label className="field-l" htmlFor="pf-pref">Província
            <select id="pf-pref" className="field" value={f.prefecture} onChange={(e) => set('prefecture', e.target.value)}>
              {PREFECTURES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
        </div>
        <div className="field-l">Com o que você trabalha
          <div className="chips">
            {CATEGORIES.map((c) => <button key={c} type="button" className="chip" aria-pressed={f.categories.includes(c)} onClick={() => toggleCat(c)}>{c}</button>)}
          </div>
          <span className="small muted">Você escolhe o que aparece. O app nunca mostra o que você comprou.</span>
        </div>
        <label className="field-l" htmlFor="pf-bio">Sobre você
          <textarea id="pf-bio" value={f.bio} maxLength={400} onChange={(e) => set('bio', e.target.value)} placeholder="Ex: Revendo cartas para o Brasil, foco em boxes lacrados." />
        </label>
        <label className="check" htmlFor="pf-vis">
          <input id="pf-vis" type="checkbox" checked={f.visible} onChange={(e) => set('visible', e.target.checked)} />
          <span>Mostrar meu perfil na Comunidade<br /><span className="small muted">Desligado, ninguém encontra você nem envia solicitações.</span></span>
        </label>
        <fieldset>
          <legend>Compro para outros alunos</legend>
          <label className="check" htmlFor="pf-buy">
            <input id="pf-buy" type="checkbox" checked={f.buys_for_others} onChange={(e) => set('buys_for_others', e.target.checked)} />
            <span>Aceito comprar para outros alunos mediante uma taxa</span>
          </label>
          {f.buys_for_others ? (
            <>
              <div className="two">
                <label className="field-l" htmlFor="pf-ft">Tipo de taxa
                  <select id="pf-ft" className="field" value={f.fee_type} onChange={(e) => setF((x) => ({ ...x, fee_type: e.target.value, fee_value: e.target.value === 'pct' ? 10 : 1000 }))}>
                    <option value="pct">Porcentagem do valor</option>
                    <option value="fix">Valor fixo por item (¥)</option>
                  </select>
                </label>
                <label className="field-l" htmlFor="pf-fee">{f.fee_type === 'pct' ? 'Taxa (%)' : 'Taxa (¥ por item)'}
                  <input id="pf-fee" type="number" min="0" step={f.fee_type === 'pct' ? 1 : 100} value={f.fee_value} onChange={(e) => set('fee_value', e.target.value)} />
                </label>
              </div>
              <label className="field-l" htmlFor="pf-fn">Condições
                <textarea id="pf-fn" value={f.fee_note} maxLength={300} onChange={(e) => set('fee_note', e.target.value)} placeholder="Ex: Só lojas de Aichi. Compro até sexta e envio no sábado." />
              </label>
              <p className="small muted" style={{ margin: 0 }}>{example}</p>
            </>
          ) : null}
        </fieldset>
        <div className="row"><button className="btn primary" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar perfil'}</button></div>
      </form>
      <aside>
        <span className="eyebrow">Como os outros alunos veem você</span>
        <div style={{ marginTop: 8 }}>
          {f.visible ? <ProfileCard p={{ ...f, fee_value: Number(f.fee_value) || 0 }} /> : <div className="empty">Perfil oculto. Você não aparece na Comunidade.</div>}
        </div>
      </aside>
    </div>
  );
}
