import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { BarChart3, Sparkles, Activity, TrendingUp, Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export const AnalyticsView: React.FC = () => {
  const { moodLogs, journalEntries } = useApp();

  const totalReflections = journalEntries.length;
  const avgMoodScore = journalEntries.length
    ? Math.round(journalEntries.reduce((acc, e) => acc + (e.moodScore || 75), 0) / journalEntries.length)
    : 80;

  const statCards = [
    {
      icon: <Activity className="w-5 h-5" />,
      label: 'Equilibrium Score',
      value: `${avgMoodScore}`,
      unit: '/ 100',
      color: '#6c72e8',
      bg: 'rgba(108,114,232,0.12)',
      border: 'rgba(108,114,232,0.20)',
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: 'Reflections Logged',
      value: totalReflections.toString(),
      unit: 'entries',
      color: '#6ee7b7',
      bg: 'rgba(52,211,153,0.10)',
      border: 'rgba(52,211,153,0.20)',
    },
    {
      icon: <Zap className="w-5 h-5" />,
      label: 'Dominant Frequency',
      value: 'Serene',
      unit: 'Focus',
      color: '#f4a8c0',
      bg: 'rgba(232,121,154,0.10)',
      border: 'rgba(232,121,154,0.20)',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-24 pb-36 space-y-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <Badge variant="lavender" className="mb-3">Emotional Analytics</Badge>
        <h1 className="font-display-lg text-4xl sm:text-5xl text-[rgba(232,234,246,0.93)]">
          Weekly Synthesis & Insights
        </h1>
        <p className="text-sm text-[rgba(232,234,246,0.40)] font-body-md mt-2 max-w-xl leading-relaxed">
          Quantitative and qualitative synthesis of your emotional equilibrium over time.
        </p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="flex items-center gap-4 p-6" hoverEffect>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: stat.bg, border: `1px solid ${stat.border}`, color: stat.color }}
              >
                {stat.icon}
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.10em] text-[rgba(232,234,246,0.40)] font-semibold block mb-1">
                  {stat.label}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display-lg text-3xl text-[rgba(232,234,246,0.90)]">{stat.value}</span>
                  <span className="text-sm text-[rgba(232,234,246,0.35)]">{stat.unit}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chart + Synthesis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Waveform Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-8"
        >
          <Card className="p-8">
            <div className="flex justify-between items-center mb-7">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(108,114,232,0.70)] block mb-1">
                  Weekly Waveform
                </span>
                <h3 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">
                  Energy & Sentiment Curve
                </h3>
              </div>
              <Badge variant="sage">7 Days</Badge>
            </div>

            <div className="h-64 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6c72e8" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#6c72e8" stopOpacity="0.00" />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6c72e8" />
                    <stop offset="50%" stopColor="#c0c4ea" />
                    <stop offset="100%" stopColor="#e8799a" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[40, 100, 160].map((y) => (
                  <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                ))}
                {/* Area fill */}
                <path
                  d="M 0,140 Q 80,40 160,110 T 320,50 T 500,80 L 500,200 L 0,200 Z"
                  fill="url(#areaGrad)"
                />
                {/* Gradient line */}
                <path
                  d="M 0,140 Q 80,40 160,110 T 320,50 T 500,80"
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Data points */}
                {[
                  { cx: 0, cy: 140 },
                  { cx: 100, cy: 65 },
                  { cx: 200, cy: 110 },
                  { cx: 320, cy: 50 },
                  { cx: 420, cy: 70 },
                  { cx: 500, cy: 80 },
                ].map((pt, i) => (
                  <circle key={i} cx={pt.cx} cy={pt.cy} r="5" fill="#6c72e8" stroke="rgba(255,255,255,0.20)" strokeWidth="2" />
                ))}
              </svg>

              {/* X-axis labels */}
              <div className="flex justify-between text-xs text-[rgba(232,234,246,0.30)] font-mono mt-3">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>

            {/* Mood breakdown bars */}
            <div className="mt-8 grid grid-cols-4 gap-4">
              {[
                { label: 'Calm', pct: 35, color: '#6ee7b7' },
                { label: 'Focus', pct: 28, color: '#c0c4ea' },
                { label: 'Joy', pct: 22, color: '#fbbf24' },
                { label: 'Anxiety', pct: 15, color: '#f4a8c0' },
              ].map((mood) => (
                <div key={mood.label}>
                  <div className="text-xs text-[rgba(232,234,246,0.45)] mb-1.5 flex justify-between">
                    <span>{mood.label}</span>
                    <span className="font-mono">{mood.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${mood.pct}%` }}
                      transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full"
                      style={{ background: mood.color, boxShadow: `0 0 8px ${mood.color}60` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* AI Synthesis Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-4"
        >
          <Card
            className="flex flex-col h-full p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(108,114,232,0.14) 0%, rgba(13,15,26,0.92) 100%)',
              border: '1px solid rgba(108,114,232,0.20)',
            }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[rgba(192,196,234,0.12)] border border-[rgba(192,196,234,0.20)] flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5 text-[#c0c4ea]" />
              </div>
              <h3 className="font-display-lg text-xl text-[rgba(232,234,246,0.90)]">Weekly AI Synthesis</h3>
            </div>

            <p className="text-sm text-[rgba(192,196,234,0.60)] leading-relaxed font-body-md mb-6 italic">
              "Your landscape shows deep valleys of rest early in the week, allowing for high-frequency peaks of productivity on Tuesday and Friday."
            </p>

            <div className="space-y-5 text-xs border-t border-[rgba(108,114,232,0.15)] pt-5 flex-1">
              <div>
                <span className="font-semibold text-[rgba(192,196,234,0.45)] uppercase tracking-wider block mb-1.5 text-[10px]">
                  Primary Trigger
                </span>
                <p className="text-[rgba(232,234,246,0.70)]">Morning Tea & Creative Deep Work</p>
              </div>
              <div>
                <span className="font-semibold text-[rgba(192,196,234,0.45)] uppercase tracking-wider block mb-1.5 text-[10px]">
                  Growth Opportunity
                </span>
                <p className="text-[rgba(232,234,246,0.70)] leading-relaxed">
                  Take 5 minutes of somatic stretching around 3:00 PM to offset afternoon tension.
                </p>
              </div>
              <div>
                <span className="font-semibold text-[rgba(192,196,234,0.45)] uppercase tracking-wider block mb-1.5 text-[10px]">
                  Mood Trend
                </span>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#6ee7b7]" />
                  <span className="text-[#6ee7b7]">+12% emotional balance vs last week</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => {}}
              variant="glass"
              size="sm"
              className="w-full mt-6 text-[rgba(232,234,246,0.60)]"
            >
              Export Synthesis PDF
            </Button>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
