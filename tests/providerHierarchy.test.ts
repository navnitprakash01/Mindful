/**
 * Provider Hierarchy & Context Dependency Regression Tests
 * Mindful 3.0 — Blocker Fix: HabitsProvider / StateProvider nesting verification
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { HabitsProvider } from '../src/context/HabitsContext';
import { StateProvider } from '../src/context/StateContext';
import { InterventionProvider } from '../src/context/InterventionContext';
import { AppProvider } from '../src/context/AppContext';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';

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

describe('Provider Hierarchy & Context Dependency Invariants', () => {
  it('proves HabitsProvider CANNOT initialize outside StateProvider and throws exact error', () => {
    assert.throws(
      () => {
        renderToString(
          React.createElement(
            ToastProvider,
            null,
            React.createElement(
              AuthProvider,
              null,
              React.createElement(
                HabitsProvider,
                null,
                React.createElement('div', null, 'child')
              )
            )
          )
        );
      },
      (err: any) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes('usePersonalState must be used within a StateProvider'),
          `Expected usePersonalState error but got: ${err.message}`
        );
        return true;
      }
    );
  });

  it('proves InterventionProvider CANNOT initialize outside StateProvider and throws exact error', () => {
    assert.throws(
      () => {
        renderToString(
          React.createElement(
            ToastProvider,
            null,
            React.createElement(
              AuthProvider,
              null,
              React.createElement(
                InterventionProvider,
                null,
                React.createElement('div', null, 'child')
              )
            )
          )
        );
      },
      (err: any) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes('usePersonalState must be used within a StateProvider'),
          `Expected usePersonalState error but got: ${err.message}`
        );
        return true;
      }
    );
  });

  it('renders HabitsProvider and InterventionProvider cleanly when correctly nested under StateProvider', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          null,
          React.createElement(
            StateProvider,
            null,
            React.createElement(
              HabitsProvider,
              null,
              React.createElement(
                InterventionProvider,
                null,
                React.createElement('div', { id: 'test-child' }, 'Nested Successfully')
              )
            )
          )
        )
      )
    );

    assert.ok(html.includes('Nested Successfully'), 'Must render children when nested under StateProvider');
  });

  it('renders the complete AppProvider hierarchy cleanly with StateProvider as an ancestor of HabitsProvider', () => {
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
            React.createElement('div', { id: 'root-content' }, 'App Tree Rendered')
          )
        )
      )
    );

    assert.ok(html.includes('App Tree Rendered'), 'Complete AppProvider tree must render without throwing');
  });
});
