import { BACKEND_API_URL } from '@/request'

/**
 * 构建应用的预览 URL。
 *
 * 约定（来自需求描述）：
 * - 在生成完成后，预览域名形如： http://localhost:8123/api/static/{codeGenType}_{appId}/
 * - 部署成功后，后端可能返回可访问的 URL 或 deployKey
 */
export function buildGeneratedPreviewUrl(app: { id?: string | number; codeGenType?: string }) {
  const appId = app.id
  const codeGenType = app.codeGenType
  if (appId == null || appId === '' || !codeGenType) {
    return ''
  }
  return `${BACKEND_API_URL}/static/${encodeURIComponent(codeGenType)}_${String(appId)}/index.html`
}

export function buildDeployPreviewUrl(deployResult?: string) {
  if (!deployResult) {
    return ''
  }
  // 直接使用后端返回的字符串作为部署地址（不做补全或回退）
  return deployResult
}
