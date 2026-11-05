// Cloudflare Worker: 地図版の「AI解説」。APIキーは Worker の secret（ANTHROPIC_API_KEY）にだけ置く。
import Anthropic from '@anthropic-ai/sdk';
import { handle, isGemini, geminiModel, geminiBody, fromGemini } from './explain.js';

const FALLBACK_MODELS = new Set(['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1']);

export default {
  async fetch(request, env) {
    const generate = async (system, user, model) => {
      if (isGemini(model)) {
        // Gemini: the key goes in a header, never in the URL, so it cannot end up in logs.
        const { name, level } = geminiModel(model);
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(name)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY || '' },
          body: JSON.stringify(geminiBody(system, user, level)),
          signal: AbortSignal.timeout(45_000),
        });
        if (!r.ok) throw Object.assign(new Error('gemini ' + r.status), { status: r.status });
        return fromGemini(await r.json());
      }
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
