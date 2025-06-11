import 'server-only';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext(): ResumableStreamContext | null {
  if (!globalStreamContext) {
    try {
      // Create Redis clients using ioredis instead of default redis
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
        return null;
      }

      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
        keyPrefix: 'chatbot-streams',
      });
    } catch (error: any) {
      console.error('[getStreamContext] Error creating stream context:', error);
    }
  }

  return globalStreamContext;
}
