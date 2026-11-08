import { useId } from 'react';

export type Mood = 'happy' | 'cheer' | 'sleep' | 'think';

// Schreibi, the pencil: drawn in code so the eyes can blink, the arms can wave and the face can think or sleep.
export function SchreibiSvg({ mood = 'happy', className = '', title = 'Schreibi' }: { mood?: Mood; className?: string; title?: string }) {
  const id = useId().replace(/:/g, '');
  const closed = mood === 'sleep', cheer = mood === 'cheer', think = mood === 'think';
  const look = think ? [-2.5, -3] : [1, 0];
  return <svg className={'schreibi-svg mood-' + mood + ' ' + className} viewBox="0 0 160 230" role="img" aria-label={title}>
    <defs>
      <linearGradient id={id + 'body'} x1="0" x2="1"><stop offset="0" stopColor="#f2ad1f"/><stop offset=".33" stopColor="#f2ad1f"/><stop offset=".33" stopColor="#ffc93d"/><stop offset=".67" stopColor="#ffc93d"/><stop offset=".67" stopColor="#ffd970"/><stop offset="1" stopColor="#ffd970"/></linearGradient>
      <linearGradient id={id + 'metal'} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e9edf2"/><stop offset="1" stopColor="#aab3bf"/></linearGradient>
      <linearGradient id={id + 'wood'} x1="0" x2="1"><stop offset="0" stopColor="#e8b97e"/><stop offset="1" stopColor="#f7d9ad"/></linearGradient>
    </defs>
    <ellipse className="schreibi-shadow" cx="80" cy="221" rx="38" ry="6" fill="#203a5c" opacity=".14"/>
    <g className="schreibi-body">
      <g className="schreibi-arm arm-left" stroke="#203a5c" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d={cheer ? 'M53 112C40 100 34 86 30 72' : think ? 'M53 116C44 120 46 104 62 104' : 'M53 118C42 126 36 136 32 146'}/>
        <circle cx={cheer ? 30 : think ? 63 : 32} cy={cheer ? 70 : think ? 103 : 148} r="6" fill="#fff" strokeWidth="3.5"/>
      </g>
      <g className="schreibi-arm arm-right" stroke="#203a5c" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d={cheer ? 'M107 112C120 100 126 86 130 72' : 'M107 118C120 112 128 102 132 92'}/>
        <circle cx={cheer ? 130 : 133} cy={cheer ? 70 : 90} r="6" fill="#fff" strokeWidth="3.5"/>
      </g>
      <path d="M53 166h54l-20 40h-14Z" fill={`url(#${id}wood)`} stroke="#c98d47" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M73 206h14l-7 14Z" fill="#3d3a4f" stroke="#2b2838" strokeWidth="2" strokeLinejoin="round"/>
      <rect x="53" y="62" width="54" height="106" rx="4" fill={`url(#${id}body)`} stroke="#d58f0b" strokeWidth="2.5"/>
      <rect x="51" y="44" width="58" height="22" rx="3" fill={`url(#${id}metal)`} stroke="#8d97a5" strokeWidth="2.5"/>
      <path d="M51 51h58M51 58h58" stroke="#8d97a5" strokeWidth="2"/>
      <path d="M54 44V24c0-10 8-16 26-16s26 6 26 16v20Z" fill="#f59ab1" stroke="#d96b8b" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M62 22c2-6 8-8 15-8" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="4" strokeLinecap="round"/>
      <g className="schreibi-face">
        <ellipse cx="62" cy="114" rx="6" ry="4" fill="#ff8f8f" opacity=".45"/>
        <ellipse cx="98" cy="114" rx="6" ry="4" fill="#ff8f8f" opacity=".45"/>
        {[68, 92].map(x => <g key={x} className="schreibi-eye">
          {closed ? <path d={`M${x - 7} 98q7 6 14 0`} fill="none" stroke="#203a5c" strokeWidth="3" strokeLinecap="round"/>
            : cheer ? <path d={`M${x - 7} 100q7-9 14 0`} fill="none" stroke="#203a5c" strokeWidth="3.4" strokeLinecap="round"/>
            : <><ellipse cx={x} cy="97" rx="8" ry="9.5" fill="#fff" stroke="#203a5c" strokeWidth="2.4"/><g className="pupil"><circle cx={x + look[0]} cy={98 + look[1]} r="4.4" fill="#203a5c"/><circle cx={x + look[0] + 1.6} cy={96 + look[1]} r="1.5" fill="#fff"/></g></>}
        </g>)}
        {think && <path d="M60 84q7-6 15-3M85 81q8-3 15 3" fill="none" stroke="#203a5c" strokeWidth="2.6" strokeLinecap="round"/>}
        {closed ? <path d="M75 120q5 2 10 0" fill="none" stroke="#203a5c" strokeWidth="3" strokeLinecap="round"/>
          : think ? <ellipse cx="82" cy="121" rx="3.6" ry="3" fill="#203a5c"/>
          : cheer ? <path d="M70 114q10 14 20 0Z" fill="#203a5c" stroke="#203a5c" strokeWidth="2.4" strokeLinejoin="round"/>
          : <path d="M71 115q9 9 18 0" fill="none" stroke="#203a5c" strokeWidth="3.2" strokeLinecap="round"/>}
      </g>
    </g>
  </svg>;
}

// The top of Schreibi for the header and small badges.
export function SchreibiFace({ className = '' }: { className?: string }) {
  return <svg className={'schreibi-face-icon ' + className} viewBox="40 0 80 140" aria-hidden="true">
    <rect x="53" y="62" width="54" height="80" rx="4" fill="#ffc93d" stroke="#d58f0b" strokeWidth="3"/>
    <rect x="51" y="44" width="58" height="22" rx="3" fill="#d4dae2" stroke="#8d97a5" strokeWidth="3"/>
    <path d="M54 44V24c0-10 8-16 26-16s26 6 26 16v20Z" fill="#f59ab1" stroke="#d96b8b" strokeWidth="3"/>
    <ellipse cx="68" cy="97" rx="8" ry="9.5" fill="#fff" stroke="#203a5c" strokeWidth="3"/><circle cx="69" cy="98" r="4.4" fill="#203a5c"/>
    <ellipse cx="92" cy="97" rx="8" ry="9.5" fill="#fff" stroke="#203a5c" strokeWidth="3"/><circle cx="93" cy="98" r="4.4" fill="#203a5c"/>
    <path d="M71 115q9 9 18 0" fill="none" stroke="#203a5c" strokeWidth="3.6" strokeLinecap="round"/>
  </svg>;
}
