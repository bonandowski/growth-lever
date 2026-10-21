import { pushLever, type Inputs, type Lever, type PlanRow } from '../model';
import { LEVER_NAME, leverMove } from '../copy';
import type { PresetKey } from '../presets';
import { LeverIcon } from './LeverIcon';

interface Props {
  rows: PlanRow[];
  inputs: Inputs;
  type: PresetKey;
  selected: Lever | null;
  onSelect: (l: Lever | null) => void;
}

/** What a button says under the lever name: the move needed, or why there isn't one. */
function moveText(row: PlanRow, p: Inputs, type: PresetKey): string {
  if (row.harmful) return 'toglie valore';
  if (row.x === null) return 'da sola non basta';
  return leverMove(row.lever, p, pushLever(p, row.lever, row.x), type);
}

export function LeverButtons({ rows, inputs, type, selected, onSelect }: Props) {
  return (
    <div className="levers" role="group" aria-label="Mosse che portano allo stesso risultato">
      {rows.map((row) => (
        <button
          key={row.lever}
          type="button"
          className={`patch-btn${selected === row.lever ? ' on' : ''}${row.x === null ? ' muted' : ''}`}
          aria-pressed={selected === row.lever}
          onClick={() => onSelect(selected === row.lever ? null : row.lever)}
        >
          <LeverIcon lever={row.lever} />
          <span className="patch-text">
            <span className="patch-label">{LEVER_NAME[row.lever]}</span>
            <span className="patch-move">{moveText(row, inputs, type)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
