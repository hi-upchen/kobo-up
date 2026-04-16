import { concurrentMap } from '../concurrentMap'

describe('concurrentMap', () => {
  it('should process all items and return results in order', async () => {
    const items = [1, 2, 3, 4, 5]
    const results = await concurrentMap(items, 3, async (n) => n * 2)
    expect(results).toEqual([2, 4, 6, 8, 10])
  })

  it('should limit concurrency to the specified value', async () => {
    let active = 0
    let maxActive = 0
    const items = [1, 2, 3, 4, 5, 6]

    await concurrentMap(items, 2, async (n) => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 50))
      active--
      return n
    })

    expect(maxActive).toBe(2)
  })

  it('should handle empty array', async () => {
    const results = await concurrentMap([], 3, async (n: number) => n)
    expect(results).toEqual([])
  })

  it('should propagate errors', async () => {
    const items = [1, 2, 3]
    await expect(
      concurrentMap(items, 2, async (n) => {
        if (n === 2) throw new Error('fail')
        return n
      })
    ).rejects.toThrow('fail')
  })
})
