import axe from 'axe-core';

/**
 * Runs every axe rule on a rendered element and lists the violations as "rule: selector" lines, so a
 * failing spec says what to fix. Colour contrast needs real layout, which jsdom lacks; the theme's
 * colour pairs are checked in `src/app/theme-contrast.spec.ts` instead.
 */
export async function axeViolations(root: Element): Promise<string[]> {
  const results = await axe.run(root, {
    rules: { 'color-contrast': { enabled: false }, 'color-contrast-enhanced': { enabled: false } },
  });
  return results.violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`),
  );
}
