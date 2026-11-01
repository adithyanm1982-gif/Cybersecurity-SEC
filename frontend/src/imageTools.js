// Shrinks a photo in the browser BEFORE it is uploaded.
// Phone photos are often 4000+ px and 5-12 MB: uploading and then showing those on a phone is slow.
// This resizes to a sensible size and re-saves as JPEG, so every upload becomes a few hundred KB.
// GIFs are left untouched (resizing would remove the animation). If anything fails, the original file is used.
export async function shrinkImage(file, maxSide = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  if (typeof createImageBitmap !== 'function') return file
  try {
    let bmp
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }) } // keeps phone photos upright
    catch { bmp = await createImageBitmap(file) }
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * scale)
    const h = Math.round(bmp.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const g = canvas.getContext('2d')
    g.fillStyle = '#ffffff' // JPEG has no transparency
    g.fillRect(0, 0, w, h)
    g.drawImage(bmp, 0, 0, w, h)
    bmp.close && bmp.close()
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file // only use the result when it really is smaller
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const MAX_MB = 5

// Checks the file types, shrinks every photo, then checks the final size. Throws an Error with a readable message.
export async function prepareImages(files, maxSide = 1600) {
  const bad = files.find((f) => !OK_TYPES.includes(f.type))
  if (bad) throw new Error(`"${bad.name}": only JPG, PNG, WEBP or GIF images are allowed.`)
  const out = await Promise.all(files.map((f) => shrinkImage(f, maxSide)))
  const big = out.find((f) => f.size > MAX_MB * 1024 * 1024)
  if (big) throw new Error(`"${big.name}" is larger than ${MAX_MB} MB.`)
  return out
}