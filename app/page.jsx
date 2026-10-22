'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase, PROFILE_COLUMNS, linkType } from '@/lib/supabase';
import { CITIES } from '@/lib/constants';
import { readLS, writeLS } from '@/lib/util';
import { Toast } from '@/components/ui';
import AuthPanel, { NewPasswordPanel } from '@/components/AuthPanel';
import SearchTab from '@/components/SearchTab';
import OffersTab from '@/components/OffersTab';
import OfferForm from '@/components/OfferForm';
import CommunityTab from '@/components/CommunityTab';
import RequestModal from '@/components/RequestModal';
import MessagesTab from '@/components/MessagesTab';
import ProfileTab from '@/components/ProfileTab';
import AdminTab from '@/components/AdminTab';
import FindsTab from '@/components/FindsTab';
import FindForm from '@/components/FindForm';
import { TAB_ICONS, IconPin } from '@/components/icons';

const STUDENT_TABS = ['ofertas', 'achados', 'comunidade', 'mensagens', 'perfil'];

export default function Home() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loc, setLoc] = useState({ key: CITIES[0].key, label: CITIES[0].label, lat: CITIES[0].lat, lng: CITIES[0].lng });
  const [radius, setRadius] = useState(20);
  const [tab, setTab] = useState('buscar');
  const [threads, setThreads] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [offerDraft, setOfferDraft] = useState(undefined); // undefined = fechado
  const [requestTarget, setRequestTarget] = useState(null);
  const [offersReload, setOffersReload] = useState(0);
  const [findKind, setFindKind] = useState(null); // 'loja' | 'produto' | null
  const [findsReload, setFindsReload] = useState(0);
  const [toast, setToast] = useState('');
  const [gpsBusy, setGpsBusy] = useState(false);
  const [recovery, setRecovery] = useState(false);

  const notify = useCallback((m) => {
    setToast(m);
    clearTimeout(notify.t);
    notify.t = setTimeout(() => setToast(''), 3000);
  }, []);

  // preferências locais (cidade e raio)
  useEffect(() => {
    const l = readLS('su_loc', null);
    if (l && Number.isFinite(l.lat)) setLoc(l);
    const r = readLS('su_radius', null);
    if (Number.isFinite(r)) setRadius(r);
    const TABS = ['buscar', 'ofertas', 'achados', 'comunidade', 'mensagens', 'perfil', 'admin'];
    const fromHash = () => {
      const t = window.location.hash.replace('#', '');
      if (TABS.includes(t)) { setTab(t); return; }
      // volta do link de login do e-mail (#access_token=… ou #error=…)
      if (t.includes('error_description=')) {
        const p = new URLSearchParams(t);
        setToast(/expired|invalid/i.test(p.get('error_code') || p.get('error_description') || '')
          ? 'Esse link do e-mail expirou ou já foi usado. Tente entrar com e-mail e senha ou peça outro link.'
          : 'Não foi possível abrir o link do e-mail. Tente entrar com e-mail e senha.');
        history.replaceState(null, '', window.location.pathname);
      }
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);
  useEffect(() => { writeLS('su_loc', loc); }, [loc]);
  useEffect(() => { writeLS('su_radius', radius); }, [radius]);

  // sessão
  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    if (linkType === 'recovery') { setRecovery(true); setTab('perfil'); }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session); setReady(true);
      if (data.session && linkType === 'signup') notify('E-mail confirmado! Bem-vindo ao SnagMap 🎉');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      setSession(s);
      if (e === 'PASSWORD_RECOVERY') { setRecovery(true); setTab('perfil'); }
    });
    return () => sub.subscription.unsubscribe();
  }, [notify]);

  const userId = session?.user?.id || null;
  const isStudent = !!status?.is_student;
  const isAdmin = !!status?.is_admin;

  const loadMe = useCallback(async () => {
    if (!userId) { setStatus(null); setProfile(null); return; }
    const [{ data: st }, { data: pr }] = await Promise.all([
      supabase.rpc('my_status'),
      supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).single(),
    ]);
    setStatus(st?.[0] || null);
    setProfile(pr || null);
  }, [userId]);
  useEffect(() => { loadMe(); }, [loadMe]);

  const loadThreads = useCallback(async () => {
    if (!userId || !isStudent) { setThreads([]); return; }
    const { data } = await supabase.rpc('my_threads');
    setThreads(data || []);
  }, [userId, isStudent]);
  useEffect(() => {
    loadThreads();
    if (!userId || !isStudent) return;
    const iv = setInterval(loadThreads, 30000);
    return () => clearInterval(iv);
  }, [loadThreads, userId, isStudent]);

  function chooseCity(key) {
    if (key === 'gps') return locateMe();
    const c = CITIES.find((x) => x.key === key);
    if (c) setLoc({ key: c.key, label: c.label, lat: c.lat, lng: c.lng });
  }
  function locateMe() {
    if (!navigator.geolocation) { notify('Seu navegador não informa a localização.'); return; }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoc({ key: 'gps', label: 'Minha localização', lat: p.coords.latitude, lng: p.coords.longitude }); setGpsBusy(false); },
      () => { notify('Não foi possível pegar sua localização. Escolha uma cidade.'); setGpsBusy(false); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  function go(t) {
    setTab(t);
    try { history.replaceState(null, '', '#' + t); } catch {}
  }
  function openThread(id) { setThreadId(id); go('mensagens'); }

  async function talkTo(id, name) {
    const existing = threads.find((x) => x.other_id === id);
    if (existing) { openThread(existing.id); return; }
    const { data } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle();
    if (!data) { notify(`${name || 'Esse aluno'} não está aceitando conversas agora.`); return; }
    setRequestTarget(data);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setStatus(null); setProfile(null); go('buscar');
  }

  const incoming = threads.filter((x) => x.status === 'pending' && x.incoming).length;
  const tabs = [
    ['buscar', 'Buscar'], ['ofertas', 'Ofertas'], ['achados', 'Achados'], ['comunidade', 'Comunidade', 'Pessoas'],
    ['mensagens', 'Mensagens', 'Chat'], ['perfil', 'Perfil'],
  ];
  const needsName = isStudent && profile && !profile.name;

  let content;
  if (tab === 'buscar') {
    content = <SearchTab loc={loc} radius={radius} isStudent={isStudent} onAddFind={setFindKind}
      onShareStore={(s, type) => setOfferDraft({ store: { name: s.name, lat: s.lat, lng: s.lng }, category: type === 'Usados' ? 'Outros' : type })} />;
  } else if (!supabase) {
    content = <div className="empty">O SnagMap ainda não foi conectado ao banco de dados. Configure as variáveis do Supabase na Vercel.</div>;
  } else if (!ready) {
    content = <div className="empty">Carregando…</div>;
  } else if (session && recovery) {
    content = <NewPasswordPanel onDone={() => { setRecovery(false); notify('Senha nova salva!'); go('ofertas'); }} />;
  } else if (!session) {
    content = <AuthPanel title="Entre na comunidade SnagMap" intro="É grátis no beta: crie sua conta para ver as ofertas da comunidade, compartilhar achados e conversar com outros revendedores." />;
  } else if (!status) {
    content = <div className="empty">Carregando sua conta…</div>;
  } else if (tab === 'admin' && isAdmin) {
    content = <AdminTab notify={notify} />;
  } else if (!isStudent) {
    content = (
      <div className="locked">
        <span className="eyebrow">Acesso suspenso</span>
        <h2 className="h2">Sua conta está sem acesso à comunidade</h2>
        <p className="muted" style={{ margin: 0 }}>Você entrou como <b>{status.email}</b>. Se acha que isso é um engano, escreva para <a href="mailto:contact@snagmaps.com">contact@snagmaps.com</a>.</p>
        <button className="btn" type="button" onClick={signOut}>Sair e usar outro e-mail</button>
      </div>
    );
  } else if (tab === 'ofertas') {
    content = <OffersTab loc={loc} radius={radius} userId={userId} isAdmin={isAdmin} notify={notify} reloadKey={offersReload}
      onNewOffer={() => setOfferDraft(null)} onTalk={talkTo} />;
  } else if (tab === 'achados') {
    content = <FindsTab loc={loc} radius={radius} userId={userId} isAdmin={isAdmin} notify={notify} reloadKey={findsReload}
      onAdd={setFindKind} onTalk={talkTo} />;
  } else if (tab === 'comunidade') {
    content = <CommunityTab userId={userId} isAdmin={isAdmin} myProfile={profile} threads={threads} onTalk={talkTo} onOpenThread={openThread} notify={notify} />;
  } else if (tab === 'mensagens') {
    content = <MessagesTab userId={userId} threads={threads} selectedId={threadId} onSelect={setThreadId} onChanged={loadThreads} notify={notify} />;
  } else if (tab === 'perfil' && profile) {
    content = <ProfileTab key={profile.id} profile={profile} email={status.email} onSaved={loadMe} notify={notify} />;
  } else {
    content = <div className="empty">Carregando…</div>;
  }

  return (
    <div className="wrap">
      <header className="top">
        <div className="row" style={{ gap: 12 }}>
          <a className="logo" href="#buscar" onClick={(e) => { e.preventDefault(); go('buscar'); }} aria-label="SnagMap — início">
            <img src="/logo.png" alt="SnagMap" width="119" height="40" />
          </a>
          <span className="beta">beta</span>
        </div>
        <div className="row">
          {isAdmin ? <button className="btn small" type="button" aria-pressed={tab === 'admin'} onClick={() => go('admin')}>Admin</button> : null}
          {session ? (
            <>
              <span className="small muted who-name">{profile?.name || status?.email || ''}</span>
              <button className="btn ghost small" type="button" onClick={signOut}>Sair</button>
            </>
          ) : supabase ? (
            <button className="btn small" type="button" onClick={() => go('ofertas')}>Entrar</button>
          ) : null}
        </div>
      </header>

      <div className="loc">
        <div className="row">
          <label htmlFor="city">Buscar a partir de</label>
          <select id="city" value={loc.key} onChange={(e) => chooseCity(e.target.value)}>
            {loc.key === 'gps' ? <option value="gps">Minha localização</option> : null}
            {CITIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <button className="btn ghost small" type="button" onClick={locateMe} disabled={gpsBusy}>{gpsBusy ? 'Localizando…' : <><IconPin /><span>Perto de mim</span></>}</button>
        </div>
        <div className="rad">
          <label htmlFor="radius">Raio</label>
          <input id="radius" type="range" min="0" max="40" step="1" value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
          <output htmlFor="radius" className="num">{radius} km</output>
        </div>
      </div>

      <div className="tabsbox">
        <nav className="tabs" role="tablist">
          {tabs.map(([k, l, short]) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => go(k)}>
              {(() => { const I = TAB_ICONS[k]; return I ? <I /> : null; })()}
              <span className={short ? 'lbl-long' : undefined}>{l}</span>
              {short ? <span className="lbl-short">{short}</span> : null}
              {STUDENT_TABS.includes(k) && !session ? <span className="lock">(entrar)</span> : null}
              {k === 'mensagens' && incoming ? <span className="badge">{incoming}</span> : null}
            </button>
          ))}
        </nav>
      </div>

      <main>
        {needsName && tab !== 'perfil' ? (
          <div className="notice" style={{ marginBottom: 14 }}>
            Complete seu perfil (nome, província e categorias) para aparecer na Comunidade. <button className="btn small" type="button" onClick={() => go('perfil')}>Completar perfil</button>
          </div>
        ) : null}
        {content}
      </main>

      <footer className="foot">
        <span><b style={{ color: 'var(--fg)' }}>SnagMap</b> · Ache ofertas. Compartilhe achados. <span className="hl">Revenda melhor.</span></span>
        <span>Acordos de compra e pagamento entre usuários são de responsabilidade deles. O SnagMap não intermedia dinheiro.</span>
        <span>Contato: <a href="mailto:contact@snagmaps.com">contact@snagmaps.com</a></span>
        <span>
          <a href="https://webservice.rakuten.co.jp/" target="_blank" rel="noopener noreferrer">Supported by Rakuten Developers</a>
          {' · Lojas: '}<span translate="no">Google Maps</span>
        </span>
      </footer>

      {offerDraft !== undefined && userId && isStudent ? (
        <OfferForm draft={offerDraft} loc={loc} userId={userId} onClose={() => setOfferDraft(undefined)}
          onSaved={(delay) => {
            setOfferDraft(undefined);
            setOffersReload((n) => n + 1);
            go('ofertas');
            notify(delay ? `Oferta salva. Os outros alunos veem em ${delay} h` : 'Oferta compartilhada com os alunos');
          }} />
      ) : null}
      {findKind && userId && isStudent ? (
        <FindForm initialKind={findKind} loc={loc} userId={userId} onClose={() => setFindKind(null)}
          onSaved={(k) => {
            setFindKind(null);
            setFindsReload((n) => n + 1);
            go('achados');
            notify(k === 'loja' ? 'Loja adicionada aos Achados' : 'Produto adicionado aos Achados');
          }} />
      ) : null}
      {requestTarget ? (
        <RequestModal target={requestTarget} myProfile={profile} onClose={() => setRequestTarget(null)}
          onSent={async (id) => { setRequestTarget(null); await loadThreads(); openThread(id); notify('Solicitação enviada'); }} />
      ) : null}
      <Toast msg={toast} />
    </div>
  );
}
