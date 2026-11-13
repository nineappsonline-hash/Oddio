export function OddioPlanet() {
  return (
    <div
      className="pointer-events-none relative mx-auto flex h-[175px] w-full max-w-[330px] items-center justify-center overflow-visible sm:h-[205px]"
      aria-hidden="true"
    >
      <div className="absolute inset-x-12 top-8 h-48 rounded-full bg-fuchsia-500/20 blur-[65px]" />
      <svg
        viewBox="0 0 460 310"
        className="relative h-full w-full overflow-visible drop-shadow-[0_0_38px_rgba(166,72,255,.4)]"
        role="img"
      >
        <defs>
          <radialGradient id="oddioSphere" cx="31%" cy="22%" r="80%">
            <stop stopColor="#ff9fe8" />
            <stop offset=".22" stopColor="#a96aff" />
            <stop offset=".56" stopColor="#5822b9" />
            <stop offset="1" stopColor="#110c3d" />
          </radialGradient>
          <linearGradient id="oddioRing" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#00edff" />
            <stop offset=".45" stopColor="#f67aff" />
            <stop offset="1" stopColor="#a03cff" />
          </linearGradient>
          <linearGradient id="oddioMetal" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#f4a8ff" />
            <stop offset=".48" stopColor="#7c45e9" />
            <stop offset="1" stopColor="#17234f" />
          </linearGradient>
          <filter id="oddioGlow">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <g className="origin-center animate-[spin_36s_linear_infinite]">
          <ellipse
            cx="226"
            cy="170"
            rx="208"
            ry="62"
            transform="rotate(-17 226 170)"
            fill="none"
            stroke="#b351ff"
            strokeWidth="11"
            opacity=".42"
            filter="url(#oddioGlow)"
          />
          <ellipse
            cx="226"
            cy="170"
            rx="208"
            ry="62"
            transform="rotate(-17 226 170)"
            fill="none"
            stroke="url(#oddioRing)"
            strokeWidth="4"
            opacity=".85"
          />
        </g>
        <circle cx="231" cy="152" r="116" fill="url(#oddioSphere)" />
        <circle cx="193" cy="92" r="13" fill="#391578" opacity=".32" />
        <circle cx="288" cy="126" r="19" fill="#2b115b" opacity=".34" />
        <circle cx="194" cy="203" r="9" fill="#26104f" opacity=".3" />
        <circle cx="270" cy="218" r="13" fill="#29115c" opacity=".32" />
        <path
          d="M140 137 C125 -15 351 -20 348 135"
          fill="none"
          stroke="#150d43"
          strokeWidth="34"
          strokeLinecap="round"
        />
        <path
          d="M140 137 C125 -15 351 -20 348 135"
          fill="none"
          stroke="url(#oddioMetal)"
          strokeWidth="24"
          strokeLinecap="round"
        />
        <g transform="rotate(-9 131 157)">
          <rect
            x="106"
            y="117"
            width="53"
            height="90"
            rx="24"
            fill="#180c42"
            stroke="#c681ff"
            strokeWidth="6"
          />
          <rect x="116" y="128" width="32" height="66" rx="16" fill="url(#oddioMetal)" />
        </g>
        <g transform="rotate(9 351 157)">
          <rect
            x="325"
            y="113"
            width="62"
            height="94"
            rx="29"
            fill="#130d35"
            stroke="#b77aff"
            strokeWidth="6"
          />
          <rect x="335" y="126" width="42" height="68" rx="21" fill="url(#oddioMetal)" />
          <path d="m351 146 18 14-18 14z" fill="#f4c5ff" />
        </g>
        <text
          x="225"
          y="180"
          textAnchor="middle"
          fontFamily="Arial,sans-serif"
          fontSize="58"
          fontWeight="900"
          letterSpacing="-5"
          fill="#f9d8ff"
          stroke="#a446fa"
          strokeWidth="1.5"
          paintOrder="stroke"
          transform="rotate(-8 225 170)"
        >
          oddio
        </text>
        <path
          d="M48 203 Q219 280 423 125"
          fill="none"
          stroke="url(#oddioRing)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity=".9"
        />
        <circle cx="62" cy="80" r="7" fill="#d795ff" opacity=".8" />
        <circle cx="412" cy="73" r="4" fill="#6deaff" />
        <circle cx="400" cy="239" r="7" fill="#bd5fff" opacity=".7" />
        <path d="m87 43 4 11 11 4-11 4-4 11-4-11-11-4 11-4z" fill="#d8a7ff" />
      </svg>
    </div>
  );
}
