import { generateUUID } from '@/lib/utils';

export const TEST_PROMPTS = {
  TEST_PROMPT_1: {
    MESSAGE: {
      id: generateUUID(),
      createdAt: new Date(),
      role: 'user',
      content: 'Test prompt 1',
      parts: [{ type: 'text', text: 'Test prompt 1' }],
    },
    RESPONSE: 'Test response 1',
    OUTPUT_STREAM: [
      'f:{"messageId":"123"}',
      '0:"Test "',
      '0:"response "',
      '0:"1"',
      'e:{"finishReason": "stop", "usage": {"promptTokens": 3, "completionTokens": 3}, "isContinued": false}',
      'd:{"finishReason": "stop", "usage": {"promptTokens": 3, "completionTokens": 3}}',
    ],
  },
  TEST_PROMPT_2: {
    MESSAGE: {
      id: generateUUID(),
      createdAt: new Date(),
      role: 'user',
      content: 'Test prompt 2',
      parts: [{ type: 'text', text: 'Test prompt 2' }],
    },
    RESPONSE: 'Test response 2',
    OUTPUT_STREAM: [
      'f:{"messageId":"123"}',
      '0:"Test "',
      '0:"response "',
      '0:"2"',
      'e:{"finishReason": "stop", "usage": {"promptTokens": 3, "completionTokens": 3}, "isContinued": false}',
      'd:{"finishReason": "stop", "usage": {"promptTokens": 3, "completionTokens": 3}}',
    ],
  },
};
