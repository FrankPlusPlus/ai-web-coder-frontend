export type SseMessage = {
  event?: string
  data: string
}

export type EventSourceHandlers = {
  /** 默认 message 事件 */
  onMessage?: (msg: SseMessage) => void
  /** 自定义 event 事件，例如 event: done */
  onEvent?: (msg: SseMessage) => void
  /** 连接打开 */
  onOpen?: () => void
  /** 连接/解析错误 */
  onError?: (err: unknown) => void
}

export type EventSourceClient = {
  close: () => void
  /** 原始对象（必要时调试用） */
  es: EventSource
}

/**
 * 标准 SSE 客户端（基于 EventSource）。
 *
 * 特点：
 * - 浏览器自动处理 UTF-8 分片解码，避免 fetch+TextDecoder 方案的乱码边界问题
 * - 每收到一条 message 就立即触发回调，天然流式渲染
 *
 * 注意：EventSource 只能发 GET，且无法自定义 header。
 * 如果后端鉴权依赖 cookie，确保同源 / 允许携带 cookie（同源默认会带上）。
 */
export function openEventSource(url: string, handlers: EventSourceHandlers = {}): EventSourceClient {
  const { onMessage, onEvent, onOpen, onError } = handlers

  // withCredentials：只有在跨域且需要 cookie 时才有意义；同源默认已经会带 cookie。
  const es = new EventSource(url, { withCredentials: true })

  const safeCall = (fn: any, ...args: any[]) => {
    try {
      fn?.(...args)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[SSE] handler error:', e)
    }
  }

  es.onopen = () => {
    safeCall(onOpen)
  }

  es.onmessage = (ev) => {
    const msg: SseMessage = { data: ev.data }
    safeCall(onMessage, msg)
  }

  // 如果后端用了 event: xxx，可以在页面侧用 addEventListener 订阅。
  // 这里提供一个通用的转发：开发者可在调用方按需 addEventListener。
  if (onEvent) {
    // 常见结束事件：done
    es.addEventListener('done', (ev: MessageEvent) => {
      safeCall(onEvent, { event: 'done', data: ev.data })
    })
    // 如果你后端是 event: error / event: complete，可按需继续添加
  }

  es.onerror = (ev) => {
    // EventSource 的 onerror 不会提供明确异常对象；这里把事件透出给调用方。
    safeCall(onError, ev)
  }

  return {
    es,
    close: () => {
      es.close()
    },
  }
}
