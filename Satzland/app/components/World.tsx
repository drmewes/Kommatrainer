'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapIcon, X } from 'lucide-react';
import { regionProgress, regions } from '../lib/satzland.mjs';
import type { Store } from '../lib/types';

// The watercolour map of Satzland behind the whole app. Every region is a province; as long as Kleckser rules it,
// it lies under his blue-green ink. Once the child frees a region, the ink is gone, the province shows its colours
// and its golden border posts light up again. Coordinates are those of the painting (1536 × 1024).
const PROVINCES: Record<number, [number, number][]> = {
  1: [[0, 0], [448, 0], [445, 60], [440, 195], [380, 212], [300, 214], [220, 212], [150, 200], [100, 205], [40, 200], [0, 200]],
  2: [[448, 0], [790, 0], [785, 80], [775, 190], [700, 218], [600, 220], [520, 215], [455, 205], [440, 195], [445, 60]],
  3: [[790, 0], [1115, 0], [1105, 60], [1110, 200], [1060, 215], [960, 218], [860, 210], [800, 200], [775, 190], [785, 80]],
  4: [[1115, 0], [1536, 0], [1536, 170], [1470, 180], [1300, 182], [1180, 185], [1110, 200], [1105, 60]],
  5: [[1110, 200], [1180, 185], [1300, 182], [1536, 175], [1536, 382], [1330, 385], [1080, 382], [1070, 330], [1060, 250], [1075, 215]],
  6: [[1080, 382], [1330, 385], [1536, 382], [1536, 515], [1300, 520], [1080, 522], [1070, 450]],
  7: [[1080, 522], [1300, 520], [1536, 515], [1536, 690], [1300, 690], [1210, 705], [1150, 705], [1080, 705], [1060, 620]],
  8: [[1210, 705], [1300, 690], [1536, 690], [1536, 1024], [1225, 1024], [1240, 900], [1215, 780]],
  9: [[930, 710], [1060, 705], [1150, 705], [1210, 705], [1215, 780], [1240, 900], [1225, 1024], [935, 1024], [960, 900], [935, 800]],
  10: [[665, 710], [800, 720], [930, 710], [935, 800], [960, 900], [935, 1024], [670, 1024], [690, 900], [670, 800]],
  11: [[505, 710], [665, 710], [670, 800], [690, 900], [670, 1024], [505, 1024], [520, 900], [510, 800]],
  12: [[265, 710], [400, 705], [505, 710], [510, 800], [520, 900], [505, 1024], [270, 1024], [280, 900], [262, 800]],
  13: [[0, 690], [120, 692], [265, 710], [262, 800], [280, 900], [270, 1024], [0, 1024]],
};
// The golden posts painted where border paths meet, with the provinces they guard.
const POSTS: { x: number; y: number; of: number[] }[] = [
  { x: 205, y: 205, of: [1] }, { x: 447, y: 195, of: [1, 2] }, { x: 787, y: 185, of: [2, 3] }, { x: 1112, y: 195, of: [3, 4, 5] },
  { x: 1088, y: 362, of: [5, 6] }, { x: 1082, y: 512, of: [6, 7] }, { x: 1075, y: 686, of: [7, 9] }, { x: 1205, y: 725, of: [7, 8, 9] },
  { x: 915, y: 708, of: [9, 10] }, { x: 512, y: 702, of: [11, 12] }, { x: 268, y: 708, of: [12, 13] }, { x: 45, y: 680, of: [13] },
];

export default function World({ store }: { store: Store }) {
  const [open, setOpen] = useState(false), frame = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open && frame.current) frame.current.scrollLeft = frame.current.scrollWidth; }, [open]);
  const freed = useMemo(() => new Set(regions.filter(r => r.built && regionProgress(r, store.attempts, store.sessions).freed).map(r => r.n)), [store.attempts, store.sessions]);
  const inked = Object.keys(PROVINCES).map(Number).filter(n => !freed.has(n));
  const points = (poly: [number, number][]) => poly.map(p => p.join(',')).join(' ');
  return <>
    <div ref={frame} className={'world' + (open ? ' open' : '')} aria-hidden={!open}>
      <svg viewBox="0 0 1536 1024" preserveAspectRatio="xMaxYMid slice" role="img" aria-label={`Das Königreich Satzland: ${freed.size} von ${regions.length} Gebieten befreit`}>
        <defs>
          <filter id="world-soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="7"/></filter>
          <mask id="world-ink"><g filter="url(#world-soft)">{inked.map(n => <polygon key={n} points={points(PROVINCES[n])} fill="#fff"/>)}</g></mask>
          <radialGradient id="world-glow"><stop offset="0" stopColor="#fff6c2" stopOpacity=".95"/><stop offset=".45" stopColor="#ffd34d" stopOpacity=".55"/><stop offset="1" stopColor="#ffd34d" stopOpacity="0"/></radialGradient>
        </defs>
        <image href="/welt/welt-reich.webp" width="1536" height="1024"/>
        <image href="/welt/welt-reich-tinte.webp" width="1536" height="1024" mask="url(#world-ink)"/>
        {POSTS.filter(p => p.of.some(n => freed.has(n))).map(p => <circle key={p.x + ':' + p.y} className="world-glow" cx={p.x} cy={p.y} r="34" fill="url(#world-glow)"/>)}
      </svg>
      {open && <button type="button" className="world-close" onClick={() => setOpen(false)} aria-label="Karte schließen"><X size={22}/></button>}
    </div>
    <button type="button" className="world-toggle" onClick={() => setOpen(true)}><MapIcon size={18}/>Karte</button>
  </>;
}
