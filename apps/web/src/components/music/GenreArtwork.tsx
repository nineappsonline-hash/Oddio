'use client';

import { useMemo } from 'react';

type Props = { slug: string; index: number };

const themes: Record<string, [string, string, string]> = {
  reggae: ['#ffb23e', '#116b4b', 'palms'],
  afrobeats: ['#ffb15b', '#7e244a', 'drum'],
  amapiano: ['#fa789d', '#39318e', 'city'],
  dance: ['#f05ce8', '#3b146d', 'disco'],
  edm: ['#31d9fa', '#6125c6', 'laser'],
  house: ['#c884ff', '#211143', 'vinyl'],
  techno: ['#3ff6d2', '#101d44', 'laser'],
  trance: ['#9c8cff', '#1c1c6b', 'laser'],
  rock: ['#ff9958', '#4d123a', 'guitar'],
  'hip-hop': ['#e8a850', '#3e205d', 'city'],
  jazz: ['#f5bb65', '#54307d', 'sax'],
  blues: ['#5c9efb', '#122654', 'guitar'],
  soul: ['#e9a2e8', '#52265a', 'vinyl'],
  pop: ['#ff89c6', '#6b2f9c', 'disco'],
  ambient: ['#7de1dd', '#364389', 'stars'],
  cinematic: ['#f8b66e', '#29205c', 'stars'],
  synthwave: ['#ff65b4', '#3521a0', 'city'],
  electronic: ['#59e7e6', '#3b2289', 'laser'],
  metal: ['#fa6868', '#24202c', 'guitar'],
  punk: ['#fda960', '#4b183b', 'guitar'],
  folk: ['#a7d48c', '#315a4e', 'guitar'],
  dabke: ['#f4b96d', '#753653', 'drum'],
  'r-and-b': ['#e68dcf', '#452665', 'vinyl'],
  'r&b': ['#e68dcf', '#452665', 'vinyl'],
};

function illustration(type: string) {
  switch (type) {
    case 'palms':
      return <><circle cx="165" cy="74" r="37" fill="#ffe2a0" opacity=".9" /><path d="M0 155Q110 108 240 158V200H0Z" fill="#123b36" opacity=".7"/>{[43,190].map((x) => <g key={x} transform={`translate(${x} 120)`}><path d="M0 60Q14-28 0-65" stroke="#153e33" strokeWidth="8" fill="none"/>{[-65,-30,0,30,65].map((a)=><path key={a} d="M0-65Q35-105 73-64Q30-81 0-65" transform={`rotate(${a} 0 -65)`} fill="#174b36"/>)}</g>)}</>;
    case 'drum':
      return <><path d="M67 69L176 69 158 167 88 167Z" fill="#8c3b23" stroke="#ffbd6c" strokeWidth="5"/><ellipse cx="121" cy="68" rx="55" ry="18" fill="#ffe1a1" stroke="#653221" strokeWidth="6"/>{[83,105,129,151].map(x=><path key={x} d={`M${x} 84L121 160`} stroke="#f5a355" strokeWidth="3" opacity=".8"/>)}<path d="M65 115Q121 155 176 115" stroke="#ffce76" strokeWidth="5" fill="none"/></>;
    case 'city':
      return <><circle cx="175" cy="53" r="35" fill="#ff9dc9" opacity=".6"/>{[10,36,64,89,120,148,176,202,226].map((x,i)=><rect key={x} x={x} y={94-(i*19%59)} width="23" height={115+(i*19%59)} fill={i%2?'#25245c':'#3c236b'} stroke="#d787df" strokeOpacity=".35"/>)}<path d="M0 157H240M0 173H240" stroke="#ff80e8" strokeWidth="2" opacity=".65"/></>;
    case 'disco':
      return <><path d="M120 0V40" stroke="#eacbff" strokeWidth="3"/><circle cx="120" cy="91" r="57" fill="#a24fdd" stroke="#f6b8ff" strokeWidth="3"/>{Array.from({length:7},(_,i)=><g key={i}><path d={`M${64+i*18} 42V141`} stroke="#fbd7ff" strokeWidth="2" opacity=".55"/><path d={`M65 ${48+i*15}H175`} stroke="#fbd7ff" strokeWidth="2" opacity=".55"/></g>)}<path d="M45 28L12 0M197 32L230 0M52 150L12 190M190 150L230 190" stroke="#ff8dec" strokeWidth="8" opacity=".7"/></>;
    case 'laser':
      return <>{[0,1,2,3].map(i=><path key={i} d={`M120 ${22+i*23}L${222-i*28} ${173-i*9}H${18+i*28}Z`} stroke={i%2?'#ff8fff':'#5deaff'} strokeWidth="4" fill="none" opacity={1-i*.15}/>)}<path d="M0 180L120 38 240 180" stroke="#b17aff" strokeWidth="2" opacity=".5"/></>;
    case 'vinyl':
      return <><g transform="translate(120 105) rotate(-19)"><ellipse rx="94" ry="78" fill="#1a1232" stroke="#d995ff" strokeWidth="4"/>{[77,62,48,35].map(r=><ellipse key={r} rx={r} ry={r*.83} fill="none" stroke="#b48acb" strokeWidth="2" opacity=".7"/>)}<ellipse rx="23" ry="19" fill="#b85cda"/><circle r="5" fill="#1a1232"/></g><path d="M202 23L172 83 148 110" stroke="#e6c2ff" strokeWidth="8" strokeLinecap="round" fill="none"/></>;
    case 'guitar':
      return <><g transform="translate(120 104) rotate(-30)"><path d="M-29 36C-77 18-57-50-18-44L0-25 18-44C57-50 77 18 29 36Q0 68-29 36Z" fill="#e58c58" stroke="#ffe0a0" strokeWidth="4"/><rect x="-9" y="-119" width="18" height="116" rx="4" fill="#7a3e4c"/><circle cx="0" cy="3" r="17" fill="#3a2346"/>{[-5,0,5].map(x=><path key={x} d={`M${x} -116V40`} stroke="#ffdfb5" strokeWidth="1.4"/> )}</g></>;
    case 'sax':
      return <><path d="M92 32Q137 10 137 60V121Q137 162 87 140L62 122 45 158Q105 196 154 154Q174 134 166 104L150 35" fill="none" stroke="#ffc969" strokeWidth="19" strokeLinecap="round"/><path d="M138 31L173 20" stroke="#ffebad" strokeWidth="9"/></>;
    default:
      return <>{Array.from({length:20},(_,i)=><circle key={i} cx={(i*79)%240} cy={(i*47)%190} r={i%3+1} fill="#fff" opacity=".7"/>)}<circle cx="122" cy="90" r="55" fill="none" stroke="#b8c6ff" strokeWidth="5"/><circle cx="122" cy="90" r="28" fill="#d6a2ff" opacity=".65"/></>;
  }
}

export function GenreArtwork({slug,index}:Props) {
  const theme=useMemo(()=>themes[slug.toLowerCase()] || ['#a46bff','#20234f',['stars','vinyl','laser','city'][index%4]], [slug,index]);
  return <svg aria-hidden="true" className="absolute inset-0 h-full w-full scale-100 transition-transform duration-700 ease-out group-hover:scale-110" viewBox="0 0 240 190" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id={`genre-${index}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={theme[0]}/><stop offset="1" stopColor={theme[1]}/></linearGradient></defs>
    <rect width="240" height="190" fill={`url(#genre-${index})`}/>
    <circle cx="195" cy="15" r="95" fill="#fff" opacity=".08"/>
    {illustration(theme[2])}
  </svg>;
}
