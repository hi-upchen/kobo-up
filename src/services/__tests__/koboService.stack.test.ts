import { KoboService } from '../koboService'

describe('KoboService Stack Overflow Prevention', () => {
  describe('arrayBufferToBase64', () => {
    test('should handle large arrays without stack overflow', () => {
      // Create a large Uint8Array (simulate a large database file)
      const largeSize = 100000 // 100KB test
      const largeArray = new Uint8Array(largeSize)
      
      // Fill with some test data
      for (let i = 0; i < largeSize; i++) {
        largeArray[i] = i % 256
      }
      
      // This should not throw "Maximum call stack size exceeded"
      expect(() => {
        // Access the private method via typed interface for testing
        const result = (KoboService as { arrayBufferToBase64: (arr: Uint8Array) => string }).arrayBufferToBase64(largeArray)
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
      }).not.toThrow()
    })

    test('should produce valid base64 output', () => {
      // Test with a small known array
      const testArray = new Uint8Array([72, 101, 108, 108, 111]) // "Hello" in ASCII
      
      const result = (KoboService as { arrayBufferToBase64: (arr: Uint8Array) => string }).arrayBufferToBase64(testArray)
      expect(result).toBe('SGVsbG8=') // Base64 for "Hello"
    })

    test('should handle empty array', () => {
      const emptyArray = new Uint8Array(0)
      const result = (KoboService as { arrayBufferToBase64: (arr: Uint8Array) => string }).arrayBufferToBase64(emptyArray)
      expect(result).toBe('')
    })

    test('should handle chunk boundaries correctly', () => {
      // Test with array size that's exactly at chunk boundary
      const chunkSize = 8192
      const testArray = new Uint8Array(chunkSize * 2) // Exactly 2 chunks
      
      // Fill with predictable data
      testArray.fill(65) // ASCII 'A'
      
      expect(() => {
        const result = (KoboService as { arrayBufferToBase64: (arr: Uint8Array) => string }).arrayBufferToBase64(testArray)
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
      }).not.toThrow()
    })
  })
})