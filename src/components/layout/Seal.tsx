/** Original AMC city seal: a traditional lamp above the Thenmalai river, ringed by the corporation's name. */
export function Seal({ size = 52, title = "Astheenapuram Municipal Corporation seal" }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={title}>
      <defs>
        <path id="seal-top" d="M 18 60 A 42 42 0 0 1 102 60" />
        <path id="seal-bottom" d="M 14 60 A 46 46 0 0 0 106 60" />
      </defs>
      <circle cx="60" cy="60" r="58" fill="#0d4a6b" />
      <circle cx="60" cy="60" r="54" fill="none" stroke="#e9b44c" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="34" fill="#fbf4e4" stroke="#e9b44c" strokeWidth="2" />
      <text fill="#fbf4e4" fontSize="9.5" fontWeight="700" letterSpacing="1.6" fontFamily="sans-serif">
        <textPath href="#seal-top" startOffset="50%" textAnchor="middle">ASTHEENAPURAM</textPath>
      </text>
      <text fill="#e9b44c" fontSize="7" fontWeight="700" letterSpacing="1.2" fontFamily="sans-serif">
        <textPath href="#seal-bottom" startOffset="50%" textAnchor="middle" dominantBaseline="hanging">MUNICIPAL · CORPORATION</textPath>
      </text>
      <circle cx="16" cy="60" r="2" fill="#e9b44c" />
      <circle cx="104" cy="60" r="2" fill="#e9b44c" />
      {/* lamp */}
      <g fill="#c8641a">
        <path d="M60 34 c3 5 4 8 0 12 c-4 -4 -3 -7 0 -12z" fill="#e9b44c" />
        <path d="M50 42 c2 4 3 6 0 9 c-3 -3 -2 -5 0 -9z" fill="#e9b44c" />
        <path d="M70 42 c2 4 3 6 0 9 c-3 -3 -2 -5 0 -9z" fill="#e9b44c" />
        <path d="M44 51 h32 l-4 6 h-24z" />
        <rect x="58" y="57" width="4" height="13" />
        <path d="M52 70 h16 l3 5 h-22z" />
      </g>
      {/* river */}
      <g fill="none" stroke="#0d4a6b" strokeWidth="2" strokeLinecap="round">
        <path d="M38 80 q5.5 -4 11 0 t11 0 t11 0 t11 0" />
        <path d="M42 86 q4.5 -3.5 9 0 t9 0 t9 0 t9 0" />
      </g>
    </svg>
  );
}
