'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthPanel({ title = 'Entrar no SnagMap', intro }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function send(e) {
    e.preventDefault();
    setErr('');
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setErr('Digite um e-mail válido.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) {
      setErr(/rate|limit|seconds/i.test(error.message)
        ? 'Muitos pedidos seguidos. Espere um minuto e tente de novo.'
        : 'Não foi possível enviar o código: ' + error.message);
      return;
    }
    setEmail(clean);
    setStep('code');
  }

  async function verify(e) {
    e.preventDefault();
    setErr('');
    const token = code.replace(/\D/g, '');
    if (token.length < 6) { setErr('O código tem pelo menos 6 números.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    setBusy(false);
    if (error) setErr('Código inválido ou expirado. Confira o e-mail ou peça outro código.');
  }

  return (
    <div className="authbox card">
      <h2 className="h2">{title}</h2>
      {intro ? <p className="small muted" style={{ margin: 0 }}>{intro}</p> : null}
      {step === 'email' ? (
        <form onSubmit={send} className="stack">
          <label className="field-l" htmlFor="auth-email">Seu e-mail
            <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
          </label>
          {err ? <p className="err">{err}</p> : null}
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Receber link por e-mail'}</button>
          <p className="small muted" style={{ margin: 0 }}>Sem senha. Você recebe um link de acesso no e-mail.</p>
        </form>
      ) : (
        <form onSubmit={verify} className="stack">
          <p className="small" style={{ margin: 0 }}>Enviamos um e-mail para <b>{email}</b>. <b>Toque no link do e-mail</b> para entrar, ou digite aqui o código, se o e-mail trouxer um. Pode levar um minuto e às vezes cai no spam.</p>
          <label className="field-l" htmlFor="auth-code">Código
            <input id="auth-code" className="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          {err ? <p className="err">{err}</p> : null}
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Conferindo…' : 'Entrar'}</button>
          <button className="btn ghost small" type="button" onClick={() => { setStep('email'); setCode(''); setErr(''); }}>Usar outro e-mail</button>
        </form>
      )}
    </div>
  );
}
