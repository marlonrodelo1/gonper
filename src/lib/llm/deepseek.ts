// Helper para llamar a la API de DeepSeek (OpenAI-compatible).
// La API key se lee de process.env.DEEPSEEK_API_KEY (configurar en .env.local).

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_TIMEOUT_MS = 30_000;

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatDeepSeekParams = {
  systemPrompt: string;
  messages: Array<ChatMessage>;
  temperature?: number;
  maxTokens?: number;
};

export type ChatDeepSeekResult = {
  reply: string;
  tokensIn: number;
  tokensOut: number;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
};

export async function chatDeepSeek(
  params: ChatDeepSeekParams,
): Promise<ChatDeepSeekResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      'DEEPSEEK_API_KEY no está configurada. Añádela a .env.local.',
    );
  }

  const {
    systemPrompt,
    messages,
    temperature = 0.5,
    maxTokens = 400,
  } = params;

  const body = {
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('DeepSeek timeout: la API tardó más de 30s en responder.');
    }
    throw new Error(
      `DeepSeek network error: ${e instanceof Error ? e.message : String(e)}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `DeepSeek HTTP ${response.status}: ${detail.slice(0, 500)}`,
    );
  }

  const data = (await response.json().catch(() => null)) as DeepSeekResponse | null;

  if (!data) {
    throw new Error('DeepSeek devolvió una respuesta no JSON.');
  }

  if (data.error) {
    throw new Error(`DeepSeek API error: ${data.error.message ?? 'desconocido'}`);
  }

  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply || reply.length === 0) {
    throw new Error('DeepSeek devolvió una respuesta vacía.');
  }

  const tokensIn = data.usage?.prompt_tokens ?? 0;
  const tokensOut = data.usage?.completion_tokens ?? 0;

  return { reply, tokensIn, tokensOut };
}

/**
 * Calcula el coste aproximado en EUR a partir de los tokens consumidos.
 * Tarifa orientativa DeepSeek: 0.27 €/1M input + 1.10 €/1M output.
 */
export function calcularCosteEur(tokensIn: number, tokensOut: number): number {
  const coste = tokensIn * 0.00000027 + tokensOut * 0.0000011;
  return Math.round(coste * 1_000_000) / 1_000_000;
}
