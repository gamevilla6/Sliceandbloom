import { motion } from 'framer-motion';
export const Drop = ({ size = 12, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 100 120" style={{ width: `${size}vmin`, ...style }}>
    <path d="M50 4C70 30 92 54 92 78a42 42 0 0 1-84 0C8 54 30 30 50 4Z" fill="#6FB8F2" stroke="#247BEB" strokeWidth="5" />
    <circle cx="36" cy="80" r="5" fill="#14275C" /><circle cx="64" cy="80" r="5" fill="#14275C" />
    <path d="M43 92q7 7 14 0" stroke="#14275C" strokeWidth="4" fill="none" strokeLinecap="round" />
  </svg>
);
export const Flower = ({ size = 22, bloom = 0, style }: { size?: number; bloom?: number; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 100 160" style={{ width: `${size}vmin`, overflow: 'visible', ...style }}>
    <rect x="46" y="62" width="8" height="98" rx="4" fill="#4FB36B" />
    <path d="M50 130c-22 2-34-10-36-24 20-2 34 6 36 24ZM50 118c20 0 32-12 34-26-20-2-32 8-34 26Z" fill="#4FB36B" />
    <motion.g style={{ transformOrigin: '50px 40px' }} animate={{ scale: 0.55 + bloom * 0.6, rotate: (1 - bloom) * -35 }} transition={{ type: 'spring', stiffness: 160, damping: 9 }}>
      {[0, 72, 144, 216, 288].map(a => (
        <circle key={a} cx={50 + 22 * Math.sin((a * Math.PI) / 180)} cy={40 - 22 * Math.cos((a * Math.PI) / 180)} r="19" fill={bloom ? '#FFD348' : '#A39274'} style={{ transition: 'fill .3s' }} />
      ))}
      <circle cx="50" cy="40" r="13" fill={bloom ? '#FF9F43' : '#8A7B5E'} />
    </motion.g>
  </svg>
);
