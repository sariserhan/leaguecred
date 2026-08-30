export type JobStep = readonly [name: string, run: () => Promise<unknown>];

export type JobStepsResult = {
  ok: boolean;
  results: Record<string, unknown>;
};

/**
 * Runs steps in order and keeps going when one throws, so a provider being down
 * in an early step never stops a later one. The failure is recorded in place of
 * that step's result and reported through `ok`.
 *
 * Order still matters: steps run sequentially because later ones read what
 * earlier ones wrote.
 */
export async function runJobSteps(steps: readonly JobStep[]): Promise<JobStepsResult> {
  const results: Record<string, unknown> = {};
  let ok = true;

  for (const [name, run] of steps) {
    try {
      results[name] = await run();
    } catch (error) {
      ok = false;
      results[name] = { error: (error as Error).message };
      console.error(`Job step "${name}" failed.`, error);
    }
  }

  return { ok, results };
}
