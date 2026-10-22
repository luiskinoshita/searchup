'use client';
// Escolher foto: "Câmera" (tira na hora, só em celular/tablet) e "Galeria" (fotos do
// celular ou arquivos do computador). No computador também aceita arrastar e soltar.
import { useEffect, useRef, useState } from 'react';
import { IconCamera, IconImage } from './icons';

export function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    try { setTouch(window.matchMedia('(pointer: coarse)').matches); } catch { /* ignora */ }
  }, []);
  return touch;
}

// Pega a primeira imagem colada (Ctrl+V / colar no celular)
export function imageFromPaste(e) {
  const items = [...(e.clipboardData?.items || [])];
  const it = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'));
  return it ? it.getAsFile() : null;
}

export default function PhotoPicker({ onPick, hasFile = false, compact = false, disabled = false, dropHint = true }) {
  const camRef = useRef(null);
  const galRef = useRef(null);
  const touch = useIsTouch();
  const [over, setOver] = useState(false);

  function take(e) {
    const f = e.target.files?.[0];
    e.target.value = ''; // permite escolher a mesma foto de novo
    if (f && f.type.startsWith('image/')) onPick(f);
  }

  const galLabel = touch ? 'Galeria' : 'Escolher foto';
  const inputs = (
    <>
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={take} />
      <input ref={galRef} type="file" accept="image/*" hidden onChange={take} />
    </>
  );

  if (compact) {
    return (
      <>
        {inputs}
        {touch ? (
          <button type="button" className="btn iconbtn" onClick={() => camRef.current?.click()} disabled={disabled} aria-label="Tirar foto com a câmera" title="Câmera"><IconCamera /></button>
        ) : null}
        <button type="button" className="btn iconbtn" onClick={() => galRef.current?.click()} disabled={disabled} aria-label={touch ? 'Enviar foto da galeria' : 'Enviar foto do computador'} title={galLabel}><IconImage /></button>
      </>
    );
  }

  return (
    <div
      className={'picker' + (over ? ' over' : '')}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith('image/'));
        if (f) onPick(f);
      }}
    >
      {inputs}
      {touch ? (
        <button type="button" className="btn" onClick={() => camRef.current?.click()} disabled={disabled}><IconCamera /> {hasFile ? 'Tirar outra' : 'Câmera'}</button>
      ) : null}
      <button type="button" className="btn" onClick={() => galRef.current?.click()} disabled={disabled}><IconImage /> {hasFile ? 'Trocar foto' : galLabel}</button>
      {!touch && dropHint ? <span className="small muted">ou arraste a foto aqui</span> : null}
    </div>
  );
}
