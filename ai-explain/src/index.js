// Cloudflare Worker: 地図版の「AI解説」。APIキーは Worker の secret（ANTHROPIC_API_KEY）にだけ置く。
import Anthropic from '@anthropic-ai/sdk';
import { handle } from './explain.js';

const FALLBACK_MODELS = new Set(['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1']);

export default {
  async fetch(request, env) {
    const generate = async (system, user, model) => {
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL || undefined, maxRetries: 1, timeout: 25_000 });
      // Claude Sonnet 5.5 can decline a request on a safety classifier; the server-side fallback
      // re-runs it on a suitable model in the same call instead of returning a refusal.
      const fallback = FALLBACK_MODELS.has(model);
      const params = {
        model,
        max_tokens: 2000,
        output_config: { effort: 'low' },
        system,
        messages: [{ role: 'user', content: user }],
      };
      const msg = fallback
        ? await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
        : await client.messages.create(params);
      const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
      return { text, stop: msg.stop_reason };
    };
    return handle(request, env, generate);
  },
};
