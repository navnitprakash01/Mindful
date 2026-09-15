import React, { useState, useMemo, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { useAmbientAudio } from '../../context/AmbientAudioContext';
import {
  BookOpen,
  Sparkles,
  Activity,
  CheckCircle2,
  TrendingUp,
  Flame,
  ArrowRight,
  ArrowDown,
  Wind,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MoodCheckInModal } from './MoodCheckInModal';
import { PageTransition } from '../ui/PageTransition';


export const ZenDashboard: React.FC = () => {
  const {
    userProfile,
    setCurrentView,
    habits,
    journalEntries,
    moodLogs,
    personalState,
  } = useApp();

  const { isPlaying, togglePlayback } = useAmbientAudio();
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const firstName = userProfile?.name?.trim()?.split(' ')[0] || 'Friend';
  const totalHabitsToday = habits.filter((h) => h.completedDates.includes(todayStr)).length;
  const habitCompletion = habits.length
    ? Math.round((totalHabitsToday / habits.length) * 100)
    : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // 60fps pointer parallax via CSS variables
  const heroRef = useRef<HTMLElement>(null);
  const rafIdRef = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (shouldReduceMotion || !heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (heroRef.current) {
        heroRef.current.style.setProperty('--mx', `${x.toFixed(4)}`);
        heroRef.current.style.setProperty('--my', `${y.toFixed(4)}`);
      }
    });
  }, [shouldReduceMotion]);

  const handleMouseLeave = useCallback(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (heroRef.current) {
      heroRef.current.style.setProperty('--mx', '0');
      heroRef.current.style.setProperty('--my', '0');
    }
  }, []);

  return (
    <PageTransition transitionKey="dashboard">
      <MoodCheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
      />

      <div className="relative w-full select-none bg-[#040614]">

        {/* ============================================================
            CINEMATIC DASHBOARD HERO (SELF-CONTAINED VIEWPORT COMPOSITION)
            ============================================================ */}
        <section
          ref={heroRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative w-full overflow-hidden flex flex-col justify-between"
          style={{
            minHeight: '100svh',
            height: '100svh',
            overflow: 'hidden',
            paddingTop: '74px',
            paddingBottom: '16px',
            ['--mx' as any]: '0',
            ['--my' as any]: '0',
            ['--orb-size' as any]: 'clamp(250px, 19vw, 290px)',
            ['--card-width' as any]: 'clamp(280px, 18vw, 295px)',
            ['--card-height' as any]: '128px',
            ['--card-gap' as any]: '18px',
          }}
        >

          {/* ============================================================
              LAYER 0 — CINEMATIC BACKGROUND ENVIRONMENT
              ============================================================ */}
          {/* Deep Night Sky Gradient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 130% 80% at 50% 0%, #0d1238 0%, #070a22 45%, #03040c 100%)',
            }}
          />

          {/* Atmospheric Violet/Magenta Nebular Bloom Behind Orb */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '46%',
              left: '50%',
              width: '720px',
              height: '520px',
              transform: `translate(calc(-50% + var(--mx) * 16px), calc(-50% + var(--my) * 12px))`,
              background: 'radial-gradient(ellipse at center, rgba(147,51,234,0.30) 0%, rgba(219,39,119,0.14) 35%, rgba(79,70,229,0.06) 60%, transparent 75%)',
              filter: 'blur(50px)',
            }}
          />

          {/* Warm Horizon Light Band */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '58%',
              left: '50%',
              width: '100%',
              height: '180px',
              transform: 'translateX(-50%)',
              background: 'radial-gradient(ellipse 70% 100% at center, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.08) 50%, transparent 80%)',
              filter: 'blur(45px)',
            }}
          />

          {/* Distant Mountain Silhouettes */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(calc(var(--mx) * -6px), calc(var(--my) * -4px))`,
            }}
          >
            <svg
              className="absolute w-full"
              style={{ bottom: '26%', height: '42%', opacity: 0.65 }}
              viewBox="0 0 1440 380"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="mtn-back" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#111638" />
                  <stop offset="65%" stopColor="#0a0d24" />
                  <stop offset="100%" stopColor="#050716" />
                </linearGradient>
              </defs>
              <path
                fill="url(#mtn-back)"
                d="M0,320 L50,270 L120,300 L190,230 L270,270 L350,210 L430,260 L510,180 L590,230 L670,160 L740,210 L820,150 L900,200 L980,135 L1060,190 L1140,120 L1220,180 L1300,140 L1380,185 L1440,160 L1440,380 L0,380 Z"
              />
            </svg>
          </div>

          {/* Midground Cliffs with Waterfall (Right) and Tree Foliage (Left) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(calc(var(--mx) * -12px), calc(var(--my) * -8px))`,
            }}
          >
            <svg
              className="absolute w-full"
              style={{ bottom: '15%', height: '52%', opacity: 0.88 }}
              viewBox="0 0 1440 450"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="cliff-mid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0c102b" />
                  <stop offset="50%" stopColor="#07091c" />
                  <stop offset="100%" stopColor="#03040e" />
                </linearGradient>
                <linearGradient id="waterfall-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.75" />
                </linearGradient>
              </defs>
              <path
                fill="url(#cliff-mid)"
                d="M0,450 L0,180 Q30,160 60,200 Q90,170 120,230 Q160,190 200,260 Q240,230 290,290 L360,330 L420,380 L0,380 Z"
              />
              <path
                fill="url(#cliff-mid)"
                d="M1440,450 L1440,160 Q1400,150 1370,190 Q1330,160 1290,220 Q1240,180 1190,240 Q1150,210 1100,280 L1020,340 L960,390 L1440,390 Z"
              />
              <path
                fill="url(#waterfall-grad)"
                d="M1365,190 Q1360,250 1358,310 Q1355,360 1352,400 L1342,400 Q1346,360 1350,310 Q1353,250 1357,190 Z"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.75))',
                  animation: 'waterfallFlow 2s ease-in-out infinite alternate',
                }}
              />
              <ellipse
                cx="1350"
                cy="400"
                rx="24"
                ry="6"
                fill="rgba(56,189,248,0.60)"
                style={{ filter: 'blur(4px)' }}
              />
            </svg>
          </div>

          {/* Distant Warm Village & Temple Lantern Lights along Ridges */}
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: '18%',
              left: '0',
              right: '0',
              height: '24px',
              overflow: 'visible',
            }}
          >
            {[
              { left: '4%', bottom: '80px', sz: 4, col: 'rgba(251,191,36,0.9)', d: 0 },
              { left: '7%', bottom: '55px', sz: 3, col: 'rgba(245,158,11,0.85)', d: 1.1 },
              { left: '11%', bottom: '40px', sz: 3.5, col: 'rgba(251,191,36,0.9)', d: 0.5 },
              { left: '16%', bottom: '25px', sz: 2.5, col: 'rgba(245,158,11,0.75)', d: 2.3 },
              { left: '22%', bottom: '15px', sz: 3, col: 'rgba(251,191,36,0.8)', d: 1.6 },
              { left: '78%', bottom: '18px', sz: 3, col: 'rgba(251,191,36,0.8)', d: 0.7 },
              { left: '83%', bottom: '30px', sz: 3.5, col: 'rgba(245,158,11,0.9)', d: 2.0 },
              { left: '88%', bottom: '50px', sz: 4, col: 'rgba(251,191,36,0.95)', d: 1.4 },
              { left: '92%', bottom: '70px', sz: 3, col: 'rgba(245,158,11,0.85)', d: 0.3 },
              { left: '96%', bottom: '90px', sz: 3.5, col: 'rgba(251,191,36,0.9)', d: 1.8 },
            ].map((l, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: l.left,
                  bottom: l.bottom,
                  width: `${l.sz}px`,
                  height: `${l.sz}px`,
                  background: l.col,
                  boxShadow: `0 0 ${l.sz * 4}px ${l.col}, 0 0 ${l.sz * 8}px rgba(245,158,11,0.5)`,
                  animation: `villageLight ${2.5 + i * 0.6}s ease-in-out ${l.d}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Reflective Water Plane */}
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{ height: '36%' }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, #06091c 0%, #040612 40%, #02030a 100%)',
              }}
            />
            <div
              className="absolute top-0 left-0 right-0"
              style={{
                height: '1px',
                background: 'linear-gradient(to right, transparent 5%, rgba(139,92,246,0.35) 25%, rgba(217,119,6,0.5) 50%, rgba(56,189,248,0.4) 75%, transparent 95%)',
                boxShadow: '0 0 10px rgba(139,92,246,0.3)',
              }}
            />
            {/* Horizontal Water Shimmer Lines */}
            {[0.12, 0.28, 0.44, 0.62, 0.80].map((pct, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  top: `${pct * 100}%`,
                  left: '12%',
                  right: '12%',
                  height: '1px',
                  background: `rgba(139,92,246,${0.10 + i * 0.02})`,
                  boxShadow: '0 0 8px rgba(139,92,246,0.2)',
                  animation: `waterLineShimmer ${4.5 + i * 1.2}s ease-in-out ${i * 0.7}s infinite`,
                }}
              />
            ))}
            {/* Central Orb Water Reflection Pillar */}
            <div
              className="absolute anim-water-shimmer"
              style={{
                top: '0',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '380px',
                height: '85%',
                background: 'radial-gradient(ellipse at top center, rgba(168,85,247,0.38) 0%, rgba(219,39,119,0.22) 35%, rgba(79,70,229,0.12) 65%, transparent 85%)',
                filter: 'blur(10px)',
                animation: 'waterReflectionPulse 6s ease-in-out infinite',
              }}
            />
            {/* Lantern Light Reflections on Water */}
            {[
              { left: '10%', top: '20%', sz: 2 },
              { left: '18%', top: '35%', sz: 2.5 },
              { left: '82%', top: '25%', sz: 2 },
              { left: '90%', top: '40%', sz: 2.5 },
            ].map((r, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: r.left,
                  top: r.top,
                  width: `${r.sz * 4}px`,
                  height: `${r.sz}px`,
                  background: 'rgba(251,191,36,0.7)',
                  filter: 'blur(1px)',
                  animation: `villageLight ${3 + i}s ease-in-out ${i * 0.8}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Left Foreground Rocks with Stone Lanterns */}
          <div
            className="absolute bottom-0 left-0 pointer-events-none"
            style={{
              width: '260px',
              height: '180px',
              transform: `translate(calc(var(--mx) * -16px), calc(var(--my) * -10px))`,
            }}
          >
            <svg viewBox="0 0 260 180" className="w-full h-full" preserveAspectRatio="none">
              <path fill="#03040a" d="M0,180 L0,60 Q30,45 60,70 Q90,40 130,65 Q170,35 210,75 Q235,60 260,95 L260,180 Z" />
              <path fill="#020206" d="M0,180 L0,90 Q40,75 80,95 Q120,70 160,90 Q200,80 240,115 L260,180 Z" />
            </svg>
            <div
              className="absolute rounded-full"
              style={{
                bottom: '95px',
                left: '85px',
                width: '6px',
                height: '8px',
                background: 'radial-gradient(circle, #fffbeb 20%, #f59e0b 80%)',
                boxShadow: '0 0 16px rgba(245,158,11,0.9), 0 0 35px rgba(217,119,6,0.6)',
                animation: 'villageLight 3.5s ease-in-out infinite',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                bottom: '120px',
                left: '145px',
                width: '5px',
                height: '7px',
                background: 'radial-gradient(circle, #fffbeb 20%, #f59e0b 80%)',
                boxShadow: '0 0 14px rgba(245,158,11,0.85), 0 0 28px rgba(217,119,6,0.5)',
                animation: 'villageLight 4s ease-in-out 1.2s infinite',
              }}
            />
          </div>

          {/* Right Foreground Rocks with Stone Lanterns */}
          <div
            className="absolute bottom-0 right-0 pointer-events-none"
            style={{
              width: '260px',
              height: '175px',
              transform: `translate(calc(var(--mx) * -16px), calc(var(--my) * -10px))`,
            }}
          >
            <svg viewBox="0 0 260 175" className="w-full h-full" preserveAspectRatio="none">
              <path fill="#03040a" d="M260,175 L260,55 Q230,40 195,65 Q160,35 120,60 Q80,30 40,70 Q20,60 0,90 L0,175 Z" />
              <path fill="#020206" d="M260,175 L260,85 Q220,70 175,90 Q130,65 90,85 Q50,75 10,110 L0,175 Z" />
            </svg>
            <div
              className="absolute rounded-full"
              style={{
                bottom: '90px',
                right: '90px',
                width: '6px',
                height: '8px',
                background: 'radial-gradient(circle, #fffbeb 20%, #f59e0b 80%)',
                boxShadow: '0 0 16px rgba(245,158,11,0.9), 0 0 35px rgba(217,119,6,0.6)',
                animation: 'villageLight 3.8s ease-in-out 0.6s infinite',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                bottom: '115px',
                right: '150px',
                width: '5px',
                height: '7px',
                background: 'radial-gradient(circle, #fffbeb 20%, #f59e0b 80%)',
                boxShadow: '0 0 14px rgba(245,158,11,0.85), 0 0 28px rgba(217,119,6,0.5)',
                animation: 'villageLight 4.2s ease-in-out 1.8s infinite',
              }}
            />
          </div>

          {/* ============================================================
              LAYER 1 — ENVIRONMENTAL ANIMATION OVERLAYS
              ============================================================ */}
          {/* Scattered Twinkling Sky Stars */}
          <div className="absolute inset-0 pointer-events-none" style={{ height: '55%' }}>
            {[
              { top: '6%', left: '7%', sz: 2, d: 0 },
              { top: '12%', left: '16%', sz: 1.5, d: 1.2 },
              { top: '8%', left: '28%', sz: 2, d: 2.4 },
              { top: '18%', left: '38%', sz: 1.5, d: 0.8 },
              { top: '5%', left: '52%', sz: 2.5, d: 3.1 },
              { top: '14%', left: '64%', sz: 1.5, d: 1.7 },
              { top: '9%', left: '74%', sz: 2, d: 0.5 },
              { top: '16%', left: '88%', sz: 1.5, d: 2.1 },
              { top: '24%', left: '12%', sz: 1.5, d: 1.4 },
              { top: '22%', left: '32%', sz: 1.2, d: 2.8 },
              { top: '26%', left: '46%', sz: 1.5, d: 0.3 },
              { top: '28%', left: '70%', sz: 1.2, d: 1.9 },
              { top: '22%', left: '92%', sz: 2, d: 2.6 },
            ].map((s, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  top: s.top,
                  left: s.left,
                  width: `${s.sz}px`,
                  height: `${s.sz}px`,
                  background: 'rgba(230,235,255,0.9)',
                  boxShadow: `0 0 ${s.sz * 2.5}px rgba(210,225,255,0.7)`,
                  animation: `starTwinkle ${3 + i * 0.7}s ease-in-out ${s.d}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Floating Atmospheric Embers / Fireflies */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[
              { bottom: '22%', left: '16%', cls: 'anim-particle-1', w: 3, h: 3, color: 'rgba(251,191,36,0.9)', glow: 'rgba(245,158,11,0.85)' },
              { bottom: '36%', left: '32%', cls: 'anim-particle-2', w: 2, h: 2, color: 'rgba(192,132,252,0.85)', glow: 'rgba(168,85,247,0.7)' },
              { bottom: '28%', right: '18%', cls: 'anim-particle-3', w: 3.5, h: 3.5, color: 'rgba(251,191,36,0.95)', glow: 'rgba(245,158,11,0.8)' },
              { bottom: '48%', right: '28%', cls: 'anim-particle-4', w: 2, h: 2, color: 'rgba(56,189,248,0.85)', glow: 'rgba(14,165,233,0.7)' },
              { bottom: '18%', left: '52%', cls: 'anim-particle-1', w: 2.5, h: 2.5, color: 'rgba(251,191,36,0.8)', glow: 'rgba(217,119,6,0.7)' },
              { bottom: '52%', left: '10%', cls: 'anim-particle-3', w: 2, h: 2, color: 'rgba(216,180,254,0.75)', glow: 'rgba(192,132,252,0.6)' },
              { bottom: '32%', right: '10%', cls: 'anim-particle-2', w: 2.5, h: 2.5, color: 'rgba(251,191,36,0.85)', glow: 'rgba(245,158,11,0.7)' },
              { bottom: '58%', left: '42%', cls: 'anim-particle-4', w: 1.5, h: 1.5, color: 'rgba(129,140,248,0.7)', glow: 'rgba(99,102,241,0.6)' },
            ].map((p, i) => (
              <div
                key={i}
                className={`absolute rounded-full ${p.cls}`}
                style={{
                  bottom: p.bottom,
                  left: 'left' in p ? (p as any).left : undefined,
                  right: 'right' in p ? (p as any).right : undefined,
                  width: `${p.w}px`,
                  height: `${p.h}px`,
                  background: p.color,
                  boxShadow: `0 0 ${p.w * 5}px ${p.glow}`,
                  animationDelay: `${i * 1.2}s`,
                }}
              />
            ))}
          </div>

          {/* Top-Right Celestial Moon with Atmospheric Halo & Quote */}
          <div
            className="absolute z-20 pointer-events-none flex items-center gap-4"
            style={{
              top: '80px',
              right: 'clamp(20px, 5vw, 60px)',
              transform: `translate(calc(var(--mx) * -8px), calc(var(--my) * -5px))`,
            }}
          >
            <div className="hidden md:flex flex-col text-right leading-tight select-none">
              <span
                className="text-xs italic font-serif"
                style={{
                  color: 'rgba(254,243,199,0.75)',
                  textShadow: '0 0 12px rgba(245,158,11,0.3)',
                }}
              >
                &ldquo;Calm is the cradle of your mind&rdquo;
              </span>
              <span className="text-[10px] text-amber-200/40 font-mono mt-0.5">
                ~ Zen reflection
              </span>
            </div>

            <div className="relative">
              {/* Soft atmospheric halo */}
              <div
                className="absolute inset-[-40px] rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(245,158,11,0.22) 0%, rgba(217,119,6,0.10) 45%, transparent 70%)',
                  filter: 'blur(16px)',
                  animation: 'moonHaloBreath 8s ease-in-out infinite',
                }}
              />
              {/* Moon body */}
              <div
                className="relative anim-moon-glow"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 65% 45%, #fffbeb 0%, #fef3c7 25%, #f59e0b 60%, #b45309 85%, #78350f 100%)',
                  boxShadow: '0 0 25px rgba(245,158,11,0.65), 0 0 60px rgba(217,119,6,0.35)',
                }}
              >
                {/* Crescent shadow mask */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 25% 40%, rgba(6,8,22,0.92) 48%, transparent 72%)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ============================================================
              LAYER 2 — SINGLE AUTHORITATIVE MINDFUL REACT UI
              ============================================================ */}

          {/* ── 1. GREETING (EXACTLY ONE INSTANCE) ── */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center px-4 mt-2 z-20"
          >
            <span
              className="block text-[11px] font-semibold tracking-[0.32em] uppercase mb-1.5"
              style={{
                color: 'rgba(196,181,253,0.85)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              — A CALMER YOU —
            </span>
            <h1
              className="tracking-tight"
              style={{
                fontFamily: 'var(--font-display, "Instrument Serif", Georgia, serif)',
                fontSize: 'clamp(2.5rem, 5.2vw, 4rem)',
                fontWeight: 400,
                lineHeight: 1.08,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #ffffff 0%, #ede9fe 40%, #ddd6fe 70%, #c4b5fd 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 30px rgba(167,139,250,0.50))',
              }}
            >
              {greeting}, {firstName}.
            </h1>
            <p
              className="mt-1"
              style={{
                fontFamily: 'var(--font-display, "Instrument Serif", Georgia, serif)',
                fontStyle: 'italic',
                fontSize: 'clamp(1.05rem, 2.2vw, 1.35rem)',
                color: 'rgba(216,180,254,0.68)',
                letterSpacing: '0.01em',
              }}
            >
              How does your soul feel today?
            </p>
          </motion.div>

          {/* ── 2. STAGE: LEFT CARDS | CENTER ORB | RIGHT CARDS ── */}
          <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 my-auto py-1 z-20">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 lg:gap-12 xl:gap-16">

              {/* ── LEFT COLUMN (Journal Entries + Today's Rituals) ── */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-4 justify-center items-center lg:items-start">
                {/* Card 1: Journal Entries */}
                <motion.div
                  initial={{ opacity: 0, x: -25 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                  onClick={() => setCurrentView('journal')}
                  className="anim-card-float-1 group cursor-pointer relative overflow-hidden w-full"
                  style={{
                    maxWidth: 'var(--card-width)',
                    background: 'rgba(15,20,48,0.60)',
                    backdropFilter: 'blur(32px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                    border: '1px solid rgba(167,139,250,0.32)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.12)',
                    padding: '14px 16px',
                    minHeight: 'var(--card-height)',
                    transition: 'transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease',
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0"
                    style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(196,181,253,0.45), transparent)' }}
                  />
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: 'rgba(139,92,246,0.22)',
                          border: '1px solid rgba(167,139,250,0.35)',
                        }}
                      >
                        <BookOpen className="w-4 h-4" style={{ color: '#c4b5fd' }} />
                      </div>
                      <div>
                        <div
                          className="text-[10px] uppercase font-semibold tracking-wider"
                          style={{ color: 'rgba(196,181,253,0.70)' }}
                        >
                          Journal Entries
                        </div>
                        <div
                          className="font-display-lg text-2xl font-bold"
                          style={{ color: '#f5f3ff', lineHeight: 1.1 }}
                        >
                          {journalEntries.length}
                        </div>
                      </div>
                    </div>
                    {/* Micro bar chart */}
                    <div className="flex items-end gap-1" style={{ height: '22px' }}>
                      {[6, 9, 7, 11, 8, 10, 13].map((h, i) => (
                        <div
                          key={i}
                          className="w-1.5 rounded-sm"
                          style={{
                            height: `${h * 1.6}px`,
                            background: i === 6 ? 'rgba(196,181,253,0.95)' : `rgba(167,139,250,${0.35 + i * 0.08})`,
                            animation: `barPulse ${1.4 + i * 0.25}s ease-in-out ${i * 0.15}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-[9.5px] italic mt-2.5" style={{ color: 'rgba(216,180,254,0.55)' }}>
                    &ldquo;Every thought you write is a step forward.&rdquo;
                  </p>
                  <ArrowRight className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 opacity-0 group-hover:opacity-75 group-hover:translate-x-0.5 transition-all" style={{ color: '#c4b5fd' }} />
                </motion.div>

                {/* Card 2: Today's Rituals */}
                <motion.div
                  initial={{ opacity: 0, x: -25 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.25 }}
                  onClick={() => setCurrentView('habits')}
                  className="anim-card-float-3 group cursor-pointer relative overflow-hidden w-full"
                  style={{
                    maxWidth: 'var(--card-width)',
                    background: 'rgba(12,28,45,0.60)',
                    backdropFilter: 'blur(32px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                    border: '1px solid rgba(45,212,191,0.32)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.12)',
                    padding: '14px 16px',
                    minHeight: 'var(--card-height)',
                    transition: 'transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease',
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0"
                    style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(94,234,212,0.40), transparent)' }}
                  />
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: 'rgba(20,184,166,0.20)',
                          border: '1px solid rgba(45,212,191,0.35)',
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" style={{ color: '#5eead4' }} />
                      </div>
                      <div>
                        <div
                          className="text-[10px] uppercase font-semibold tracking-wider"
                          style={{ color: 'rgba(94,234,212,0.70)' }}
                        >
                          Today&apos;s Rituals
                        </div>
                        <div
                          className="font-display-lg text-2xl font-bold"
                          style={{ color: '#f0fdfa', lineHeight: 1.1 }}
                        >
                          {totalHabitsToday}/{habits.length}
                        </div>
                      </div>
                    </div>
                    {/* Circular progress ring */}
                    <div className="relative w-8 h-8">
                      <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(45,212,191,0.15)" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="14" fill="none"
                          stroke="rgba(45,212,191,0.85)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${habitCompletion * 0.88} 88`}
                          style={{ filter: 'drop-shadow(0 0 4px rgba(45,212,191,0.75))' }}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-teal-200">
                        {habitCompletion}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[9.5px] italic mt-2.5" style={{ color: 'rgba(153,246,228,0.55)' }}>
                    &ldquo;Small rituals create a brighter you.&rdquo;
                  </p>
                  <ArrowRight className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 opacity-0 group-hover:opacity-75 group-hover:translate-x-0.5 transition-all" style={{ color: '#5eead4' }} />
                </motion.div>
              </div>

              {/* ── CENTER COLUMN: LIVING 3D ORB + DAIS + CTA ── */}
              <div className="flex flex-col items-center justify-center pt-6 lg:pt-10 my-1 lg:my-0">
                <div
                  className="relative flex flex-col items-center"
                  style={{
                    transform: `translate(calc(var(--mx) * 20px), calc(var(--my) * 14px))`,
                    transition: 'transform 0.25s ease-out',
                  }}
                >
                  {/* Atmospheric outer aura bloom */}
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: '450px',
                      height: '450px',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, rgba(219,39,119,0.14) 40%, rgba(79,70,229,0.06) 65%, transparent 75%)',
                      filter: 'blur(35px)',
                      animation: 'orbAuraBreath 6s ease-in-out infinite',
                    }}
                  />

                  {/* ── THE 3D LIVING GLASS ORB ── */}
                  <div
                    className="anim-orb-float relative"
                    style={{
                      width: 'var(--orb-size)',
                      height: 'var(--orb-size)',
                      flexShrink: 0,
                    }}
                  >
                    {/* Layer 1 — Outer Chromatic Illuminated Glass Rim */}
                    <div
                      className="absolute rounded-full anim-orb-breathe"
                      style={{
                        inset: '-4px',
                        background: 'transparent',
                        border: '1.5px solid rgba(196,181,253,0.55)',
                        boxShadow: '0 0 30px rgba(168,85,247,0.65), 0 0 70px rgba(147,51,234,0.42), inset 0 0 30px rgba(219,39,119,0.28)',
                        borderRadius: '50%',
                      }}
                    />

                    {/* Layer 2 — Translucent Glass Sphere with Multi-Gradient Refraction */}
                    <div
                      className="absolute rounded-full overflow-hidden"
                      style={{
                        inset: '0',
                        background: 'radial-gradient(circle at 40% 32%, rgba(244,114,182,0.28) 0%, rgba(168,85,247,0.22) 35%, rgba(79,70,229,0.28) 65%, rgba(30,27,75,0.55) 100%)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(221,214,254,0.25)',
                      }}
                    >
                      {/* Deep Radiant Core Glow (sunset peach/magenta at base) */}
                      <div
                        className="absolute"
                        style={{
                          inset: '16%',
                          borderRadius: '50%',
                          background: 'radial-gradient(circle at 50% 60%, rgba(244,114,182,0.85) 0%, rgba(168,85,247,0.65) 45%, rgba(79,70,229,0.30) 75%, transparent 92%)',
                          filter: 'blur(8px)',
                          animation: 'coreGlow 4s ease-in-out infinite',
                        }}
                      />

                      {/* Electric cyan inner refraction ring */}
                      <div
                        className="absolute"
                        style={{
                          inset: '24%',
                          borderRadius: '50%',
                          border: '1px solid rgba(56,189,248,0.35)',
                          boxShadow: 'inset 0 0 16px rgba(56,189,248,0.30)',
                        }}
                      />

                      {/* Primary Specular Highlight */}
                      <div
                        className="absolute anim-specular"
                        style={{
                          top: '12%',
                          left: '20%',
                          width: '42%',
                          height: '38%',
                          borderRadius: '50%',
                          background: 'radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.65) 0%, rgba(237,233,254,0.25) 45%, transparent 70%)',
                          filter: 'blur(3px)',
                        }}
                      />

                      {/* Secondary Specular Glow */}
                      <div
                        className="absolute"
                        style={{
                          bottom: '14%',
                          right: '16%',
                          width: '24%',
                          height: '18%',
                          borderRadius: '50%',
                          background: 'radial-gradient(circle, rgba(196,181,253,0.35) 0%, transparent 70%)',
                          filter: 'blur(4px)',
                        }}
                      />
                    </div>

                    {/* Layer 3 — 3D Tilted Orbital Ring 1 (14s Clockwise, Violet Satellite) */}
                    <div
                      className="absolute anim-orbit-cw pointer-events-none"
                      style={{ inset: '-24px', transformStyle: 'preserve-3d' }}
                    >
                      <div
                        className="absolute"
                        style={{
                          inset: 0,
                          borderRadius: '50%',
                          border: '1.5px solid rgba(196,181,253,0.35)',
                          boxShadow: '0 0 12px rgba(168,85,247,0.30)',
                          transform: 'rotateX(70deg) rotateY(18deg)',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: '-5px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '9px',
                            height: '9px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, #f5d0fe, #a855f7)',
                            boxShadow: '0 0 12px rgba(192,132,252,0.95), 0 0 24px rgba(168,85,247,0.65)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Layer 4 — 3D Tilted Orbital Ring 2 (20s Counter-Clockwise, Cyan Satellite) */}
                    <div
                      className="absolute anim-orbit-ccw pointer-events-none"
                      style={{ inset: '-14px', transformStyle: 'preserve-3d' }}
                    >
                      <div
                        className="absolute"
                        style={{
                          inset: 0,
                          borderRadius: '50%',
                          border: '1px solid rgba(56,189,248,0.32)',
                          boxShadow: '0 0 10px rgba(56,189,248,0.25)',
                          transform: 'rotateX(65deg) rotateY(-24deg)',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '-4px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, #bae6fd, #0ea5e9)',
                            boxShadow: '0 0 10px rgba(56,189,248,0.95), 0 0 22px rgba(14,165,233,0.60)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Layer 5 — 3D Tilted Orbital Ring 3 (26s Reverse Tilt, Amber Satellite) */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        inset: '-32px',
                        transformStyle: 'preserve-3d',
                        animation: 'orbitCw 26s linear infinite reverse',
                      }}
                    >
                      <div
                        className="absolute"
                        style={{
                          inset: 0,
                          borderRadius: '50%',
                          border: '1px solid rgba(251,191,36,0.25)',
                          transform: 'rotateX(76deg) rotateY(6deg)',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            right: '-4px',
                            transform: 'translateY(-50%)',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, #fef3c7, #f59e0b)',
                            boxShadow: '0 0 10px rgba(251,191,36,0.95), 0 0 20px rgba(245,158,11,0.60)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Layer 6 — Central Radiant White 4-Point Sparkle Icon */}
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                      <div
                        style={{
                          filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.95)) drop-shadow(0 0 35px rgba(192,132,252,0.85))',
                          animation: 'coreGlow 4s ease-in-out infinite',
                        }}
                      >
                        <Sparkles
                          className="w-12 h-12"
                          style={{ color: '#ffffff', strokeWidth: 1.5 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── CONCENTRIC WATER RIPPLE RINGS AT ORB BASE ── */}
                  <div
                    className="relative flex items-center justify-center pointer-events-none"
                    style={{ width: '290px', height: '48px', marginTop: '-12px' }}
                  >
                    <div
                      className="absolute anim-ripple-1"
                      style={{
                        width: '180px',
                        height: '38px',
                        borderRadius: '50%',
                        border: '1.5px solid rgba(192,132,252,0.60)',
                        boxShadow: '0 0 14px rgba(168,85,247,0.35)',
                      }}
                    />
                    <div
                      className="absolute anim-ripple-2"
                      style={{
                        width: '180px',
                        height: '38px',
                        borderRadius: '50%',
                        border: '1px solid rgba(56,189,248,0.50)',
                        boxShadow: '0 0 12px rgba(14,165,233,0.30)',
                      }}
                    />
                    <div
                      className="absolute anim-ripple-3"
                      style={{
                        width: '180px',
                        height: '38px',
                        borderRadius: '50%',
                        border: '1px solid rgba(251,191,36,0.40)',
                        boxShadow: '0 0 10px rgba(245,158,11,0.25)',
                      }}
                    />
                  </div>

                  {/* ── PRIMARY CTA: CONTINUE YOUR STREAK ── */}
                  <Button
                    onClick={() => setCurrentView('habits')}
                    aria-label="Continue Your Streak"
                    className="relative mt-3 px-8 py-3 rounded-full overflow-hidden flex items-center gap-2.5 font-semibold text-sm group cursor-pointer z-20"
                    style={{
                      background: 'rgba(30,18,65,0.75)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(251,191,36,0.60)',
                      boxShadow: '0 0 24px rgba(245,158,11,0.35), 0 0 50px rgba(168,85,247,0.20), inset 0 1px 0 rgba(254,243,199,0.25)',
                      color: '#fef3c7',
                    }}
                  >
                    <div
                      className="absolute inset-0 anim-cta-sweep pointer-events-none"
                      style={{
                        width: '80px',
                        background: 'linear-gradient(to right, transparent, rgba(254,243,199,0.30), transparent)',
                      }}
                    />
                    <Flame className="w-4 h-4 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
                    <span style={{ letterSpacing: '0.04em' }}>Continue Your Streak</span>
                    <ArrowRight className="w-4 h-4 text-amber-300 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>

              {/* ── RIGHT COLUMN (Mood Logs + Day Streak) ── */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-4 justify-center items-center lg:items-end">
                {/* Card 3: Mood Logs */}
                <motion.div
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.20 }}
                  onClick={() => setCurrentView('mood')}
                  className="anim-card-float-2 group cursor-pointer relative overflow-hidden w-full"
                  style={{
                    maxWidth: 'var(--card-width)',
                    background: 'rgba(12,25,55,0.60)',
                    backdropFilter: 'blur(32px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                    border: '1px solid rgba(56,189,248,0.32)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.12)',
                    padding: '14px 16px',
                    minHeight: 'var(--card-height)',
                    transition: 'transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease',
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0"
                    style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(125,211,252,0.40), transparent)' }}
                  />
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: 'rgba(14,165,233,0.20)',
                          border: '1px solid rgba(56,189,248,0.35)',
                        }}
                      >
                        <Activity className="w-4 h-4" style={{ color: '#7dd3fc' }} />
                      </div>
                      <div>
                        <div
                          className="text-[10px] uppercase font-semibold tracking-wider"
                          style={{ color: 'rgba(125,211,252,0.70)' }}
                        >
                          Mood Logs
                        </div>
                        <div
                          className="font-display-lg text-2xl font-bold"
                          style={{ color: '#f0f9ff', lineHeight: 1.1 }}
                        >
                          {moodLogs.length}
                        </div>
                      </div>
                    </div>
                    {/* Soundwave equalizer bars */}
                    <div className="flex items-center gap-0.5" style={{ height: '22px' }}>
                      {[4, 8, 5, 11, 7, 9, 6, 10, 5, 8, 4, 9].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 rounded-full"
                          style={{
                            height: `${h * 1.8}px`,
                            background: `rgba(56,189,248,${0.35 + (i % 3 === 0 ? 0.45 : 0)})`,
                            animation: `waveform ${0.9 + i * 0.16}s ease-in-out ${i * 0.12}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-[9.5px] italic mt-2.5" style={{ color: 'rgba(186,230,253,0.55)' }}>
                    &ldquo;Awareness today, inner peace tomorrow.&rdquo;
                  </p>
                  <ArrowRight className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 opacity-0 group-hover:opacity-75 group-hover:translate-x-0.5 transition-all" style={{ color: '#7dd3fc' }} />
                </motion.div>

                {/* Card 4: Day Streak */}
                <motion.div
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.30 }}
                  onClick={() => setCurrentView('analytics')}
                  className="anim-card-float-4 group cursor-pointer relative overflow-hidden w-full"
                  style={{
                    maxWidth: 'var(--card-width)',
                    background: 'rgba(40,24,12,0.60)',
                    backdropFilter: 'blur(32px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                    border: '1px solid rgba(245,158,11,0.32)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.12)',
                    padding: '14px 16px',
                    minHeight: 'var(--card-height)',
                    transition: 'transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease',
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0"
                    style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(253,224,71,0.40), transparent)' }}
                  />
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: 'rgba(217,119,6,0.20)',
                          border: '1px solid rgba(245,158,11,0.35)',
                        }}
                      >
                        <TrendingUp className="w-4 h-4" style={{ color: '#fde047' }} />
                      </div>
                      <div>
                        <div
                          className="text-[10px] uppercase font-semibold tracking-wider"
                          style={{ color: 'rgba(253,224,71,0.70)' }}
                        >
                          Day Streak
                        </div>
                        <div
                          className="font-display-lg text-2xl font-bold"
                          style={{ color: '#fefce8', lineHeight: 1.1 }}
                        >
                          {userProfile.streakCount}
                        </div>
                      </div>
                    </div>
                    {/* Ascending golden streak bars */}
                    <div className="flex items-end gap-1" style={{ height: '22px' }}>
                      {[5, 7, 6, 9, 8, 11, 14].map((h, i) => (
                        <div
                          key={i}
                          className="w-1.5 rounded-sm"
                          style={{
                            height: `${h * 1.5}px`,
                            background: i === 6 ? 'rgba(251,191,36,0.95)' : `rgba(245,158,11,${0.25 + i * 0.08})`,
                            boxShadow: i === 6 ? '0 0 8px rgba(245,158,11,0.75)' : 'none',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-[9.5px] italic mt-2.5" style={{ color: 'rgba(254,240,138,0.55)' }}>
                    &ldquo;Consistency builds a calmer mind.&rdquo;
                  </p>
                  <ArrowRight className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 opacity-0 group-hover:opacity-75 group-hover:translate-x-0.5 transition-all" style={{ color: '#fde047' }} />
                </motion.div>
              </div>

            </div>
          </div>

          {/* ── 3. BOTTOM ACCESSORIES ROW (BREATHE | SCROLL PROMPT | GENTLE FOCUS) ── */}
          <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 md:px-12 grid grid-cols-3 items-center text-[11px] select-none mt-auto pt-2 z-20">
            {/* Left: Breathe Pill button */}
            <div className="flex justify-start">
              <button
                onClick={() => setIsCheckInOpen(true)}
                className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full transition-all duration-300 hover:scale-105 cursor-pointer"
                style={{
                  background: 'rgba(15,23,42,0.60)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(52,211,153,0.30)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.35), 0 0 15px rgba(52,211,153,0.15)',
                }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(52,211,153,0.20)',
                    border: '1px solid rgba(52,211,153,0.40)',
                  }}
                >
                  <Wind className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[10px] font-semibold text-emerald-200 tracking-wide">
                    Breathe
                  </span>
                  <span className="text-[8px] text-emerald-300/60 font-mono mt-0.5">
                    2 min pause
                  </span>
                </div>
                <ArrowRight className="w-3 h-3 text-emerald-300/60" />
              </button>
            </div>

            {/* Center: Scroll Prompt */}
            <div className="flex justify-center">
              <button
                onClick={() => window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })}
                className="flex items-center gap-1.5 opacity-40 hover:opacity-80 transition-opacity cursor-pointer text-slate-300 font-mono text-[10px] tracking-widest uppercase"
              >
                <span>Scroll for a calmer you</span>
                <ArrowDown className="w-3.5 h-3.5 anim-scroll-bounce" />
              </button>
            </div>

            {/* Right: Gentle Focus Audio Control Pill */}
            <div className="flex justify-end">
              <button
                onClick={togglePlayback}
                className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full transition-all duration-300 hover:scale-105 cursor-pointer"
                style={{
                  background: 'rgba(15,23,42,0.60)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(139,92,246,0.30)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.35), 0 0 15px rgba(139,92,246,0.15)',
                }}
                aria-label={isPlaying ? 'Pause ambient audio' : 'Play Gentle Focus ambient audio'}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(139,92,246,0.25)',
                    border: '1px solid rgba(167,139,250,0.40)',
                  }}
                >
                  {isPlaying ? (
                    <Volume2 className="w-3 h-3 text-purple-300 animate-pulse" />
                  ) : (
                    <VolumeX className="w-3 h-3 text-purple-400/60" />
                  )}
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[10px] font-semibold text-purple-200 tracking-wider font-mono uppercase">
                    Gentle Focus
                  </span>
                  <span className="text-[8px] text-purple-300/60 font-mono mt-0.5">
                    Ambient sounds
                  </span>
                </div>
                {isPlaying && (
                  <div className="flex items-center gap-0.5" style={{ height: '10px' }}>
                    <div className="w-0.5 h-2 bg-purple-400 rounded-full animate-[equalizerPulse1_1s_infinite]" />
                    <div className="w-0.5 h-3 bg-purple-300 rounded-full animate-[equalizerPulse2_1s_infinite]" />
                    <div className="w-0.5 h-1.5 bg-purple-400 rounded-full animate-[equalizerPulse3_1s_infinite]" />
                  </div>
                )}
              </button>
            </div>
          </div>

        </section>
        {/* [END OF CINEMATIC HERO] */}

        {/* ============================================================
            CINEMATIC ENDING — Atmospheric scene fade (decorative only)
            ============================================================ */}
        <div
          aria-hidden="true"
          className="relative w-full overflow-hidden pointer-events-none"
          style={{ height: '200px', background: 'linear-gradient(to bottom, #040614 0%, #02030c 100%)' }}
        >
          {/* Deep atmospheric fog layer 1 */}
          <div
            className="absolute left-0 right-0 anim-fog-drift"
            style={{
              top: '10%',
              height: '60px',
              background: 'radial-gradient(ellipse 80% 100% at 50% 50%, rgba(79,60,180,0.18) 0%, rgba(60,30,120,0.10) 50%, transparent 80%)',
              filter: 'blur(18px)',
            }}
          />
          {/* Atmospheric fog layer 2 — offset */}
          <div
            className="absolute left-0 right-0"
            style={{
              top: '30%',
              height: '50px',
              background: 'radial-gradient(ellipse 60% 100% at 40% 50%, rgba(56,30,100,0.14) 0%, transparent 70%)',
              filter: 'blur(22px)',
              animation: 'fogDrift 18s ease-in-out 4s infinite reverse',
            }}
          />
          {/* Very faint distant silhouette ridge */}
          <svg
            className="absolute bottom-0 w-full"
            style={{ height: '80px', opacity: 0.28 }}
            viewBox="0 0 1440 80"
            preserveAspectRatio="none"
          >
            <path
              fill="#02030a"
              d="M0,80 L0,45 Q80,35 160,42 Q240,50 320,38 Q400,26 480,34 Q560,42 640,30 Q720,18 800,28 Q880,38 960,25 Q1040,12 1120,22 Q1200,32 1280,20 Q1360,8 1440,18 L1440,80 Z"
            />
          </svg>
          {/* Subtle lake reflection shimmer at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '32px',
              background: 'linear-gradient(to bottom, transparent 0%, rgba(60,30,120,0.10) 60%, rgba(20,10,40,0.20) 100%)',
            }}
          />
          {/* Tiny floating particles */}
          {[
            { left: '15%', bottom: '55%', cls: 'anim-particle-3', w: 1.5, col: 'rgba(192,132,252,0.45)', glow: 'rgba(168,85,247,0.3)' },
            { left: '38%', bottom: '40%', cls: 'anim-particle-1', w: 1.5, col: 'rgba(251,191,36,0.40)', glow: 'rgba(245,158,11,0.28)' },
            { left: '62%', bottom: '60%', cls: 'anim-particle-4', w: 1.5, col: 'rgba(56,189,248,0.38)', glow: 'rgba(14,165,233,0.25)' },
            { left: '84%', bottom: '45%', cls: 'anim-particle-2', w: 1.5, col: 'rgba(216,180,254,0.42)', glow: 'rgba(192,132,252,0.28)' },
          ].map((p, i) => (
            <div
              key={i}
              className={`absolute rounded-full ${p.cls}`}
              style={{
                left: p.left,
                bottom: p.bottom,
                width: `${p.w}px`,
                height: `${p.w}px`,
                background: p.col,
                boxShadow: `0 0 ${p.w * 4}px ${p.glow}`,
                animationDelay: `${i * 2.5}s`,
              }}
            />
          ))}
          {/* Top vignette — blends from hero into dark */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(4,6,20,0.90) 0%, transparent 35%, transparent 60%, rgba(2,3,12,0.96) 100%)',
            }}
          />
        </div>
        {/* [END OF CINEMATIC ENDING] */}

      </div>
    </PageTransition>
  );
};
