import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Drop, Flower } from './Art';

const wrap: React.CSSProperties = { position: 'absolute', inset: 0, overflow: 'hidden' };
const big = (s: number): React.CSSProperties => ({ fontSize: `${s}vmin`, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' });
const ease = [0.22, 1, 0.36, 1] as const;
function useAt(ms: number[]) {
  const [t, setT] = useState(0);
  useEffect(() => { const ids = ms.map((m, i) => window.setTimeout(() => setT(i + 1), m)); return () => ids.forEach(clearTimeout); }, []); // eslint-disable-line
  return t;
}
const Word = ({ children, d = 0, s = 12, color }: { children: string; d?: number; s?: number; color?: string }) => (
  <div style={{ overflow: 'hidden', paddingBottom: '1vmin' }}>
    <motion.div style={{ ...big(s), color }} initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ delay: d, duration: 0.6, ease }}>{children}</motion.div>
  </div>
);

export function Hook() {
  return (
    <motion.div style={{ ...wrap, background: 'linear-gradient(#7CC4FF,#FFF5D6 75%)' }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <motion.div style={{ position: 'absolute', left: '62%', top: '8%' }} initial={{ y: '-60vh' }} animate={{ y: ['-60vh', '34vh', '30vh', '34vh'] }} transition={{ duration: 3, times: [0, 0.5, 0.7, 1], ease: 'easeIn' }}><Drop size={16} /></motion.div>
      <div style={{ position: 'absolute', left: '60%', bottom: '4%' }}><Flower size={34} bloom={0} /></div>
      <div style={{ position: 'absolute', left: '6%', top: '22%' }}>
        <Word s={15}>Guide</Word><Word s={15} d={0.2} color="#247BEB">the drop.</Word>
        <motion.p style={{ fontSize: '3.4vmin', fontWeight: 500, marginTop: '2vmin' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>One thirsty flower. One tiny water droplet.</motion.p>
      </div>
      <motion.div style={{ position: 'absolute', inset: 0, background: '#FFD348' }} initial={{ x: '0%' }} animate={{ x: '105%' }} transition={{ duration: 0.5, ease }} />
    </motion.div>
  );
}

export function Ramp() {
  const t = useAt([300, 1200]);
  return (
    <motion.div style={{ ...wrap, background: '#FFF5D6' }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <svg viewBox="0 0 160 90" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <motion.path d="M20 40 Q 70 48 118 70" stroke="#EBAE50" strokeWidth="4" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 1, ease }} />
        <motion.path d="M20 40 Q 70 48 118 70" stroke="#A8691F" strokeWidth="1" strokeLinecap="round" fill="none" strokeDasharray="1 3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} />
      </svg>
      <motion.div style={{ position: 'absolute', left: '8%', top: '2%' }} initial={{ y: '-20vh', opacity: 1 }} animate={{ y: '5vh' }} transition={{ duration: 0.5, ease }}><Drop size={11} /></motion.div>
      <motion.div style={{ position: 'absolute', left: '8%', top: '2%' }} initial={{ x: 0, y: '5vh' }} animate={t >= 2 ? { x: ['0vw', '35vw', '60vw'], y: ['5vh', '20vh', '52vh'] } : {}} transition={{ duration: 1.8, ease: 'easeIn' }}>{t >= 2 && <Drop size={11} />}</motion.div>
      <div style={{ position: 'absolute', right: '6%', bottom: '2%' }}><Flower size={30} bloom={t >= 2 ? 0 : 0} /></div>
      <div style={{ position: 'absolute', left: '6%', bottom: '8%' }}>
        <div style={{ fontSize: '2.2vmin', fontWeight: 700, letterSpacing: '.15em', color: '#247BEB' }}>DRAW</div>
        <Word s={11} d={0.3}>Draw a ramp.</Word>
      </div>
    </motion.div>
  );
}

export function Slice() {
  const t = useAt([900, 1500]);
  return (
    <motion.div style={{ ...wrap, background: '#14275C', color: '#FFF5D6' }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, width: '1vmin', height: '34%', background: '#EBAE50', transform: 'translateX(-50%)' }} />
      <motion.div style={{ position: 'absolute', left: '50%', top: '34%', marginLeft: '-8vmin' }} animate={t >= 2 ? { y: '38vh' } : { y: [0, 1.5, 0] }} transition={t >= 2 ? { duration: 0.7, ease: 'easeIn' } : { duration: 0.4, repeat: Infinity }}><Drop size={16} /></motion.div>
      <motion.div style={{ position: 'absolute', left: '40%', top: '28%', width: '20%', height: '0.6vmin', background: '#FFFDF5', rotate: '-20deg', transformOrigin: 'left' }} initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: t >= 1 ? [0, 1.6] : 0, opacity: t >= 2 ? 0 : 1 }} transition={{ duration: 0.2 }} />
      <div style={{ position: 'absolute', left: '6%', top: '12%' }}>
        <div style={{ fontSize: '2.2vmin', fontWeight: 700, letterSpacing: '.15em', color: '#FFD348' }}>SLICE</div>
        <Word s={11} d={0.2}>Cut the rope.</Word>
      </div>
      <div style={{ position: 'absolute', right: '6%', bottom: '8%', textAlign: 'right' }}>
        <Word s={7} d={1}>Or slice the</Word><Word s={7} d={1.15} color="#FF665A">obstacles.</Word>
      </div>
      <div style={{ position: 'absolute', left: '40%', bottom: 0, width: '20%', height: '6%', background: '#4FB36B', borderRadius: '3vmin 3vmin 0 0' }} />
    </motion.div>
  );
}

const MODES = [['Campaign', 100, '#4FB36B'], ['Hardcore', 100, '#FF665A'], ['Genesis Gauntlet', 100, '#FFD348'], ['Void Protocol', 110, '#9B4DFF'], ['Singularity Paradox', 55, '#4CEBFF']] as const;
export function Modes() {
  const t = useAt([300, 700, 1100, 1500, 1900, 2600]);
  const total = Math.min(465, [0, 100, 200, 300, 410, 465][Math.min(t, 5)]);
  return (
    <motion.div style={{ ...wrap, background: '#FFF5D6' }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ position: 'absolute', left: '6%', top: '50%', transform: 'translateY(-50%)' }}>
        <motion.div style={{ ...big(34), color: '#247BEB' }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease }}>{total}</motion.div>
        <div style={{ fontSize: '5vmin', fontWeight: 600, marginTop: '1vmin' }}>stages to bloom</div>
      </div>
      <div style={{ position: 'absolute', right: '6%', top: '50%', transform: 'translateY(-50%)', width: '44%', display: 'grid', gap: '1.6vmin' }}>
        {MODES.map(([n, c, col], i) => (
          <motion.div key={n} initial={{ opacity: 0, scale: 0.85 }} animate={t > i ? { opacity: 1, scale: 1 } : {}} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            style={{ display: 'flex', alignItems: 'center', gap: '2vmin', padding: '1.8vmin 2.4vmin', background: '#FFFDF5', border: '0.5vmin solid #FFE79A', borderRadius: '2.4vmin' }}>
            <div style={{ width: '4.4vmin', height: '4.4vmin', borderRadius: '50%', background: col }} />
            <div style={{ flex: 1, fontSize: '3.6vmin', fontWeight: 700 }}>{n}</div>
            <div style={{ fontSize: '4vmin', fontWeight: 700 }}>{c}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export function Finale() {
  const t = useAt([1400, 2200]);
  return (
    <motion.div style={{ ...wrap, background: '#247BEB', color: '#FFF5D6' }}>
      <motion.div style={{ position: 'absolute', left: '50%', top: '50%', width: '10vmin', height: '10vmin', marginLeft: '-5vmin', marginTop: '-5vmin', borderRadius: '50%', background: '#FFF5D6' }} initial={{ scale: 0 }} animate={{ scale: 18 }} transition={{ duration: 1.2, ease }} />
      <div style={{ position: 'absolute', left: '50%', bottom: '4%', marginLeft: '-14vmin' }}><Flower size={28} bloom={t >= 1 ? 1 : 0} /></div>
      <motion.div style={{ position: 'absolute', left: '50%', top: '5%', marginLeft: '-7vmin' }} initial={{ y: '-30vh' }} animate={{ y: '38vh', opacity: [1, 1, 0] }} transition={{ duration: 1.4, ease: 'easeIn', times: [0, 0.9, 1] }}><Drop size={14} /></motion.div>
      <motion.div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#14275C', paddingBottom: '14vh' }} initial={{ opacity: 0 }} animate={{ opacity: t >= 1 ? 1 : 0 }}>
        <img src={`${import.meta.env.BASE_URL}img/icon.png`} style={{ width: '16vmin', borderRadius: '4vmin' }} />
        <div style={{ ...big(13), marginTop: '2vmin' }}>Slice &amp; Bloom</div>
        <div style={{ fontSize: '3.4vmin', fontWeight: 500, marginTop: '1.6vmin' }}>Draw. Slice. Bloom.</div>
      </motion.div>
    </motion.div>
  );
}
