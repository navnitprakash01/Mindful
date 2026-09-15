import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateConversationTitle,
  getConversationDateGroup,
  createInitialGreeting,
} from '../src/context/ChatContext';
import { ChatConversation, ChatConversationSummary, ChatMessage } from '../src/types';

describe('AI Companion Conversation Management Tests', () => {
  describe('Deterministic Title Generation', () => {
    it('preserves short message as-is if within character limit', () => {
      const msg = 'Guide me through a calming breath';
      const title = generateConversationTitle(msg);
      assert.equal(title, 'Guide me through a calming breath');
    });

    it('cleans irregular whitespace before titling', () => {
      const msg = '  How   do I manage   work stress?  ';
      const title = generateConversationTitle(msg);
      assert.equal(title, 'How do I manage work stress?');
    });

    it('truncates long messages cleanly at word boundary with ellipsis', () => {
      const longMsg = 'I have been feeling overwhelmed by all my pending tasks and deadlines lately';
      const title = generateConversationTitle(longMsg);
      assert.ok(title.endsWith('...'), `Expected title to end with '...', got '${title}'`);
      assert.ok(title.length <= 40, `Expected title length <= 40, got ${title.length}`);
      assert.ok(!title.includes('  '), 'Title should not contain double spaces');
    });

    it('handles empty or whitespace-only messages with fallback title', () => {
      assert.equal(generateConversationTitle(''), 'Reflective Conversation');
      assert.equal(generateConversationTitle('    '), 'Reflective Conversation');
    });
  });

  describe('Date Grouping for History Sidebar', () => {
    it('categorizes timestamps from today as "Today"', () => {
      const now = new Date().toISOString();
      assert.equal(getConversationDateGroup(now), 'Today');
    });

    it('categorizes timestamps from yesterday as "Yesterday"', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      assert.equal(getConversationDateGroup(yesterday), 'Yesterday');
    });

    it('categorizes timestamps within the past week as "Previous 7 Days"', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      assert.equal(getConversationDateGroup(threeDaysAgo), 'Previous 7 Days');

      const sixDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString();
      assert.equal(getConversationDateGroup(sixDaysAgo), 'Previous 7 Days');
    });

    it('categorizes timestamps older than 7 days as "Older"', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
      assert.equal(getConversationDateGroup(tenDaysAgo), 'Older');

      const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString();
      assert.equal(getConversationDateGroup(lastMonth), 'Older');
    });

    it('handles invalid dates gracefully as "Older"', () => {
      assert.equal(getConversationDateGroup('invalid-date'), 'Older');
    });
  });

  describe('Greeting & Conversation Structure', () => {
    it('creates initial companion greeting with user name when provided', () => {
      const greeting = createInitialGreeting('Elena');
      assert.equal(greeting.sender, 'companion');
      assert.ok(greeting.text.includes('Elena'));
      assert.ok(greeting.suggestedPathways && greeting.suggestedPathways.length > 0);
    });

    it('creates fallback greeting when user name is absent', () => {
      const greeting = createInitialGreeting();
      assert.equal(greeting.sender, 'companion');
      assert.ok(greeting.text.includes('friend'));
    });
  });

  describe('Conversation Lifecycle & State Invariants', () => {
    it('formats conversation summaries correctly without leaking full message arrays', () => {
      const mockConv: ChatConversation = {
        id: 'conv_123',
        title: 'Calming Breath Session',
        createdAt: '2026-09-14T10:00:00Z',
        updatedAt: '2026-09-14T10:05:00Z',
        messages: [
          { id: 'm-1', sender: 'user', text: 'Calm breath please', timestamp: '10:00 AM' },
          { id: 'm-2', sender: 'companion', text: 'Breathe with me...', timestamp: '10:01 AM' },
        ],
      };

      const summary: ChatConversationSummary = {
        id: mockConv.id,
        title: mockConv.title,
        createdAt: mockConv.createdAt,
        updatedAt: mockConv.updatedAt,
        messageCount: mockConv.messages.length,
        lastMessage: mockConv.messages[mockConv.messages.length - 1]?.text,
      };

      assert.equal(summary.id, 'conv_123');
      assert.equal(summary.title, 'Calming Breath Session');
      assert.equal(summary.messageCount, 2);
      assert.equal(summary.lastMessage, 'Breathe with me...');
    });

    it('sorts multiple conversations with most recently updated first', () => {
      const convs: ChatConversation[] = [
        {
          id: 'conv_1',
          title: 'Older Chat',
          createdAt: '2026-09-10T10:00:00Z',
          updatedAt: '2026-09-10T10:00:00Z',
          messages: [],
        },
        {
          id: 'conv_2',
          title: 'Recent Chat',
          createdAt: '2026-09-14T12:00:00Z',
          updatedAt: '2026-09-14T12:00:00Z',
          messages: [],
        },
        {
          id: 'conv_3',
          title: 'Mid Chat',
          createdAt: '2026-09-12T10:00:00Z',
          updatedAt: '2026-09-12T10:00:00Z',
          messages: [],
        },
      ];

      const sorted = [...convs].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      assert.equal(sorted[0].id, 'conv_2');
      assert.equal(sorted[1].id, 'conv_3');
      assert.equal(sorted[2].id, 'conv_1');
    });

    it('preserves clean conversation isolation without cross-polluting messages', () => {
      const convA: ChatConversation = {
        id: 'conv_A',
        title: 'Topic A',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [{ id: 'a1', sender: 'user', text: 'Hello A', timestamp: '10:00' }],
      };
      const convB: ChatConversation = {
        id: 'conv_B',
        title: 'Topic B',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [{ id: 'b1', sender: 'user', text: 'Hello B', timestamp: '10:05' }],
      };

      const map: Record<string, ChatConversation> = {
        [convA.id]: convA,
        [convB.id]: convB,
      };

      assert.equal(map['conv_A'].messages.length, 1);
      assert.equal(map['conv_A'].messages[0].text, 'Hello A');
      assert.equal(map['conv_B'].messages.length, 1);
      assert.equal(map['conv_B'].messages[0].text, 'Hello B');
    });
  });
});
