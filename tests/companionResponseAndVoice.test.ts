import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { companionService } from '../src/server/services/companionService';
import { geminiClient, getContextualFallbackResponse } from '../src/server/services/geminiClient';
import { screenForCrisis } from '../src/server/engine/interventionEngine/safety';

process.env.NODE_ENV = 'test';

describe('Mindful 3.0 Companion Response & Voice Playback Verification', () => {
  describe('Contextual Non-Generic Response Handling', () => {
    it('produces contextual, distinct responses for greetings and check-ins', async () => {
      const userId = randomUUID();

      const helloResponse = await companionService.chat(userId, 'hello', [], 'Empathetic Listener');
      const howAreYouResponse = await companionService.chat(userId, 'how are you', [], 'Empathetic Listener');

      assert.ok(helloResponse.message, 'Must return a non-empty message for hello');
      assert.ok(howAreYouResponse.message, 'Must return a non-empty message for how are you');

      // Responses must not be identical
      assert.notStrictEqual(
        helloResponse.message.trim().toLowerCase(),
        howAreYouResponse.message.trim().toLowerCase(),
        'Responses to "hello" and "how are you" must not be identical'
      );

      // Must be unified reply/message
      assert.strictEqual(helloResponse.message, helloResponse.reply);
      assert.strictEqual(howAreYouResponse.message, howAreYouResponse.reply);
    });

    it('produces contextual responses for stress, workload, and assignments', async () => {
      const userId = randomUUID();
      const stressInput = "I had a busy day with several assignments. I feel a little mentally tired, but I'm otherwise okay.";

      const response = await companionService.chat(userId, stressInput, [], 'Empathetic Listener');

      assert.ok(response.message);
      assert.ok(response.suggestions && response.suggestions.length > 0);
      assert.deepStrictEqual(response.suggestions, response.suggestedPathways);

      // Must not be the generic single-sentence fallback
      assert.notStrictEqual(
        response.message,
        'I am present with you. How can I support your inner peace and clarity today?'
      );
    });

    it('adapts contextual responses across companion modes', async () => {
      const userId = randomUUID();
      const input = 'I am overwhelmed by my deadlines and need to focus.';

      const coachResponse = await companionService.chat(userId, input, [], 'Mindful Coach');
      const stoicResponse = await companionService.chat(userId, input, [], 'Stoic Philosopher');
      const cbtResponse = await companionService.chat(userId, input, [], 'CBT Reframer');

      assert.ok(coachResponse.message);
      assert.ok(stoicResponse.message);
      assert.ok(cbtResponse.message);

      // Verify responses reflect distinct modalities
      assert.notStrictEqual(coachResponse.message, stoicResponse.message);
      assert.notStrictEqual(coachResponse.message, cbtResponse.message);
    });
  });

  describe('Resilient Offline/Fallback Generator', () => {
    it('generates distinct, mode-appropriate responses when offline for different inputs', () => {
      const fallbackGreeting = getContextualFallbackResponse('hello', 'Empathetic Listener');
      const fallbackHowAreYou = getContextualFallbackResponse('how are you', 'Empathetic Listener');
      const fallbackStress = getContextualFallbackResponse('I am so stressed and busy with work', 'Mindful Coach');
      const fallbackFatigue = getContextualFallbackResponse('I am completely exhausted and tired', 'Stoic Philosopher');

      assert.ok(fallbackGreeting.message.length > 10);
      assert.ok(fallbackHowAreYou.message.length > 10);
      assert.ok(fallbackStress.message.length > 10);
      assert.ok(fallbackFatigue.message.length > 10);

      // None of them should be the repetitive generic sentence
      assert.notStrictEqual(
        fallbackGreeting.message,
        'I am present with you. How can I support your inner peace and clarity today?'
      );
      assert.notStrictEqual(
        fallbackStress.message,
        'I am present with you. How can I support your inner peace and clarity today?'
      );

      // Different inputs generate distinct responses
      assert.notStrictEqual(fallbackGreeting.message, fallbackHowAreYou.message);
      assert.notStrictEqual(fallbackStress.message, fallbackFatigue.message);
    });
  });

  describe('Ingress Safety Boundary & Crisis Intercept', () => {
    it('intercepts crisis messages deterministically before any LLM/fallback processing', async () => {
      const userId = randomUUID();
      const response = await companionService.chat(userId, 'I want to end my life, please help');

      assert.strictEqual(response.isCrisisDetected, true);
      assert.ok(response.message.includes('988'));
      assert.ok(response.suggestions.includes('Call 988'));
    });
  });

  describe('Speech/Voice Text Consistency', () => {
    it('guarantees response text is clean string suitable for speech synthesis without raw JSON or leakages', async () => {
      const userId = randomUUID();
      const response = await companionService.chat(userId, 'how can I manage my afternoon slump?', [], 'Mindful Coach');

      // Must not contain JSON brackets or syntax
      assert.doesNotMatch(response.message, /^\{.*\}$/s, 'Message must not be raw JSON string');
      assert.doesNotMatch(response.message, /"message":\s*"/, 'Message must not contain JSON keys');
      assert.doesNotMatch(response.message, /<user_context>/, 'Message must not leak prompt tags');
      assert.doesNotMatch(response.message, /<memory/, 'Message must not leak memory tags');

      // Spoken text matches displayed text exactly
      assert.strictEqual(response.message, response.reply, 'Message and reply must match exactly for audio sync');
    });
  });
});
