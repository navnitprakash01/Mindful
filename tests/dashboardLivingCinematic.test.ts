import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthProvider } from '../src/context/AuthContext';
import { AppProvider } from '../src/context/AppContext';
import { ZenDashboard } from '../src/components/features/ZenDashboard';

process.env.NODE_ENV = 'test';

describe('Mindful 3.0 Living Cinematic Dashboard Verification', () => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      length: 0,
    };
  }

  const html = renderToString(
    React.createElement(
      ToastProvider,
      null,
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          AppProvider,
          null,
          React.createElement(ZenDashboard)
        )
      )
    )
  );

  it('renders hero greeting with dynamic greeting and contemplative prompt', () => {
    assert.ok(html.includes('— A CALMER YOU —'), 'Must render eyebrow — A CALMER YOU —');
    assert.ok(html.includes('Good '), 'Must render time-of-day greeting');
    assert.ok(html.includes('How does your soul feel today?'), 'Must render subtitle');
  });

  it('renders central 3D living wellness orb with motion classes and orbital rings', () => {
    assert.ok(html.includes('anim-orb-float'), 'Must include orb floating animation class');
    assert.ok(html.includes('anim-orb-breathe'), 'Must include orb breathing animation class');
    assert.ok(html.includes('anim-specular'), 'Must include specular highlight drift');
    assert.ok(html.includes('anim-orbit-cw'), 'Must include clockwise 3D orbital ring');
    assert.ok(html.includes('anim-orbit-ccw'), 'Must include counter-clockwise 3D orbital ring');
  });

  it('renders reflective water ripples beneath the orb', () => {
    assert.ok(html.includes('anim-ripple-1'), 'Must include ripple ring 1');
    assert.ok(html.includes('anim-ripple-2'), 'Must include ripple ring 2');
    assert.ok(html.includes('anim-ripple-3'), 'Must include ripple ring 3');
    assert.ok(html.includes('anim-water-shimmer'), 'Must include water shimmer reflection');
  });

  it('renders celestial moon and rising atmospheric particles', () => {
    assert.ok(html.includes('anim-moon-glow'), 'Must include celestial moon with glow');
    assert.ok(html.includes('anim-particle-1'), 'Must include atmospheric particle 1');
    assert.ok(html.includes('anim-particle-2'), 'Must include atmospheric particle 2');
    assert.ok(html.includes('anim-particle-3'), 'Must include atmospheric particle 3');
    assert.ok(html.includes('anim-particle-4'), 'Must include atmospheric particle 4');
  });

  it('renders the 4 essential floating glass stat cards with quotes and micro-animations', () => {
    assert.ok(html.includes('Journal Entries'), 'Must render Journal Entries stat card');
    assert.ok(html.includes('Every thought you write is a step forward.'), 'Must render journal quote');
    assert.ok(html.includes('anim-card-float-1'), 'Must have independent float animation 1');

    assert.ok(html.includes("Today&#x27;s Rituals") || html.includes("Today's Rituals") || html.includes("Today&apos;s Rituals"), 'Must render Today\'s Rituals stat card');
    assert.ok(html.includes('Small rituals create a brighter you.'), 'Must render rituals quote');
    assert.ok(html.includes('anim-card-float-3'), 'Must have independent float animation 3');

    assert.ok(html.includes('Mood Logs'), 'Must render Mood Logs stat card');
    assert.ok(html.includes('Awareness today, inner peace tomorrow.'), 'Must render mood quote');
    assert.ok(html.includes('anim-card-float-2'), 'Must have independent float animation 2');

    assert.ok(html.includes('Day Streak'), 'Must render Day Streak stat card');
    assert.ok(html.includes('Consistency builds a calmer mind.'), 'Must render streak quote');
    assert.ok(html.includes('anim-card-float-4'), 'Must have independent float animation 4');
  });

  it('renders primary glowing CTA button with shimmer sweep', () => {
    assert.ok(html.includes('Continue Your Streak'), 'Must render Continue Your Streak CTA');
    assert.ok(html.includes('anim-cta-sweep'), 'Must include periodic shimmer sweep on CTA');
  });

  it('renders ambient micro-controls for Breathe, Ambient Audio, and Scroll indicator', () => {
    assert.ok(html.includes('Breathe'), 'Must render quick Breathe button');
    assert.ok(html.includes('Gentle Focus'), 'Must render Gentle Focus ambient audio trigger');
    assert.ok(html.includes('Scroll for a calmer you'), 'Must render scroll prompt');
  });

  it('Personal State Observatory is NOT on the Dashboard — it lives in Insights', () => {
    assert.ok(!html.includes('Personal State'), 'Dashboard must NOT render Personal State heading (moved to Insights)');
    assert.ok(!html.includes('Based on your recent signals'), 'Dashboard must NOT render Personal State subtitle (moved to Insights)');
  });
});
