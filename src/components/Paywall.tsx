import { useEffect, useRef } from 'react';

// A fake news-site paywall, shown once on the first lever click. It's a joke: it never blocks.
export function Paywall({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    button.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialog.current) {
        // keep focus inside the dialog
        const items = Array.from(dialog.current.querySelectorAll<HTMLElement>('a, button'));
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i + 1) % items.length;
        e.preventDefault();
        items[next]?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="paywall-backdrop" onClick={onClose}>
      <div
        ref={dialog}
        className="paywall"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        aria-describedby="paywall-text"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="paywall-meter">Hai usato 1 leva gratuita su 1 questo mese</p>
        <h2 id="paywall-title">Per continuare, abbonati.</h2>
        <p className="paywall-price">
          <s aria-hidden="true">€4,99/mese</s> <span>
            Prezzo attuale: 1{' '}
            <a href="https://www.linkedin.com/in/leonardo-bonalumi/" target="_blank" rel="noopener">
              collabo con me
            </a>
            .
          </span>
        </p>
        <p id="paywall-text" className="paywall-text">
          Deformazione professionale: ormai tutto è dietro un paywall o una pubblicità. Ovviamente scherzo, puoi
          tornare a usare il tool <em>(per ora)</em>.
        </p>
        <button ref={button} type="button" className="paywall-btn" onClick={onClose}>
          Torna al tool, gratis
        </button>
        <p className="paywall-fine">Nessuna carta richiesta. Nessuna carta mai.</p>
      </div>
    </div>
  );
}
