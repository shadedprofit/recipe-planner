import { tokens } from '../src/theme/tokens';

describe('tokens', () => {
  it('has required color keys', () => {
    expect(tokens.colors.background).toBeDefined();
    expect(tokens.colors.primary).toBeDefined();
    expect(tokens.colors.text).toBeDefined();
    expect(tokens.colors.error).toBeDefined();
  });

  it('has positive spacing values', () => {
    (Object.values(tokens.spacing) as number[]).forEach((v) => expect(v).toBeGreaterThan(0));
  });

  it('has positive fontSize values', () => {
    (Object.values(tokens.fontSize) as number[]).forEach((v) => expect(v).toBeGreaterThan(0));
  });

  it('has positive radius values', () => {
    (Object.values(tokens.radius) as number[]).forEach((v) => expect(v).toBeGreaterThan(0));
  });

  it('spacing increases from xs to xxl', () => {
    const { xs, sm, md, lg, xl, xxl } = tokens.spacing;
    expect(xs).toBeLessThan(sm);
    expect(sm).toBeLessThan(md);
    expect(md).toBeLessThan(lg);
    expect(lg).toBeLessThan(xl);
    expect(xl).toBeLessThan(xxl);
  });
});
