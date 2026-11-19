import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Contrast guard for the design tokens.
 *
 * Visual QA found the light theme's status foregrounds sitting between 3.0:1
 * and 3.8:1 against the card surface (WCAG AA for body text is 4.5:1) — and
 * worse on the 10-15% tints those colours sit on. Since there is no browser in
 * this environment, the numbers are asserted directly against the token file
 * instead of being eyeballed.
 *
 * This test reads src/index.css as text. It does not render anything.
 */

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`token block not found: ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

type Hsl = [number, number, number];

function token(source: string, name: string): Hsl {
  const match = source.match(new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`));
  if (!match) throw new Error(`token not found: --${name}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function hslToRgb([h, s, l]: Hsl): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  const table: Array<[number, number, number]> = [
    [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
  ];
  return table[Math.floor(h / 60) % 6].map((v) => v + m) as [number, number, number];
}

function luminance(rgb: [number, number, number]): number {
  const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = rgb.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Hsl, b: Hsl): number {
  const la = luminance(hslToRgb(a));
  const lb = luminance(hslToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Blend `fg` at `alpha` over `bg` — mirrors Tailwind's `bg-x/10` compositing. */
function tint(fg: Hsl, bg: Hsl, alpha: number): Hsl {
  const f = hslToRgb(fg);
  const b = hslToRgb(bg);
  const mixed = f.map((v, i) => v * alpha + b[i] * (1 - alpha));
  // Back to an HSL-ish tuple: only luminance matters for the ratio, so keep the
  // channels and let contrast() take the RGB path via a direct conversion.
  return mixed as unknown as Hsl;
}

function contrastRgb(a: [number, number, number], b: [number, number, number]): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const light = block(':root');
const dark = block('.dark');

const AA_TEXT = 4.5;

describe('design token contrast', () => {
  it('meets AA for body text on every surface, in both themes', () => {
    for (const [name, source] of [['light', light], ['dark', dark]] as const) {
      for (const surface of ['background', 'card', 'surface-1', 'surface-2'] as const) {
        const ratio = contrast(token(source, 'foreground'), token(source, surface));
        expect(ratio, `${name}: foreground on ${surface} was ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEXT);

        const muted = contrast(token(source, 'muted-foreground'), token(source, surface));
        expect(muted, `${name}: muted-foreground on ${surface} was ${muted.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  });

  it('keeps status text legible on its own tinted background', () => {
    // The realistic worst case: `text-success` on `bg-success/10` over a card.
    for (const [name, source] of [['light', light], ['dark', dark]] as const) {
      for (const status of ['success', 'warning', 'info', 'destructive'] as const) {
        const fg = token(source, status);
        const card = token(source, 'card');
        const fgRgb = hslToRgb(fg);
        const cardRgb = hslToRgb(card);
        for (const alpha of [0.05, 0.1, 0.15, 0.2]) {
          const bgRgb = fgRgb.map((v, i) => v * alpha + cardRgb[i] * (1 - alpha)) as [number, number, number];
          const ratio = contrastRgb(fgRgb, bgRgb);
          expect(
            ratio,
            `${name}: ${status} on a ${alpha * 100}% tint was ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(AA_TEXT);
        }
      }
    }
  });

  it('keeps the primary action colour readable on the page ground', () => {
    for (const [name, source] of [['light', light], ['dark', dark]] as const) {
      const ratio = contrast(token(source, 'primary'), token(source, 'background'));
      expect(ratio, `${name}: primary on background was ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('never ships the old sub-AA light status values', () => {
    // Regression guard: these exact values were the defect.
    expect(light).not.toContain('--success: 154 62% 38%');
    expect(light).not.toContain('--warning: 32 88% 46%');
    expect(light).not.toContain('--info: 199 84% 42%');
  });
});
