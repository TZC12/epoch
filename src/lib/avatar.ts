/**
 * 头像图片本地处理：选中的文件在浏览器里裁成正方形并压成小尺寸 data URL。
 * 必须压缩后再进 localStorage——原图（随手一张 4MB 照片）base64 后直接顶爆 5MB 配额，
 * 会让整个 App 的数据保存失败。
 */

export const AVATAR_SIZE = 192      /* 存边长 192px，够 2x DPR 显示 */
const MAX_INPUT_BYTES = 12 * 1024 * 1024

export type AvatarError = 'not-image' | 'too-large' | 'decode-failed'

export type AvatarResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: AvatarError }

export async function fileToAvatar(file: File): Promise<AvatarResult> {
  if (!file.type.startsWith('image/')) return { ok: false, error: 'not-image' }
  if (file.size > MAX_INPUT_BYTES) return { ok: false, error: 'too-large' }
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    if (!side) return { ok: false, error: 'decode-failed' }
    const sx = (img.naturalWidth - side) / 2
    const sy = (img.naturalHeight - side) / 2
    const cv = document.createElement('canvas')
    cv.width = AVATAR_SIZE
    cv.height = AVATAR_SIZE
    const ctx = cv.getContext('2d')
    if (!ctx) return { ok: false, error: 'decode-failed' }
    ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
    /* 透明 PNG 落到白底，避免深色主题下头像里出现黑块 */
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE)
    return { ok: true, dataUrl: cv.toDataURL('image/jpeg', 0.82) }
  } catch {
    return { ok: false, error: 'decode-failed' }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode'))
    img.src = src
  })
}
