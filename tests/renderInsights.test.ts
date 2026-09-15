import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthProvider } from '../src/context/AuthContext';
import { AppProvider } from '../src/context/AppContext';
import { AnalyticsView } from '../src/components/features/AnalyticsView';
import { ObservatoryLivingSummary } from '../src/components/features/observatory/ObservatoryLivingSummary';

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

describe('Insights Blank-Screen Regression Tests', () => {
  it('1. Renders AnalyticsView component tree cleanly without throwing any runtime error', () => {
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
            React.createElement(AnalyticsView, null)
          )
        )
      )
    );
    assert.ok(html.length > 0, 'Rendered HTML must not be empty');
    assert.match(html, /Your Inner Observatory/, 'Must render Inner Observatory title');
    assert.match(html, /Personal State/, 'Must render Personal State section');
    assert.match(html, /CURRENT STATE/, 'Must render CURRENT STATE section');
    assert.match(html, /WHAT&#x27;S CHANGING|WHAT'S CHANGING/, 'Must render WHAT\'S CHANGING section');
    assert.match(html, /WHAT YOU&#x27;VE NOTICED|WHAT YOU'VE NOTICED/, 'Must render WHAT YOU\'VE NOTICED section');
  });

  it('2. ObservatoryLivingSummary renders safely when summary prop is explicitly passed', () => {
    const html = renderToString(
      React.createElement(ObservatoryLivingSummary, {
        summary: {
          title: 'Steady Equilibrium',
          description: 'Wellness signals are balanced close to your personal resting baseline.',
          stateSentence: 'Steady equilibrium across your core dimensions.',
          primaryDimensions: [
            { key: 'mood', label: 'Mood', value: 65, color: '#6ee7b7' },
            { key: 'energy', label: 'Energy', value: 60, color: '#38bdf8' },
            { key: 'focus', label: 'Focus', value: 70, color: '#c0c4ea' },
          ],
          confidencePct: 75,
          confidenceLabel: 'High',
          isCold: false,
          activeSignalsCount: 4,
        },
        whatsHappening: {
          headline: 'Your focus has been consistent.',
          detail: 'Adjusted by +3 pts across your recent check-ins.',
          hasData: true,
        },
        triggers: ['Nature', 'Work'],
        sensations: ['Deep breathing'],
        onExploreDetails: () => {},
      })
    );
    assert.ok(html.length > 0, 'Must render living summary');
    assert.match(html, /CURRENT STATE/, 'Must render CURRENT STATE');
    assert.match(html, /Steady Equilibrium/, 'Must render title');
  });

  it('3. ObservatoryLivingSummary renders safely even when summary prop is omitted (defensive fallback)', () => {
    const html = renderToString(
      React.createElement(ObservatoryLivingSummary, {
        whatsHappening: {
          headline: 'Mindful is learning your rhythm.',
          detail: '',
          hasData: false,
        },
        personalState: null,
        onExploreDetails: () => {},
      })
    );
    assert.ok(html.length > 0, 'Must render without throwing when summary is omitted');
    assert.match(html, /CURRENT STATE/, 'Must render CURRENT STATE header');
    assert.match(html, /Establishing Baseline|ESTABLISHING BASELINE/, 'Must display cold state fallback');
  });
});
