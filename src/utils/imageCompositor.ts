/**
 * Composite an SVG overlay on top of a JPG background using HTML Canvas.
 * Returns the combined image as a JPEG Blob.
 * Browser-only (requires Canvas API).
 */
export async function compositeMarkupImage(
  jpgData: ArrayBuffer,
  svgData: ArrayBuffer,
  quality: number = 0.85
): Promise<Blob> {
  const jpgBlob = new Blob([jpgData], { type: 'image/jpeg' })
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml' })

  const jpgUrl = URL.createObjectURL(jpgBlob)
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const [jpgImg, svgImg] = await Promise.all([
      loadImage(jpgUrl),
      loadImage(svgUrl),
    ])

    const canvas = document.createElement('canvas')
    canvas.width = jpgImg.naturalWidth
    canvas.height = jpgImg.naturalHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    ctx.drawImage(jpgImg, 0, 0)
    ctx.drawImage(svgImg, 0, 0, canvas.width, canvas.height)

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to composite image'))
        },
        'image/jpeg',
        quality
      )
    })
  } finally {
    URL.revokeObjectURL(jpgUrl)
    URL.revokeObjectURL(svgUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}
