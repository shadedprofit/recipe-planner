const mockMessagesCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  })),
}));

import { extractIngredients } from '../src/services/claude';

const toolUseResponse = (input: unknown) => ({
  content: [{ type: 'tool_use', id: 'tu_1', name: 'extract_ingredients', input }],
  stop_reason: 'tool_use',
});

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
      toolUseResponse({ ingredients: [{ name: 'tomato', confidence: 0.9 }] }),
    );

    const result = await extractIngredients(['base64img']);
    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0].name).toBe('tomato');
    expect(result.ingredients[0].confidence).toBe(0.9);
  });

  it('passes one image block per image to the API', async () => {
    mockMessagesCreate.mockResolvedValue(toolUseResponse({ ingredients: [] }));
    await extractIngredients(['a', 'b', 'c']);

    const call = mockMessagesCreate.mock.calls[0][0];
    const imageBlocks = call.messages[0].content.filter(
      (b: { type: string }) => b.type === 'image',
    );
    expect(imageBlocks).toHaveLength(3);
  });

  it('appends a text block after the image blocks', async () => {
    mockMessagesCreate.mockResolvedValue(toolUseResponse({ ingredients: [] }));
    await extractIngredients(['a']);

    const call = mockMessagesCreate.mock.calls[0][0];
    const lastBlock = call.messages[0].content.at(-1);
    expect(lastBlock.type).toBe('text');
  });

  it('forces tool_choice to extract_ingredients', async () => {
    mockMessagesCreate.mockResolvedValue(toolUseResponse({ ingredients: [] }));
    await extractIngredients(['a']);

    const call = mockMessagesCreate.mock.calls[0][0];
    expect(call.tool_choice).toEqual({ type: 'tool', name: 'extract_ingredients' });
  });

  it('throws when the model returns no tool_use block', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'I cannot help' }],
    });

    await expect(extractIngredients(['a'])).rejects.toThrow('tool_use');
  });

  it('throws when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(extractIngredients(['a'])).rejects.toThrow('ANTHROPIC_API_KEY');
  });

  it('throws when the tool_use input fails Zod validation', async () => {
    mockMessagesCreate.mockResolvedValue(
      toolUseResponse({ ingredients: [{ name: '', confidence: 999 }] }),
    );

    await expect(extractIngredients(['a'])).rejects.toThrow();
  });
});
