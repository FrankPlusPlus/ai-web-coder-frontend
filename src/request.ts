import axios from 'axios'
import { message } from 'ant-design-vue'

// 开发环境后端地址
export const BACKEND_HOST_LOCAL = 'http://localhost:8123'
export const BACKEND_API_URL = `${BACKEND_HOST_LOCAL}/api`

/**
 * 将响应 JSON 中超出 JS 安全整数的整数 number 修正为 string。
 * 说明：如果后端把 Long 以 JSON number 返回，浏览器解析会直接丢精度；前端必须用“按文本解析”来避免。
 */
const fixLargeIntegerInJson = (input: any) => {
  if (typeof input !== 'string') return input

  // 仅处理 JSON 文本（避免把非 JSON 的内容误处理）
  const text = input.trim()
  if (!text || (text[0] !== '{' && text[0] !== '[')) {
    return input
  }

  // 把 key 为 id / *Id / appId / userId / data 的纯数字 value 用引号包起来。
  // 注意：这是一个“工程兜底”，假设这些 id 字段本身就是整型。
  const patched = text.replace(
    /"(id|appId|userId|[A-Za-z0-9_]*Id|data)"\s*:\s*(\d{16,})/g,
    '"$1":"$2"',
  )

  try {
    return JSON.parse(patched)
  } catch {
    // 如果解析失败，返回原始内容交给 axios 默认处理
    return input
  }
}

/**
 * 创建一个 axios 实例，并配置全局的请求和响应拦截器
 */
// 创建 Axios 实例
const myAxios = axios.create({
  baseURL: BACKEND_API_URL,
  timeout: 60000,
  withCredentials: true,
  transformResponse: [
    // 先做我们自己的大整数修复，再交给 axios 默认的 transform（若返回的是对象则默认 transform 不会再次 JSON.parse）
    (data) => fixLargeIntegerInJson(data),
    ...(axios.defaults.transformResponse as any),
  ],
})

// 全局请求拦截器
myAxios.interceptors.request.use(
  function (config) {
    // 避免 Long 型 id（超出 JS 安全整数）在前端任何环节被当作 number 处理导致精度丢失。
    // 在请求发出前，强制把 params 里的值（尤其是 id/appId/userId）全部转为 string。
    const stringifyParams = (val: any): any => {
      if (val === null || val === undefined) return val
      if (typeof val === 'bigint') return val.toString()
      if (typeof val === 'number') {
        // number 可能已丢精度，但至少避免继续参与序列化时变形
        return String(val)
      }
      if (typeof val === 'string') return val
      if (Array.isArray(val)) return val.map(stringifyParams)
      if (typeof val === 'object') {
        const out: Record<string, any> = {}
        for (const [k, v] of Object.entries(val)) {
          // 约定：所有 *Id / id / appId 一律 string
          if (/(^id$|Id$|^appId$)/.test(k) && v !== undefined && v !== null) {
            out[k] = String(v)
          } else {
            out[k] = stringifyParams(v)
          }
        }
        return out
      }
      return val
    }

    if (config.params) {
      config.params = stringifyParams(config.params)
    }

    // 开发环境下打印最终 URL（便于确认究竟是哪里把 id 改掉了）
    if (import.meta.env.DEV) {
      try {
        const baseURL = config.baseURL ?? ''
        const url = config.url ?? ''
        // 这里不做 100% 精确的 axios 序列化复刻，只用于快速观察 params 值是否已变形
        const paramsStr = config.params ? `?${new URLSearchParams(config.params as any).toString()}` : ''
        // eslint-disable-next-line no-console
        console.log('[request]', config.method?.toUpperCase(), `${baseURL}${url}${paramsStr}`)
      } catch {
        // ignore
      }
    }

    return config
  },
  function (error) {
    // Do something with request error
    return Promise.reject(error)
  },
)

// 全局响应拦截器
myAxios.interceptors.response.use(
  function (response) {
    const { data } = response
    // 未登录
    if (data.code === 40100) {
      // 不是获取用户信息的请求，并且用户目前不是已经在用户登录页面，则跳转到登录页面
      if (
        !response.request.responseURL.includes('user/get/login') &&
        !window.location.pathname.includes('/user/login')
      ) {
        message.warning('请先登录')
        window.location.href = `/user/login?redirect=${window.location.href}`
      }
    }
    return response
  },
  function (error) {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    return Promise.reject(error)
  },
)

export default myAxios
