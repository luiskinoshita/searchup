'use client';
import { useEffect } from 'react';
import { off, yen, initials, feeText } from '@/lib/util';

export function PriceTag({ price, was }) {
  const d = off(price, was);
  return d ? (
    <div className="tag" aria-label={`${d}% de desconto`}>-{d}%<small>OFF</small></div>
  ) : (
    <div className="tag none" aria-label="sem desconto informado">—<small>PREÇO</small></div>
  );
}

export function Price({ price, was }) {
  return (
    <div className="price num">
      {was && was > price ? <s>{yen(was)}</s> : null}
      {yen(price)}
      <span className="tax">税込</span>
    </div>
  );
}

export function Avatar({ name, lg }) {
  return <div className={'av' + (lg ? ' lg' : '')} aria-hidden="true">{initials(name)}</div>;
}

export function Modal({ onClose, children, label }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={label}>{children}</div>
    </div>
  );
}

export function ProfileCard({ p, myCats = [], action }) {
  const common = (p.categories || []).filter((c) => myCats.includes(c));
  return (
    <article className="pcard">
      <div className="who">
        <Avatar name={p.name} lg />
        <div style={{ minWidth: 0 }}>
          <h3>{p.name || 'Seu nome'}</h3>
          <div className="small muted">{p.prefecture || 'Província não informada'}</div>
        </div>
      </div>
      <div className="chips">
        {(p.categories || []).length
          ? p.categories.map((c) => <span key={c} className={'pill' + (common.includes(c) ? ' brand' : '')}>{c}</span>)
          : <span className="small muted">Nenhuma categoria</span>}
      </div>
      {p.buys_for_others ? (
        <>
          <div className="fee"><span>Compra para outros</span><strong className="num">{feeText(p)}</strong></div>
          {p.fee_note ? <div className="small muted">{p.fee_note}</div> : null}
        </>
      ) : (
        <div className="fee off">Não compra para outros</div>
      )}
      {p.bio ? <div className="small">{p.bio}</div> : null}
      {common.length ? <div className="small" style={{ color: 'var(--brand)' }}>Vocês trabalham com {common.join(' e ')}</div> : null}
      {action}
    </article>
  );
}

export function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast" role="status">{msg}</div>;
}
