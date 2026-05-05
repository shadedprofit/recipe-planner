import Anthropic from '@anthropic-ai/sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ZodError } from 'zod';
import {
  ExtractIngredientsResponseSchema,
  GenerateRecipesResponseSchema,
  type ExtractIngredientsResponse,
  type GenerateRecipesResponse,
} from 'recipe-planner-shared';

export const CLAUDE_MODEL = 'claude-sonnet-4-6';

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey });
}

function parseToolUseInput<T>(
  content: Anthropic.Messages.ContentBlock[],
  toolName: string,
  schema: { parse: (v: unknown) => T },
): T {
  const block = content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw new Error(`Model did not return a tool_use block for ${toolName}`);
  }
  try {
    return schema.parse(block.input);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new Error(`Claude returned malformed data for ${toolName}: ${err.message}`);
    }
    throw err;
  }
}

export async function extractIngredientsWithClaude(
  images: string[],
): Promise<ExtractIngredientsResponse> {
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
    max_tokens: 1024,
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

  return parseToolUseInput(
    response.content,
    'extract_ingredients',
    ExtractIngredientsResponseSchema,
  );
}

export { extractIngredientsWithClaude as extractIngredients };

export async function generateRecipes(
  ingredients: string[],
  excludeRecipeIds: string[],
): Promise<GenerateRecipesResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputSchema = zodToJsonSchema(GenerateRecipesResponseSchema as any, {
    $refStrategy: 'none',
  }) as Anthropic.Messages.Tool.InputSchema;

  const tool: Anthropic.Messages.Tool = {
    name: 'generate_recipes',
    description:
      'Generate exactly 5 distinct recipes using the listed ingredients. ' +
      'Assign each recipe a unique, stable, human-readable id (e.g. "pasta-pomodoro").',
    input_schema: inputSchema,
  };

  const excludeClause =
    excludeRecipeIds.length > 0
      ? `\n\nDo not include any recipe with these ids: ${excludeRecipeIds.join(', ')}.`
      : '';

  const userText =
    `I have these ingredients available: ${ingredients.join(', ')}.` +
    excludeClause +
    '\n\nGenerate exactly 5 delicious, distinct recipes I can make. Each recipe must have a unique id.';

  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'generate_recipes' },
    messages: [{ role: 'user', content: userText }],
  });

  return parseToolUseInput(response.content, 'generate_recipes', GenerateRecipesResponseSchema);
}
