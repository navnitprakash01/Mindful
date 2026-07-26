import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, BookOpen, HeartHandshake, ArrowRight, Brain } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface FeatureCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  desc: string;
  delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, iconBg, title, desc, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    whileHover={{ y: -6, transition: { duration: 0.3 } }}
    className="group relative flex flex-col bg-[rgba(255,255,255,0.04)] backdrop-blur-[40px] border border-[rgba(255,255,255,0.08)] rounded-[28px] p-7 cursor-default overflow-hidden hover:border-[rgba(108,114,232,0.25)] transition-colors duration-300 hover:shadow-[0_0_40px_rgba(108,114,232,0.08),0_20px_60px_rgba(0,0,0,0.40)]"
  >
    {/* Glow on hover */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
      style={{ background: 'radial-gradient(ellipse at 20% 20%, rgba(108,114,232,0.08) 0%, transparent 60%)' }}
    />
    <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center mb-5 shadow-lg`}>
      {icon}
    </div>
    <h3 className="font-display-lg text-xl text-[rgba(232,234,246,0.95)] mb-2.5">{title}</h3>
    <p className="text-sm text-[rgba(232,234,246,0.50)] leading-relaxed font-body-md flex-1">{desc}</p>
    <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-[rgba(108,114,232,0.70)] group-hover:text-[#c0c4ea] transition-colors">
      <span>Explore</span>
      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
    </div>
  </motion.div>
);

const testimonials = [
  {
    text: "Mindful transformed how I understand my emotional patterns. The AI companion feels genuinely present.",
    author: "Sophia L.",
    role: "Therapist & Writer"
  },
  {
    text: "The atmospheric journaling canvas is unlike anything I've experienced. It listens through color.",
    author: "Marcus R.",
    role: "Creative Director"
  },
  {
    text: "14 days in, I finally understand why I feel the way I do each Monday. Priceless insight.",
    author: "Elena W.",
    role: "Startup Founder"
  },
];

export const LandingPage: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { setCurrentView } = useApp();

  return (
    <div className="relative min-h-screen text-[rgba(232,234,246,0.90)] overflow-hidden">
      {/* === DECORATIVE BACKGROUND ORBS === */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute w-[700px] h-[700px] rounded-full top-[-200px] left-[-100px] opacity-30 glow-orb" />
        <div className="absolute w-[500px] h-[500px] rounded-full bottom-[-100px] right-[-50px] opacity-20 glow-orb-rose" />
        <div className="absolute inset-0 dot-grid opacity-30" />
      </div>

      {/* === NAVBAR === */}
      <header className="relative z-20 max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6c72e8] to-[#e8799a] flex items-center justify-center shadow-[0_0_20px_rgba(108,114,232,0.45)]">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">Mindful</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAuth}
            className="text-sm font-medium text-[rgba(232,234,246,0.45)] hover:text-[rgba(232,234,246,0.80)] transition-colors"
          >
            Sign In
          </button>
          <Button onClick={() => setCurrentView('dashboard')} variant="primary" size="md">
            Enter Sanctuary
          </Button>
        </div>
      </header>

      {/* === HERO SECTION === */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-28 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <Badge variant="lavender" size="md" className="py-1.5 px-5">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-[#6c72e8]" />
            AI-Powered Emotional Sanctuary
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display-lg text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight leading-[1.05] mb-7 max-w-4xl px-2"
        >
          A quiet space to understand{' '}
          <span
            className="italic"
            style={{
              background: 'linear-gradient(135deg, #c0c4ea 0%, #e8799a 50%, #c0c4ea 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            how your soul feels.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg sm:text-xl text-[rgba(232,234,246,0.45)] max-w-2xl font-body-md leading-relaxed mb-10"
        >
          Mindful combines atmospheric journaling, volumetric emotional topography, and an
          empathetic Gemini AI companion to bring calm clarity to your daily experience.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Button
            onClick={() => setCurrentView('dashboard')}
            variant="primary"
            size="lg"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Explore Interactive Demo
          </Button>
          <Button
            onClick={onOpenAuth}
            variant="glass"
            size="lg"
          >
            Create Your Sanctuary
          </Button>
        </motion.div>

        {/* Hero Preview Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-16 w-full max-w-4xl"
        >
          {/* Glow behind card */}
          <div className="absolute inset-x-20 -top-4 h-24 bg-[rgba(108,114,232,0.25)] blur-3xl rounded-full" />

          <div className="relative rounded-[36px] overflow-hidden border border-[rgba(255,255,255,0.10)] shadow-[0_40px_100px_rgba(0,0,0,0.60)] p-1 bg-[rgba(255,255,255,0.04)] backdrop-blur-lg">
            <div
              className="relative h-80 sm:h-96 rounded-[30px] overflow-hidden flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #0f1229 0%, #131627 40%, #1a0e20 100%)',
              }}
            >
              {/* SVG Wave Terrain */}
              <svg className="absolute inset-0 w-full h-full opacity-60" preserveAspectRatio="none" viewBox="0 0 1000 400">
                <defs>
                  <linearGradient id="heroWave1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6c72e8" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#e8799a" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#6c72e8" stopOpacity="0.15" />
                  </linearGradient>
                  <linearGradient id="heroWave2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4a50c8" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#c0c4ea" stopOpacity="0.10" />
                  </linearGradient>
                </defs>
                <path d="M0,280 Q200,140 400,220 T800,160 T1000,180 L1000,400 L0,400 Z" fill="url(#heroWave1)" />
                <path d="M0,320 Q250,200 500,270 T900,220 L1000,230 L1000,400 L0,400 Z" fill="url(#heroWave2)" />
                {/* Ambient glow circles */}
                <circle cx="250" cy="200" r="80" fill="rgba(108,114,232,0.08)" />
                <circle cx="750" cy="150" r="60" fill="rgba(232,121,154,0.06)" />
              </svg>

              {/* Floating mini stats */}
              <div className="absolute top-6 left-6 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] rounded-2xl px-4 py-3 backdrop-blur-md">
                <div className="text-[10px] text-[rgba(192,196,234,0.60)] uppercase tracking-wider mb-1">Current Mood</div>
                <div className="font-display-lg text-lg text-[#c0c4ea]">Serene</div>
              </div>
              <div className="absolute top-6 right-6 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] rounded-2xl px-4 py-3 backdrop-blur-md">
                <div className="text-[10px] text-[rgba(192,196,234,0.60)] uppercase tracking-wider mb-1">Streak</div>
                <div className="font-display-lg text-lg text-[#fbbf24]">🔥 14 Days</div>
              </div>

              {/* Center quote */}
              <div className="relative z-10 text-center px-8 max-w-2xl">
                <span className="text-[10px] uppercase tracking-[0.15em] text-[rgba(192,196,234,0.45)] font-mono block mb-4">
                  Volumetric Emotional Topography
                </span>
                <h2 className="font-display-lg text-3xl sm:text-4xl text-white/90 italic leading-snug">
                  "The soul always knows what to do to heal itself."
                </h2>
                <p className="text-sm text-[rgba(192,196,234,0.50)] mt-4 font-body-md">
                  Hover over peaks and valleys to explore memory anchors
                </p>
              </div>

              {/* Bottom waveform bars */}
              <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end justify-center gap-1.5 px-8 pb-3">
                {[40, 65, 45, 80, 55, 90, 70, 50, 75, 60, 85, 65, 45, 70, 55, 80, 60].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-[rgba(108,114,232,0.60)] to-[rgba(192,196,234,0.20)] waveform-bar"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 0.08}s`,
                      animationDuration: `${1.0 + (i % 3) * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* === FEATURE PILLARS === */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="sage" className="mb-4">Architectural Core</Badge>
            <h2 className="font-display-lg text-4xl sm:text-5xl text-[rgba(232,234,246,0.93)] mt-3">
              Designed for Emotional Depth
            </h2>
            <p className="text-[rgba(232,234,246,0.45)] mt-4 max-w-xl mx-auto font-body-md leading-relaxed">
              Three interconnected systems that grow with your inner world.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            delay={0}
            iconBg="bg-gradient-to-br from-[rgba(108,114,232,0.30)] to-[rgba(108,114,232,0.10)] border border-[rgba(108,114,232,0.25)]"
            icon={<BookOpen className="w-5 h-5 text-[#c0c4ea]" />}
            title="Atmospheric Journaling"
            desc="A focus-first canvas that dynamically adapts ambient colors to match your emotional expression as you write. Your words change the atmosphere."
          />
          <FeatureCard
            delay={0.1}
            iconBg="bg-gradient-to-br from-[rgba(52,211,153,0.25)] to-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.20)]"
            icon={<HeartHandshake className="w-5 h-5 text-[#6ee7b7]" />}
            title="Emotional Topography"
            desc="Visualize mood fluctuations as a 3D volumetric landscape with peaks, valleys, and memory anchors you can hover to revisit."
          />
          <FeatureCard
            delay={0.2}
            iconBg="bg-gradient-to-br from-[rgba(232,121,154,0.25)] to-[rgba(232,121,154,0.08)] border border-[rgba(232,121,154,0.20)]"
            icon={<Brain className="w-5 h-5 text-[#f4a8c0]" />}
            title="Empathetic AI Companion"
            desc="Powered by Gemini AI with 4 specialized modes: Empathetic Listener, Mindful Coach, Stoic Philosopher, and CBT Reframer."
          />
        </div>
      </section>

      {/* === TESTIMONIALS === */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <Badge variant="rose" className="mb-4">Sanctuary Stories</Badge>
          <h2 className="font-display-lg text-4xl sm:text-5xl text-[rgba(232,234,246,0.93)] mt-3">
            Trusted by those who feel deeply
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-[28px] p-7 hover:border-[rgba(255,255,255,0.12)] transition-colors duration-300"
            >
              <p className="font-display-lg text-lg text-[rgba(232,234,246,0.80)] italic leading-relaxed mb-6">
                "{t.text}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgba(108,114,232,0.40)] to-[rgba(232,121,154,0.25)] flex items-center justify-center text-sm font-semibold text-[#c0c4ea]">
                  {t.author[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[rgba(232,234,246,0.80)]">{t.author}</div>
                  <div className="text-xs text-[rgba(232,234,246,0.35)]">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* === WELLNESS CTA === */}
      <section className="max-w-5xl mx-auto px-6 py-20 pb-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[36px] overflow-hidden border border-[rgba(108,114,232,0.25)] shadow-[0_0_60px_rgba(108,114,232,0.12),0_40px_100px_rgba(0,0,0,0.50)] p-10 md:p-14"
          style={{
            background: 'linear-gradient(135deg, rgba(108,114,232,0.15) 0%, rgba(13,15,26,0.95) 50%, rgba(232,121,154,0.12) 100%)',
          }}
        >
          <div className="absolute inset-0 opacity-50 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(108,114,232,0.20) 0%, transparent 60%)' }}
          />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="max-w-xl">
              <Badge variant="pro" className="mb-4">
                <HeartHandshake className="w-3 h-3 mr-1" />
                Wellness Companion
              </Badge>
              <h2 className="font-display-lg text-3xl sm:text-4xl text-white mb-3">
                Begin Your Mindfulness Journey
              </h2>
              <p className="text-sm text-[rgba(192,196,234,0.60)] max-w-md leading-relaxed font-body-md">
                Take a moment to check in with yourself. Journal your thoughts, explore your emotions,
                and build healthier habits with AI-guided support.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 shrink-0">
              <Button
                onClick={onOpenAuth}
                variant="primary"
                size="lg"
                className="min-w-[200px]"
              >
                Get Started
              </Button>
              <div className="text-sm text-[rgba(192,196,234,0.55)]">
                No credit card required.
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
};
