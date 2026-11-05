// Cloudflare Worker: 地図版の「AI解説」。APIキーは Worker の secret（ANTHROPIC_API_KEY）にだけ置く。
import Anthropic from '@anthropic-ai/sdk';
import { handle } from './explain.js';

export default {
  async fetch(request, env) {
    const generate = async (system, user, model) => {
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL || undefined, maxRetries: 1, timeout: 25_000 });
      const msg = await client.messages.create({
        model,
        max_tokens: 1200,
        output_config: { effort: 'low' },
        system,
        messages: [{ role: 'user', content: user }],
      });
      const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
      return { text, stop: msg.stop_reason };
    };
    return handle(request, env, generate);
  },
};
