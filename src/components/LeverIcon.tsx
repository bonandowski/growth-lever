import type { Lever } from '../model';

// Small drawings in the same line style as the bucket, one per lever.
const paths: Record<Lever, JSX.Element> = {
  // tap opening wider
  N: (<><path d="M2,10 H20 q6,0 6,6 V20" /><circle cx="9" cy="10" r="4" /><path className="water" d="M26,24 V31" /></>),
  // wrench on a leaking pipe
  CAC: (<><path d="M2,12 H30" /><path d="M14,20 l6,-6 m-2,-4 a4,4 0 1,0 6,6" /><path className="drop" d="M8,17 q-2.5,4 0,6 q2.5,-2 0,-6z" /></>),
  // wider funnel
  act: (<><path d="M4,8 H28 L19,18 V26 H13 V18 Z" /><path className="water" d="M16,28 V31" /></>),
  // thicker stream
  ARPA: (<><path d="M8,4 H24" /><path className="water thick" d="M16,8 V30" /></>),
  // plaster over the big hole
  r1: (<><rect x="5" y="11" width="22" height="10" rx="5" transform="rotate(-20 16 16)" /><path d="M13,15 h0.1 M16,16 h0.1 M19,17 h0.1" transform="rotate(-20 16 16)" /></>),
  // small patches on the bottom
  c: (<><path d="M3,10 L6,24 q1,3 4,3 H22 q3,0 4,-3 L29,10" /><rect x="10" y="22" width="5" height="5" rx="1.5" /><rect x="18" y="22" width="5" height="5" rx="1.5" /></>),
  // orange tap
  e: (<><path d="M28,8 H12 q-4,0 -4,4 V16" /><circle cx="21" cy="8" r="3" /><path className="upsell" d="M8,20 V30" /></>),
  // loop arrow
  ref: (<><path d="M24,26 C34,18 30,4 14,6" strokeDasharray="1 4" /><path d="M17,2 L13,6 L17,10" /><path d="M6,14 V28" className="water" /></>),
};

export function LeverIcon({ lever }: { lever: Lever }) {
  return (
    <svg className="lever-icon" viewBox="0 0 32 32" aria-hidden="true">
      {paths[lever]}
    </svg>
  );
}
