import { useEffect, useState } from 'react';
import type { Inputs } from '../model';
import { FIELDS, PRESET_LABEL, UNIT_N, UNIT_N_ONE } from '../copy';
import { PRESET_KEYS, type PresetKey } from '../presets';

type FieldKey = (typeof FIELDS)[number]['key'];

/** The four numbers people know by heart: shown right under the bucket. */
export const QUICK_KEYS: FieldKey[] = ['N', 'act', 'ARPA', 'c'];
export const ADVANCED_KEYS: FieldKey[] = ['CAC', 'r1', 'e', 'ref', 'gm'];

interface FieldsProps {
  type: PresetKey;
  inputs: Inputs;
  keys: FieldKey[];
  onChange: (p: Inputs) => void;
}

interface Props extends FieldsProps {
  preset: PresetKey | null;
  onPreset: (k: PresetKey) => void;
}

type Field = (typeof FIELDS)[number];

function NumberField({ field, label, unit, value, onCommit }: { field: Field; label: string; unit: string; value: number; onCommit: (v: number) => void }) {
  const shown = +(value * field.scale).toPrecision(6);
  const [text, setText] = useState(String(shown));
  useEffect(() => setText(String(shown)), [shown]);
  const parsed = Number(text.replace(',', '.'));
  const invalid = text.trim() === '' || !Number.isFinite(parsed) || parsed < field.min || parsed > field.max;
  const id = `f-${field.key}`;
  return (
    <div className={`field${invalid ? ' invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="field-input">
        <input
          id={id}
          inputMode="decimal"
          value={text}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-err` : undefined}
          onChange={(e) => {
            setText(e.target.value);
            const v = Number(e.target.value.replace(',', '.'));
            if (e.target.value.trim() !== '' && Number.isFinite(v) && v >= field.min && v <= field.max) onCommit(v / field.scale);
          }}
          onBlur={() => setText(String(shown))}
        />
        <span className="unit">{unit}</span>
      </div>
      {invalid && <span className="err" id={`${id}-err`}>Tra {field.min} e {field.max.toLocaleString('it-IT')}</span>}
    </div>
  );
}

export function NumberFields({ type, inputs, keys, onChange }: FieldsProps) {
  return (
    <div className="fields">
      {FIELDS.filter((f) => keys.includes(f.key)).map((f) => (
        <NumberField
          key={f.key}
          field={f}
          label={f.key === 'N' ? `Acquisizione: ${UNIT_N[type]} al mese` : f.key === 'CAC' ? `CAC: costo per ${UNIT_N_ONE[type]}` : f.label}
          unit={f.key === 'N' ? UNIT_N[type] : f.unit}
          value={inputs[f.key]}
          onCommit={(v) => onChange({ ...inputs, [f.key]: v })}
        />
      ))}
    </div>
  );
}

export function NumbersPanel({ type, inputs, keys, preset, onPreset, onChange }: Props) {
  return (
    <div className="numbers">
      <div className="presets" role="group" aria-label="Esempi">
        {PRESET_KEYS.map((k) => (
          <button key={k} type="button" className={preset === k ? 'on' : ''} aria-pressed={preset === k} onClick={() => onPreset(k)}>
            {PRESET_LABEL[k]}
          </button>
        ))}
      </div>
      <NumberFields type={type} inputs={inputs} keys={keys} onChange={onChange} />
    </div>
  );
}
