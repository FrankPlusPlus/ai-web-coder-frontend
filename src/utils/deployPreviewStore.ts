// 基于 localStorage 的简单持久化：保存每个 appId 对应的首个 previewUrl
const PREFIX = 'app_preview_url_v1_'

export function setPreviewUrl(appId: string, url: string) {
  if (!appId || !url) return
  try {
    localStorage.setItem(PREFIX + appId, url)
  } catch {}
}

export function getPreviewUrl(appId: string): string | null {
  if (!appId) return null
  try {
    return localStorage.getItem(PREFIX + appId)
  } catch {
    return null
  }
}

export function clearPreviewUrl(appId: string) {
  if (!appId) return
  try {
    localStorage.removeItem(PREFIX + appId)
  } catch {}
}

export function hasPreviewUrl(appId: string): boolean {
  return Boolean(getPreviewUrl(appId))
}
