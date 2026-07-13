// Pure media validation, shared by the client (pre-upload) and server (re-check).
// Photos only for v1; the ACCEPTED_VIDEO list is present so video can be enabled
// later without changing call sites.

export const MAX_PHOTO_MB = 50
export const MAX_VIDEO_MB = 200

export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

export const ACCEPTED_PHOTO_EXT = ['jpg', 'jpeg', 'png', 'heic', 'webp']
export const ACCEPTED_VIDEO_EXT = ['mp4', 'mov', 'webm']

export interface MediaCandidate {
  name: string
  type: string
  size: number
}

export interface MediaValidationResult {
  ok: boolean
  error?: string
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i === -1 ? '' : name.slice(i + 1).toLowerCase()
}

/**
 * Validate a single media file. For v1 only photos are accepted; videos are
 * recognised but rejected with a clear message so the check is future-proof.
 */
export function validateMedia(
  file: MediaCandidate,
  opts: { allowVideo?: boolean } = {},
): MediaValidationResult {
  const ext = extOf(file.name)
  const isPhoto = ACCEPTED_PHOTO_TYPES.includes(file.type) || ACCEPTED_PHOTO_EXT.includes(ext)
  const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type) || ACCEPTED_VIDEO_EXT.includes(ext)

  if (isPhoto) {
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      return { ok: false, error: `"${file.name}" is larger than ${MAX_PHOTO_MB} MB.` }
    }
    return { ok: true }
  }

  if (isVideo) {
    if (!opts.allowVideo) {
      return { ok: false, error: 'Video upload isn’t supported yet — please add a photo instead.' }
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      return { ok: false, error: `"${file.name}" is larger than ${MAX_VIDEO_MB} MB.` }
    }
    return { ok: true }
  }

  return { ok: false, error: `"${file.name}" is not a supported file type.` }
}
