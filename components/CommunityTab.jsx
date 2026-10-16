'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase, PROFILE_COLUMNS } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { ProfileCard } from './ui';
import Wall from './Wall';

export default function CommunityTab({ userId, isAdmin, myProfile, threads, onTalk, onOpenThread, notify }) {
  const [view, setView] = useState('mural');
  const [people, setPeople] = useState(null);
  const [cat, setCat] = useState('Todas');
  const [pref, setPref] = useState('Todas');
  const [onlyBuy, setOnlyBuy] = useState(false);

  useEffect(() => {
    supabase.from('profiles').select(PROFILE_COLUMNS)
      .eq('visible', true).eq('is_student', true).neq('name', '').neq('id', userId)
      .order('created_at', { ascending: false }).limit(500)
      .then(({ data }) => setPeople(Array.isArray(data) ? data : []));
  }, [userId]);

  const prefs = useMemo(() => [...new Set((people || []).map((p) => p.prefecture).filter(Boolean))].sort(), [people]);
  const list = (people || []).filter((p) =>
    (cat === 'Todas' || (p.categories || []).includes(cat)) &&
    (pref === 'Todas' || p.prefecture === pref) &&
    (!onlyBuy || p.buys_for_others));

  function actionFor(p) {
    const t = threads.find((x) => x.other_id === p.id);
    if (!t) return <button type="button" className="btn primary" onClick={() => onTalk(p.id, p.name)}>Solicitar conversa</button>;
    if (t.status === 'pending' && !t.incoming) return <button type="button" className="btn" disabled>Solicitação enviada</button>;
    if (t.status === 'declined') return <button type="button" className="btn" disabled>Solicitação recusada</button>;
    return <button type="button" className="btn" onClick={() => onOpenThread(t.id)}>{t.status === 'pending' ? 'Ver solicitação' : 'Abrir conversa'}</button>;
  }

  const header = (
    <div className="row between">
      <h2 className="h2">Comunidade</h2>
      <div className="seg" role="group" aria-label="Ver">
        <button type="button" aria-pressed={view === 'mural'} onClick={() => setView('mural')}>Mural</button>
        <button type="button" aria-pressed={view === 'pessoas'} onClick={() => setView('pessoas')}>Pessoas</button>
      </div>
    </div>
  );

  if (view === 'mural') {
    return (
      <div>
        {header}
        <p className="small muted" style={{ margin: '2px 0 0' }}>Posts com foto visíveis só para alunos do curso.</p>
        <Wall userId={userId} isAdmin={isAdmin} myProfile={myProfile} onTalk={onTalk} notify={notify} />
      </div>
    );
  }

  return (
    <div>
      {header}
      <p className="small muted" style={{ margin: '2px 0 0' }}>Alunos que deixaram o perfil visível. Só aparece a província, nunca endereço ou e-mail.</p>
      <div className="cfilters">
        <label className="field-l" htmlFor="cf-cat">Categoria
          <select id="cf-cat" className="field" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option>Todas</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field-l" htmlFor="cf-pref">Província
          <select id="cf-pref" className="field" value={pref} onChange={(e) => setPref(e.target.value)}>
            <option>Todas</option>{prefs.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="check" htmlFor="cf-buy" style={{ paddingBottom: 8 }}>
          <input id="cf-buy" type="checkbox" checked={onlyBuy} onChange={(e) => setOnlyBuy(e.target.checked)} /> Só quem compra para outros
        </label>
      </div>
      {people === null ? <div className="empty" style={{ marginTop: 14 }}>Carregando…</div> : (
        <div className="cgrid">
          {list.length ? list.map((p) => (
            <ProfileCard key={p.id} p={p} myCats={myProfile?.categories || []} action={actionFor(p)} />
          )) : <div className="empty">Ninguém com esses filtros ainda.</div>}
        </div>
      )}
    </div>
  );
}
