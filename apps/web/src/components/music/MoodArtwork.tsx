type Props = { slug: string };
const moods: Record<string, { a: string; b: string; icon: string }> = {
  euphoric: { a: '#ff3f9e', b: '#5e16b8', icon: '🎉' },
  nocturnal: { a: '#172e66', b: '#080e2e', icon: '🌕' },
  nostalgic: { a: '#d68a48', b: '#4a203e', icon: '📼' },
  energetic: { a: '#f33b7a', b: '#3719a5', icon: '⚡' },
  calm: { a: '#f5a3b9', b: '#4c6a99', icon: '🪷' },
  mysterious: { a: '#6941a6', b: '#10162c', icon: '🔮' },
};
export function MoodArtwork({ slug }: Props) {
  const key = slug.toLowerCase().trim();
  const item = moods[key] ?? { a: '#7d4aff', b: '#10162c', icon: '✨' };
  const seed = [...key].reduce((n, c) => n + c.charCodeAt(0), 0);
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(155deg, ${item.a}, ${item.b})` }}>
      <svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full opacity-70">
        <defs><radialGradient id={`mood-${seed}`}><stop stopColor="#fff" stopOpacity=".5"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></radialGradient></defs>
        <circle cx="165" cy="65" r="100" fill={`url(#mood-${seed})`}/>
        {Array.from({length: 15}, (_, i) => <circle key={i} cx={(seed * (i + 3) * 7) % 240} cy={(seed * (i + 7) * 11) % 210} r={i % 3 + 1} fill="#fff" opacity=".5"/>)}
        <path d="M-20 175 Q55 110 115 170 T270 145 M-20 193 Q70 133 125 190 T270 165" stroke="#fff" strokeWidth="2" fill="none" opacity=".2"/>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center pb-8 text-[92px] drop-shadow-[0_15px_30px_rgba(0,0,0,.5)] transition-transform duration-700 group-hover:scale-110">{item.icon}</span>
      <div className="absolute inset-0 bg-gradient-to-t from-[#090818]/85 via-transparent to-transparent"/>
    </div>
  );
}
