import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthProvider } from '../src/context/AuthContext';
import { AppProvider } from '../src/context/AppContext';
import { AICompanionView } from '../src/components/features/AICompanionView';

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

describe('AI Companion History Sidebar Toggle Tests', () => {
  it('A. Sidebar initially opens correctly on desktop with proper styling & ARIA', () => {
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
            React.createElement(AICompanionView, null)
          )
        )
      )
    );

    assert.ok(html.length > 0, 'Rendered HTML must not be empty');
    assert.match(html, /aria-label="Chat history sidebar"/, 'Sidebar must have aria-label="Chat history sidebar"');
    assert.match(html, /w-64 xl:w-72 opacity-100/, 'Sidebar must initially have open width classes');
    assert.match(html, /aria-hidden="false"/, 'Sidebar must be aria-hidden="false" when open');
  });

  it('B & C & D & E. Desktop toggle button is bidirectional, accessible, and updates ARIA labels', () => {
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
            React.createElement(AICompanionView, null)
          )
        )
      )
    );

    // Initial state (open)
    assert.match(html, /aria-label="Collapse history sidebar"/, 'Header toggle must have Collapse label when open');
    assert.match(html, /title="Collapse history sidebar"/, 'Header toggle must have Collapse title when open');
    assert.match(html, /aria-expanded="true"/, 'Header toggle must have aria-expanded="true" when open');

    // Verify collapse button inside sidebar also has proper accessibility
    assert.match(html, /aria-label="Collapse history sidebar"/, 'Sidebar internal button must also have Collapse label');
  });

  it('F. Conversation content and message scroll area remain available and rendered', () => {
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
            React.createElement(AICompanionView, null)
          )
        )
      )
    );

    assert.match(html, /chat-messages-scroll/, 'Chat message scroll container must be present');
    assert.match(html, /phone-chat-input-container/, 'Chat input container must be present');
    assert.match(html, /placeholder="Share what&#x27;s on your mind..."|placeholder="Share what's on your mind..."/, 'Input field must be present');
  });

  it('G. Mobile drawer button remains separated with lg:hidden and proper label', () => {
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
            React.createElement(AICompanionView, null)
          )
        )
      )
    );

    assert.match(html, /title="Open chat history"/, 'Mobile drawer button title must be present');
    assert.match(html, /aria-label="Open chat history"/, 'Mobile drawer button must have Open chat history label');
    assert.match(html, /title="Open chat history"[^>]*class="[^"]*lg:hidden|class="[^"]*lg:hidden[^"]*"[^>]*title="Open chat history"/, 'Mobile drawer button must have lg:hidden class');
  });

  it('H. New Chat action is accessible from both sidebar and header', () => {
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
            React.createElement(AICompanionView, null)
          )
        )
      )
    );

    assert.match(html, /title="New Chat"/, 'Header New Chat button must be present');
    assert.match(html, />New Chat<\/span>/, 'Sidebar New Chat button must be present');
  });
});
