// Helper para usar tool calling con DeepSeek (OpenAI-compatible).
// Esta variante acepta `tools` (functions) y devuelve los `tool_calls` del modelo
// además del reply textual. Se usa en el chat público de la tienda para
// permitir reservar dentro del propio chat.

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_TIMEOUT_MS = 30_000;

export type ToolFunction = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON-string con los args
  };
};

export type ToolMsg =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: ToolCall[];
    }
  | { role: 'tool'; tool_call_id: string; content: string };

export type ChatToolsResult = {
  reply: string;
  toolCalls: ToolCall[];
  finishReason: string | null;
  tokensIn: number;
  tokensOut: number;
};

type DeepSeekToolResponse = {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string; type?: string; code?: string | number };
};

export async function chatDeepSeekWithTools(params: {
  messages: ToolMsg[];
  tools: ToolFunction[];
  toolChoice?: 'auto' | 'none';
  temperature?: number;
  maxTokens?: number;
}): Promise<ChatToolsResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      'DEEPSEEK_API_KEY no está configurada. Añádela a .env.local.',
    );
  }

  const body = {
    model: DEFAULT_MODEL,
    messages: params.messages,
    tools: params.tools,
    tool_choice: params.toolChoice ?? 'auto',
    temperature: params.temperature ?? 0.4,
    max_tokens: params.maxTokens ?? 600,
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
    throw new Error(`DeepSeek HTTP ${response.status}: ${detail.slice(0, 500)}`);
  }

  const data = (await response.json().catch(() => null)) as DeepSeekToolResponse | null;
  if (!data) throw new Error('DeepSeek devolvió una respuesta no JSON.');
  if (data.error) {
    throw new Error(`DeepSeek API error: ${data.error.message ?? 'desconocido'}`);
  }

  const choice = data.choices?.[0];
  const reply = choice?.message?.content?.trim() ?? '';
  const toolCalls = Array.isArray(choice?.message?.tool_calls)
    ? choice!.message!.tool_calls!
    : [];
  const finishReason = choice?.finish_reason ?? null;

  return {
    reply,
    toolCalls,
    finishReason,
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
  };
}
