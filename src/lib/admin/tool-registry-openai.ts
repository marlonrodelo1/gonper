/**
 * Convierte el catálogo de tools (Zod) al formato OpenAI/DeepSeek
 * (`ToolFunction[]`) que entiende `chatDeepSeekWithTools`.
 *
 * Se usa desde el bot Telegram de salones (orquestador Juanita Pro)
 * y desde el bot Royce (admin Telegram). Antes esta traducción se
 * hacía manualmente dentro de cada workflow n8n.
 *
 * Zod 4 incluye `z.toJSONSchema()` nativo, así que no hace falta
 * añadir `zod-to-json-schema` como dependencia.
 */

import { z } from 'zod';

import type { ToolFunction } from '@/lib/llm/deepseek-tools';
import { TOOLS as JUANITA_TOOLS, type AnyToolDef } from './tool-registry';
import { ROYCE_TOOLS, type AnyRoyceToolDef } from './royce-tool-registry';

function toolDefToOpenAI(tool: AnyToolDef | AnyRoyceToolDef): ToolFunction {
  const schema = z.toJSONSchema(tool.schema) as Record<string, unknown>;
  // El $schema raíz no lo entiende OpenAI/DeepSeek — lo quitamos.
  delete schema.$schema;
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.descripcion,
      parameters: schema,
    },
  };
}

/** Tools de Juanita Pro (dueño del salón) en formato OpenAI. */
export const JUANITA_TOOLS_OPENAI: ToolFunction[] =
  JUANITA_TOOLS.map(toolDefToOpenAI);

/** Tools globales de Royce en formato OpenAI. */
export const ROYCE_TOOLS_OPENAI: ToolFunction[] =
  ROYCE_TOOLS.map(toolDefToOpenAI);
