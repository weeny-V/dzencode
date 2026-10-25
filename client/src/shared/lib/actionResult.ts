export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Includes transport failures when a browser cannot reach the Next server. */
export async function actionResult<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
  }
}
