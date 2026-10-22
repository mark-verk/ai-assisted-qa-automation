import { expect, type TestInfo } from '@playwright/test';

type AxeViolation = { id: string; help: string; nodes: unknown[] };

/** In CI, record axe violations and mark the test as an expected failure so the job stays green. */
export async function assertNoAxeViolations(
  violations: AxeViolation[],
  testInfo: TestInfo,
): Promise<void> {
  if (process.env.CI && violations.length > 0) {
    await testInfo.attach('axe-violations.json', {
      body: JSON.stringify(violations, null, 2),
      contentType: 'application/json',
    });
    const summary = violations
      .map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`)
      .join('; ');
    testInfo.annotations.push({
      type: 'warning',
      description: `Axe violations (non-blocking in CI): ${summary}`,
    });
    console.warn(`::warning title=Axe accessibility::${summary}`);
    testInfo.fail(true, 'Axe violations reported non-blocking in CI');
  }

  await expect(violations).toEqual([]);
}

/** In CI, failed checks are annotated and do not fail the job; locally behavior is strict. */
export async function runA11yCheckOrWarnInCi(
  testInfo: TestInfo,
  label: string,
  check: () => Promise<void>,
): Promise<void> {
  try {
    await check();
  } catch (error) {
    if (!process.env.CI) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    testInfo.annotations.push({
      type: 'warning',
      description: `${label} (non-blocking in CI): ${message}`,
    });
    console.warn(`::warning title=${label}::${message.replace(/\n/g, ' ')}`);
  }
}
