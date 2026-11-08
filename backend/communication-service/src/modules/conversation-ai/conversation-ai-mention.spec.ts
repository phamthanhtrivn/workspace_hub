import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aiQuestion } from './conversation-ai-mention';

void test('visible AI Bot label and legacy ai trigger produce the same question', () => {
  for (const content of [
    '@ai Explain this',
    '@AI Bot Explain this',
    '  @ai bot\nExplain this',
  ]) {
    assert.equal(aiQuestion(content), 'Explain this');
  }
  assert.equal(aiQuestion('@AI Bot'), aiQuestion('@ai'));
  assert.equal(aiQuestion('@AI Bot'), 'How can you help?');
});

void test('AI mention requires the complete trigger at the start and limits question length', () => {
  assert.equal(aiQuestion('ask @AI Bot later'), null);
  assert.equal(aiQuestion('@airplane hello'), null);
  assert.equal(
    aiQuestion('@ai Botany is interesting'),
    'Botany is interesting',
  );
  assert.equal(aiQuestion('@AI Bot ' + 'x'.repeat(5000))?.length, 4000);
});
