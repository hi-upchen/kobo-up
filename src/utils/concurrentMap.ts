/**
 * Utility for mapping over an array with bounded concurrency (sliding window).
 * As each task completes, the next item starts immediately — no idle slots.
 */

/**
 * Execute an async function over an array with bounded concurrency (sliding window).
 * Starts up to `concurrency` tasks at once; as each completes, the next item starts immediately.
 * Returns results in the same order as the input array.
 * @param items - Array of items to process
 * @param concurrency - Maximum number of concurrent in-flight promises
 * @param fn - Async function to apply to each item
 */
export async function concurrentMap<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++
      results[i] = await fn(items[i], i)
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  )
  await Promise.all(workers)
  return results
}
