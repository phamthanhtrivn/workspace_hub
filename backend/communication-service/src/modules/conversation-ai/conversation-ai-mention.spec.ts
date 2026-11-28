import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiQuestion } from './conversation-ai-mention';
import { CONVERSATION_AI_MESSAGES } from './conversation-ai.messages';

const authoredCases: Array<[string, string]> = [
  ['@AI Bot Summarize this', 'Summarize this'],
  ['Please @AI Bot summarize this', 'Please summarize this'],
  ['Summarize this @AI Bot', 'Summarize this'],
  ['Please @ai summarize this @AI Bot', 'Please summarize this'],
  ['@Ai bOt: help!', ': help!'],
  ['Hello, @AI Bot! Help.', 'Hello, ! Help.'],
  ['(@AI Bot) help', '() help'],
  ['First line\n@AI Bot second line', 'First line\nsecond line'],
  [
    'Giúp tui @AI Bot tóm tắt cuộc trò chuyện',
    'Giúp tui tóm tắt cuộc trò chuyện',
  ],
  ['@AI Bot @ai @AI Bot', CONVERSATION_AI_MESSAGES.emptyQuestion],
  ['@ai', CONVERSATION_AI_MESSAGES.emptyQuestion],
  ['  @AI\tBot   Keep  internal\n  spacing.  ', 'Keep  internal\n  spacing.'],
  ['`@AI Bot` literal; @AI Bot explain', '`@AI Bot` literal; explain'],
  ['``literal ` @AI Bot``; @ai explain', '``literal ` @AI Bot``; explain'],
  ['```js\n@AI Bot\n```\n@AI Bot explain', '```js\n@AI Bot\n```\nexplain'],
  [
    '~~~text\n@ai\n~~~\nPlease @ai explain',
    '~~~text\n@ai\n~~~\nPlease explain',
  ],
  ['> @AI Bot quoted\n\n@AI Bot explain', '> @AI Bot quoted\n\nexplain'],
  ['\\`literal @AI Bot help', '\\`literal help'],
  ['Unmatched ` then @AI Bot help', 'Unmatched ` then help'],
  [
    'First ` paragraph\n\n@AI Bot second ` paragraph',
    'First ` paragraph\n\nsecond ` paragraph',
  ],
];

for (const [content, expected] of authoredCases) {
  void test(`authored mention: ${JSON.stringify(content)}`, () => {
    assert.equal(aiQuestion(content), expected);
  });
}

const ignoredCases = [
  '',
  'Just an ordinary message',
  'AI Bot without an @',
  'mail@ai.example',
  'mail@AI Bot',
  'https://example.com/@AI Bot',
  '@air help',
  '@ai_bot help',
  '@ai-helper help',
  '@ai你好',
  'prefix@AI Bot',
  '\\@AI Bot help',
  '`@AI Bot`',
  '``literal ` @AI Bot``',
  '`multiline\n@AI Bot\ncode`',
  '```js\n@AI Bot\n```',
  '~~~\n@AI Bot\n~~~',
  '````\n```\n@AI Bot\n````',
  '```\n@AI Bot unclosed fence',
  '    @AI Bot indented code',
  '\t@ai code',
  '> @AI Bot quoted',
  '  >> @ai nested quote',
  '> quoted\n@AI Bot lazy continuation',
  '> ```\n> @AI Bot\n> ```',
];

for (const content of ignoredCases) {
  void test(`no authored mention: ${JSON.stringify(content)}`, () => {
    assert.equal(aiQuestion(content), null);
  });
}

void test('the question keeps the existing 4,000-character limit after removing mentions', () => {
  assert.equal(aiQuestion(`@AI Bot ${'a'.repeat(4001)}`), 'a'.repeat(4000));
  assert.equal(aiQuestion(`${'a'.repeat(4001)} @AI Bot`), 'a'.repeat(4000));
});
