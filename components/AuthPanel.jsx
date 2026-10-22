'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const MIN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ptError(error) {
  const m = String(error?.message || error || '');
  if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(m)) return 'not_confirmed';
  if (/already registered|already exists/i.test(m)) return 'Este e-mail já tem conta. Use “Entrar” ou “Esqueci minha senha”.';
  if (/password should be at least|password.*(short|length)/i.test(m)) return `A senha precisa ter pelo menos ${MIN} caracteres.`;
  if (/weak|pwned|leaked/i.test(m)) return 'Essa senha é muito fácil ou já vazou na internet. Escolha outra.';
  if (/rate|limit|seconds|too many/i.test(m)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  if (/invalid.*email|email.*invalid/i.test(m)) return 'Digite um e-mail válido.';
  if (/sending|smtp|email/i.test(m) && /error|fail/i.test(m)) return 'Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos.';
  return 'Algo deu errado: ' + m;
}

function PasswordInput({ id, label, value, onChange, autoComplete, show, onToggle }) {
  return (
    <label className="field-l" htmlFor={id}>{label}
      <span className="pwbox">
        <input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value}
          onChange={(e) => onChange(e.target.value)} minLength={autoComplete === 'new-password' ? MIN : undefined} />
        {onToggle ? (
          <button type="button" className="pwtoggle" onClick={onToggle} aria-label={show ? 'Esconder senha' : 'Mostrar senha'}>
            {show ? 'Esconder' : 'Mostrar'}
          </button>
        ) : null}
      </span>
    </label>
  );
}

export default function AuthPanel({ title = 'Entrar no SnagMap', intro }) {
  // login | signup | sent | forgot | forgotSent
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [info, setInfo] = useState('');

  const clean = email.trim().toLowerCase();
  const redirect = typeof window !== 'undefined' ? window.location.origin : undefined;

  function switchTo(m) { setMode(m); setErr(''); setInfo(''); setNeedsConfirm(false); setPw(''); setPw2(''); }

  async function login(e) {
    e.preventDefault();
    setErr(''); setInfo(''); setNeedsConfirm(false);
    if (!EMAIL_RE.test(clean)) { setErr('Digite um e-mail válido.'); return; }
    if (!pw) { setErr('Digite sua senha.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: clean, password: pw });
    setBusy(false);
    if (error) {
      const msg = ptError(error);
      if (msg === 'not_confirmed') { setNeedsConfirm(true); setErr('Você ainda não confirmou seu e-mail. Abra o e-mail que enviamos e toque em “Confirmar”.'); }
      else setErr(msg);
    }
  }

  async function signup(e) {
    e.preventDefault();
    setErr(''); setInfo('');
    if (!EMAIL_RE.test(clean)) { setErr('Digite um e-mail válido.'); return; }
    if (pw.length < MIN) { setErr(`A senha precisa ter pelo menos ${MIN} caracteres.`); return; }
    if (pw !== pw2) { setErr('As duas senhas não são iguais.'); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: clean, password: pw, options: { emailRedirectTo: redirect } });
    setBusy(false);
    if (error) { setErr(ptError(error)); return; }
    // e-mail já cadastrado: o Supabase devolve um usuário sem identidades
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setErr('Este e-mail já tem conta. Use “Entrar” ou “Esqueci minha senha”.');
      return;
    }
    if (data?.session) return; // confirmação desligada: já entrou
    setPw(''); setPw2('');
    setMode('sent');
  }

  async function resend() {
    setErr(''); setInfo('');
    if (!EMAIL_RE.test(clean)) { setErr('Digite um e-mail válido.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: clean, options: { emailRedirectTo: redirect } });
    setBusy(false);
    if (error) setErr(ptError(error));
    else setInfo('Enviamos o e-mail de confirmação de novo. Confira também o spam.');
  }

  async function forgot(e) {
    e.preventDefault();
    setErr(''); setInfo('');
    if (!EMAIL_RE.test(clean)) { setErr('Digite um e-mail válido.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(clean, { redirectTo: redirect });
    setBusy(false);
    if (error) { setErr(ptError(error)); return; }
    setMode('forgotSent');
  }

  const emailField = (
    <label className="field-l" htmlFor="auth-email">E-mail
      <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
    </label>
  );

  return (
    <div className="authbox card">
      <h2 className="h2">{mode === 'signup' ? 'Criar conta no SnagMap' : mode === 'sent' ? 'Confirme seu e-mail' : mode === 'forgot' || mode === 'forgotSent' ? 'Esqueci minha senha' : title}</h2>
      {intro && (mode === 'login' || mode === 'signup') ? <p className="small muted" style={{ margin: 0 }}>{intro}</p> : null}

      {mode === 'login' || mode === 'signup' ? (
        <div className="seg" role="group" aria-label="Entrar ou criar conta" style={{ justifySelf: 'start' }}>
          <button type="button" aria-pressed={mode === 'login'} onClick={() => switchTo('login')}>Entrar</button>
          <button type="button" aria-pressed={mode === 'signup'} onClick={() => switchTo('signup')}>Criar conta</button>
        </div>
      ) : null}

      {mode === 'login' ? (
        <form onSubmit={login} className="stack">
          {emailField}
          <PasswordInput id="auth-pw" label="Senha" value={pw} onChange={setPw} autoComplete="current-password" show={show} onToggle={() => setShow(!show)} />
          {err ? <p className="err">{err}</p> : null}
          {info ? <p className="small ok" style={{ margin: 0 }}>{info}</p> : null}
          {needsConfirm ? <button className="btn ghost small" type="button" disabled={busy} onClick={resend}>Reenviar e-mail de confirmação</button> : null}
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
          <button className="btn ghost small" type="button" onClick={() => switchTo('forgot')}>Esqueci minha senha</button>
        </form>
      ) : null}

      {mode === 'signup' ? (
        <form onSubmit={signup} className="stack">
          {emailField}
          <PasswordInput id="auth-pw-new" label={`Crie uma senha (mínimo ${MIN} caracteres)`} value={pw} onChange={setPw} autoComplete="new-password" show={show} onToggle={() => setShow(!show)} />
          <PasswordInput id="auth-pw-new2" label="Repita a senha" value={pw2} onChange={setPw2} autoComplete="new-password" show={show} />
          {err ? <p className="err">{err}</p> : null}
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Criando…' : 'Criar conta'}</button>
          <p className="small muted" style={{ margin: 0 }}>Depois de criar, você recebe um e-mail para confirmar o endereço. Só então consegue entrar.</p>
        </form>
      ) : null}

      {mode === 'sent' ? (
        <div className="stack">
          <p style={{ margin: 0 }}>Quase lá! Enviamos um e-mail para <b>{clean}</b>.</p>
          <p className="small muted" style={{ margin: 0 }}>Abra o e-mail e toque em <b>“Confirmar meu e-mail”</b>. Você volta para o SnagMap já conectado. Pode levar um minuto e às vezes cai no spam ou em “Promoções”.</p>
          {err ? <p className="err">{err}</p> : null}
          {info ? <p className="small ok" style={{ margin: 0 }}>{info}</p> : null}
          <button className="btn" type="button" disabled={busy} onClick={resend}>{busy ? 'Enviando…' : 'Não chegou? Reenviar e-mail'}</button>
          <button className="btn ghost small" type="button" onClick={() => switchTo('login')}>Já confirmei, quero entrar</button>
        </div>
      ) : null}

      {mode === 'forgot' ? (
        <form onSubmit={forgot} className="stack">
          <p className="small muted" style={{ margin: 0 }}>Digite o e-mail da sua conta. Enviamos um link para você criar uma senha nova.</p>
          {emailField}
          {err ? <p className="err">{err}</p> : null}
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar link'}</button>
          <button className="btn ghost small" type="button" onClick={() => switchTo('login')}>Voltar para entrar</button>
        </form>
      ) : null}

      {mode === 'forgotSent' ? (
        <div className="stack">
          <p style={{ margin: 0 }}>Se existe uma conta com <b>{clean}</b>, enviamos um link para criar uma senha nova.</p>
          <p className="small muted" style={{ margin: 0 }}>Abra o e-mail e toque no link. Confira também o spam.</p>
          <button className="btn ghost small" type="button" onClick={() => switchTo('login')}>Voltar para entrar</button>
        </div>
      ) : null}
    </div>
  );
}

// Aparece quando a pessoa volta pelo link de "Esqueci minha senha"
export function NewPasswordPanel({ onDone }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save(e) {
    e.preventDefault();
    setErr('');
    if (pw.length < MIN) { setErr(`A senha precisa ter pelo menos ${MIN} caracteres.`); return; }
    if (pw !== pw2) { setErr('As duas senhas não são iguais.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      setErr(/same|different from the old/i.test(error.message) ? 'A senha nova precisa ser diferente da antiga.' : ptError(error));
      return;
    }
    onDone?.();
  }

  return (
    <div className="authbox card">
      <h2 className="h2">Criar senha nova</h2>
      <form onSubmit={save} className="stack">
        <PasswordInput id="np-pw" label={`Senha nova (mínimo ${MIN} caracteres)`} value={pw} onChange={setPw} autoComplete="new-password" show={show} onToggle={() => setShow(!show)} />
        <PasswordInput id="np-pw2" label="Repita a senha" value={pw2} onChange={setPw2} autoComplete="new-password" show={show} />
        {err ? <p className="err">{err}</p> : null}
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar senha'}</button>
      </form>
    </div>
  );
}
