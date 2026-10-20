import type { Lever, LeverImpact } from '../model';
import { LEVER_BUTTON, LEVER_HINT } from '../copy';
import { LeverIcon } from './LeverIcon';

interface Props {
  impacts: LeverImpact[];
  selected: Lever | null;
  onSelect: (l: Lever | null) => void;
}

// Fixed order, grouped like the bucket from top to bottom: in, value, out, back.
const ORDER: Lever[] = ['N', 'CAC', 'act', 'ARPA', 'r1', 'c', 'e', 'ref'];

export function LeverButtons({ impacts, selected, onSelect }: Props) {
  const best = impacts[0]?.delta > 0 ? impacts[0].lever : null;
  return (
    <div className="levers" role="group" aria-label="Interventi del 10%">
      {ORDER.map((l) => (
        <button
          key={l}
          type="button"
          className={`patch-btn${selected === l ? ' on' : ''}`}
          aria-pressed={selected === l}
          onClick={() => onSelect(selected === l ? null : l)}
        >
          <LeverIcon lever={l} />
          <span className="patch-text">
            <span className="patch-label">{LEVER_BUTTON[l]}</span>
            <span className="patch-hint">{LEVER_HINT[l]}</span>
          </span>
          {best === l && <span className="patch-tag">la più forte</span>}
        </button>
      ))}
    </div>
  );
}
