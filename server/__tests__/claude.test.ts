const mockMessagesCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  })),
}));

import { extractIngredients, generateRecipes } from '../src/services/claude';

const toolUseBlock = (name: string, input: unknown) => ({
  content: [{ type: 'tool_use', id: 'tu_1', name, input }],
  stop_reason: 'tool_use',
});

const buildRecipes = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `recipe-${i}`,
    title: `Recipe ${i}`,
    description: 'Desc',
    totalTimeMinutes: 20,
    servings: 2,
    ingredients: [{ name: 'egg', quantity: '2', unit: '' }],
    steps: ['Cook it'],
    tags: [],
  }));

beforeEach(() => {
  mockMessagesCreate.mockReset();
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

afterAll(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

describe('extractIngredients', () => {
  it('returns parsed ingredients from a valid tool_use response', async () => {
    mockMessagesCreate.mockResolvedValue(
      toolUseBlock('extract_ingredients', {
        ingredients: [{ name: 'tomato', confidence: 0.9 }],
      }),
    );

    const result = await extractIngredients(['base64img']);
    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0].name).toBe('tomato');
  });

  it('passes one image block per image to the API', async () => {
    mockMessagesCreate.mockResolvedValue(toolUseBlock('extract_ingredients', { ingredients: [] }));
    await extractIngredients(['a', 'b', 'c']);

    const call = mockMessagesCreate.mock.calls[0][0];
    const imageBlocks = call.messages[0].content.filter(
      (b: { type: string }) => b.type === 'image',
    );
    expect(imageBlocks).toHaveLength(3);
  });

  it('appends a text block after the image blocks', async () => {
    mockMessagesCreate.mockResolvedValue(toolUseBlock('extract_ingredients', { ingredients: [] }));
    await extractIngredients(['a']);

    const call = mockMessagesCreate.mock.calls[0][0];
    const lastBlock = call.messages[0].content.at(-1);
    expect(lastBlock.type).toBe('text');
  });

  it('forces tool_choice to extract_ingredients', async () => {
    mockMessagesCreate.mockResolvedValue(toolUseBlock('extract_ingredients', { ingredients: [] }));
    await extractIngredients(['a']);

    const call = mockMessagesCreate.mock.calls[0][0];
    expect(call.tool_choice).toEqual({ type: 'tool', name: 'extract_ingredients' });
  });

  it('throws when the model returns no tool_use block', async () => {
    mockMessagesCreate.mockResolvedValue({ content: [{ type: 'text', text: 'nope' }] });
    await expect(extractIngredients(['a'])).rejects.toThrow('tool_use');
  });

  it('throws when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(extractIngredients(['a'])).rejects.toThrow('ANTHROPIC_API_KEY');
  });

  it('wraps a Zod parse failure as a plain Error (not a ZodError)', async () => {
    mockMessagesCreate.mockResolvedValue(
      toolUseBlock('extract_ingredients', {
        ingredients: [{ name: '', confidence: 999 }],
      }),
    );
    await expect(extractIngredients(['a'])).rejects.toThrow('malformed');
  });
});

describe('generateRecipes', () => {
  it('returns 5 parsed recipes from a valid tool_use response', async () => {
    mockMessagesCreate.mockResolvedValue(
      toolUseBlock('generate_recipes', { recipes: buildRecipes(5) }),
    );

    const result = await generateRecipes(['egg', 'butter'], []);
    expect(result.recipes).toHaveLength(5);
  });

  it('forces tool_choice to generate_recipes', async () => {
    mockMessagesCreate.mockResolvedValue(
      toolUseBlock('generate_recipes', { recipes: buildRecipes(5) }),
    );
    await generateRecipes(['egg'], []);

    const call = mockMessagesCreate.mock.calls[0][0];
    expect(call.tool_choice).toEqual({ type: 'tool', name: 'generate_recipes' });
  });

  it('interpolates excludeRecipeIds into the user message', async () => {
    mockMessagesCreate.mockResolvedValue(
      toolUseBlock('generate_recipes', { recipes: buildRecipes(5) }),
    );
    await generateRecipes(['egg'], ['r1', 'r2']);

    const call = mockMessagesCreate.mock.calls[0][0];
    const userMsg: string = call.messages[0].content;
    expect(userMsg).toContain('r1');
    expect(userMsg).toContain('r2');
  });

  it('omits the exclude clause when excludeRecipeIds is empty', async () => {
    mockMessagesCreate.mockResolvedValue(
      toolUseBlock('generate_recipes', { recipes: buildRecipes(5) }),
    );
    await generateRecipes(['egg'], []);

    const call = mockMessagesCreate.mock.calls[0][0];
    const userMsg: string = call.messages[0].content;
    expect(userMsg).not.toContain('Do not include');
  });

  it('throws when the model returns no tool_use block', async () => {
    mockMessagesCreate.mockResolvedValue({ content: [{ type: 'text', text: 'nope' }] });
    await expect(generateRecipes(['egg'], [])).rejects.toThrow('tool_use');
  });

  it('wraps a Zod parse failure (wrong recipe count) as a plain Error', async () => {
    mockMessagesCreate.mockResolvedValue(
      toolUseBlock('generate_recipes', { recipes: buildRecipes(3) }),
    );
    await expect(generateRecipes(['egg'], [])).rejects.toThrow('malformed');
  });

  it('throws when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(generateRecipes(['egg'], [])).rejects.toThrow('ANTHROPIC_API_KEY');
  });
});
