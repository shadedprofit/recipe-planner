import Anthropic from '@anthropic-ai/sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  ExtractIngredientsResponseSchema,
  type ExtractIngredientsResponse,
} from 'recipe-planner-shared';

export const CLAUDE_MODEL = 'claude-sonnet-4-6';

const MAX_TOKENS = 1024;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey });
}

export async function extractIngredients(images: string[]): Promise<ExtractIngredientsResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputSchema = zodToJsonSchema(ExtractIngredientsResponseSchema as any, {
    $refStrategy: 'none',
  }) as Anthropic.Messages.Tool.InputSchema;

  const tool: Anthropic.Messages.Tool = {
    name: 'extract_ingredients',
    description:
      'Extract every distinct ingredient visible across all provided photos. ' +
      'Assign a confidence score in [0, 1] to each.',
    input_schema: inputSchema,
  };

  const imageBlocks: Anthropic.Messages.ImageBlockParam[] = images.map((data) => ({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data },
  }));

  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'extract_ingredients' },
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
          {
            type: 'text',
            text: 'Identify every distinct ingredient visible across all the images above. Return a deduplicated list with a confidence score for each.',
          },
        ],
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw new Error('Model did not return a tool_use block for extract_ingredients');
  }

  return ExtractIngredientsResponseSchema.parse(block.input);
}
