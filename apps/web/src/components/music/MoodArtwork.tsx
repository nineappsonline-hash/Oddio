type Props = { slug: string };
const scenes: Record<string, string> = {
  romantic: '<circle cx="180" cy="65" r="45" fill="#ffb5c7"/><path d="M120 185 C-5 95 65 30 120 95 C175 30 245 95 120 185Z" fill="#fa5f9c" stroke="#ffd6e8" stroke-width="5"/>',
  focused: '<rect x="24" y="32" width="192" height="170" rx="12" fill="#18243a" stroke="#d6ab72" stroke-width="5"/><path d="M45 65 H185 M45 90 H165 M45 115 H185 M45 140 H135" stroke="#8bc9d6" stroke-width="7"/><circle cx="180" cy="166" r="18" fill="#ffc66d"/>',
  dreamy: '<circle cx="175" cy="65" r="38" fill="#f8d3f3"/><path d="M0 165 Q50 105 100 165 T240 165 V240 H0Z" fill="#a476d9"/><path d="M0 200 Q60 150 120 200 T240 200 V240 H0Z" fill="#4b3c9b"/><g fill="#fff"><circle cx="40" cy="35" r="4"/><circle cx="95" cy="70" r="3"/></g>',
  melancholic: '<path d="M0 0 H240 V240 H0Z" fill="#283a61"/><path d="M120 28 C65 28 40 82 42 120 Q120 100 198 120 C200 82 175 28 120 28Z" fill="#7186ac"/><path d="M120 112 V205" stroke="#d7e1ff" stroke-width="8"/><path d="M50 135 L30 180 M85 148 L65 200 M165 145 L145 210 M205 140 L185 190" stroke="#86b9e6" stroke-width="6"/>',
  hopeful: '<circle cx="120" cy="115" r="63" fill="#ffd26e"/><path d="M0 170 L65 110 L110 150 L175 90 L240 155 V240 H0Z" fill="#6a9e8a"/><path d="M0 205 L90 155 L150 195 L240 130 V240 H0Z" fill="#2d6c7e"/>',
  chill: '<path d="M0 150 Q60 110 120 150 T240 150 V240 H0Z" fill="#5bc6cc"/><path d="M0 180 Q70 150 140 180 T280 180" fill="none" stroke="#e5ffed" stroke-width="8"/><path d="M40 120 L58 45 L76 120 M58 45 L30 75 M58 45 L100 65" stroke="#184d64" stroke-width="10" fill="none"/>',
  adventurous: '<path d="M0 190 L55 75 L95 140 L145 45 L240 190 V240 H0Z" fill="#365b87"/><path d="M112 100 L145 45 L177 102 L149 89 L132 108Z" fill="#e2f6ff"/><circle cx="55" cy="50" r="24" fill="#ffca77"/>',
  peaceful: '<circle cx="120" cy="90" r="42" fill="#ffe3bd"/><path d="M0 170 Q60 130 120 170 T240 170 V240 H0Z" fill="#89b9a3"/><path d="M0 205 Q60 165 120 205 T240 205 V240 H0Z" fill="#456c86"/><path d="M95 172 Q120 122 145 172 Q120 192 95 172Z" fill="#f7e1d8"/>',
  euphoric: '<path d="M0 145 Q60 80 120 145 T240 125" fill="none" stroke="#ff83d9" stroke-width="9"/><g fill="#ffb7f1"><circle cx="42" cy="75" r="7"/><circle cx="190" cy="45" r="9"/><circle cx="135" cy="100" r="5"/></g><path d="M20 240 L48 154 L70 220 L105 134 L135 240 L165 154 L210 240" fill="#220c4c" stroke="#ff5ad8" stroke-width="4"/><path d="M0 60 L240 0 M0 0 L240 85" stroke="#fff" opacity=".35" stroke-width="8"/>',
  nocturnal: '<circle cx="172" cy="55" r="38" fill="#f6f1e7"/><circle cx="158" cy="43" r="37" fill="#233a66"/><g fill="#fff"><circle cx="30" cy="42" r="2"/><circle cx="100" cy="25" r="2"/><circle cx="214" cy="112" r="2"/></g><path d="M0 170 L25 170 L25 115 L50 115 L50 150 L75 150 L75 82 L105 82 L105 130 L130 130 L130 95 L155 95 L155 155 L190 155 L190 122 L225 122 L225 175 L240 175 L240 240 L0 240Z" fill="#09152d"/><path d="M0 195 Q120 180 240 195" stroke="#4c91cb" stroke-width="3" fill="none"/>',
  nostalgic: '<rect x="25" y="76" width="190" height="116" rx="14" fill="#dba16d" stroke="#ffdcad" stroke-width="5"/><rect x="44" y="94" width="152" height="57" rx="5" fill="#5a2f32"/><circle cx="82" cy="122" r="24" fill="#241f29" stroke="#eac19b" stroke-width="7"/><circle cx="158" cy="122" r="24" fill="#241f29" stroke="#eac19b" stroke-width="7"/><path d="M70 170 L170 170" stroke="#5a2f32" stroke-width="7"/><path d="M45 48 L194 48" stroke="#ffdca9" stroke-width="3" opacity=".5"/>',
  energetic: '<path d="M0 20 L240 115 M0 85 L240 190 M0 160 L240 240" stroke="#fa4ee9" stroke-width="13" opacity=".65"/><path d="M50 0 L240 105 M0 130 L190 240" stroke="#3ae5ff" stroke-width="8" opacity=".8"/><path d="M135 42 L84 132 L129 132 L96 216 L193 111 L143 111 L175 42Z" fill="#fff2ac" stroke="#ff60dc" stroke-width="5"/>',
  calm: '<circle cx="185" cy="60" r="48" fill="#ffd2a9" opacity=".9"/><path d="M0 153 Q45 128 90 153 T180 153 T270 153 L270 240 L0 240Z" fill="#7b9db5"/><path d="M0 185 Q60 160 120 185 T240 185 L240 240 L0 240Z" fill="#3c6389"/><ellipse cx="120" cy="189" rx="65" ry="10" fill="#f1c6c0"/><path d="M93 180 Q120 132 147 180 Q120 197 93 180Z" fill="#f5d3d6"/>',
  mysterious: '<path d="M0 240 L0 0 L28 0 L56 240 M240 240 L240 0 L209 0 L184 240" stroke="#24123f" stroke-width="32"/><path d="M52 240 L90 0 M184 240 L145 0" stroke="#3c215b" stroke-width="19"/><circle cx="120" cy="98" r="47" fill="#d67aff" opacity=".35"/><path d="M95 155 L120 103 L145 155 L120 142Z" fill="#b967f6"/><path d="M0 211 Q120 164 240 211" fill="none" stroke="#c77cfa" stroke-width="7" opacity=".5"/>',
};
const palettes: Record<string,[string,string]> = {
 romantic:['#a83076','#301139'],
 focused:['#34495d','#10162c'],
 dreamy:['#b777d4','#312563'],
 melancholic:['#52678e','#1c294a'],
 hopeful:['#ffb56c','#356e79'],
 chill:['#4cc5c9','#15476c'],
 adventurous:['#6699a7','#1e325f'],
 peaceful:['#e6bca9','#477f90'],
 euphoric:['#e53e91','#210c48'], nocturnal:['#163c69','#070b23'], nostalgic:['#9a5834','#28142a'], energetic:['#7525b9','#0c1647'], calm:['#e9a7b5','#335b86'], mysterious:['#60368a','#0a0b23']
};
export function MoodArtwork({ slug }: Props) {
 const key=slug.toLowerCase().trim();
 const [a,b]=palettes[key]??['#6b39b2','#0a0b23'];
 const scene=scenes[key]??scenes.mysterious;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 240 240"><defs><linearGradient id="bg" x2="0.8" y2="1"><stop stop-color="'+a+'"/><stop offset="1" stop-color="'+b+'"/></linearGradient></defs><rect width="240" height="240" fill="url(#bg)"/>'+scene+'</svg>';
 return <div aria-hidden="true" className="absolute inset-0 overflow-hidden"><div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{backgroundImage:'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")'}}/><div className="absolute inset-0 bg-gradient-to-t from-[#090818]/85 via-transparent to-transparent"/></div>;
}
