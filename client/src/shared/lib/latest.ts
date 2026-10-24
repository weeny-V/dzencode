/**
 * Tells the newest of several operations that overlap in time (a deletion confirmed, its window closed, another
 * window opened and confirmed): only the newest may touch the screen when it finishes. `cancel` drops the one
 * that is running without starting another.
 */
export const createLatest = () => {
  let current = 0;

  return {
    /** Starts an operation and returns its number. */
    begin: (): number => ++current,
    /** Whether the operation is still the newest one. */
    isCurrent: (operation: number): boolean => operation === current,
    /** Makes every running operation stale. */
    cancel: (): void => {
      current += 1;
    },
  };
};
