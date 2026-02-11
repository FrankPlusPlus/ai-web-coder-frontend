<template>
  <a-card class="chat-page" :bordered="false">
    <div class="top-bar">
      <div class="title">{{ app?.appName ?? `应用#${appId}` }}</div>
      <a-space>
        <a-button @click="goEdit">编辑信息</a-button>
        <template v-if="deployedPreviewUrl">
          <a-dropdown>
            <template #overlay>
              <a-menu @click="handleDeployMenuClick">
                <a-menu-item key="redeploy">重新部署</a-menu-item>
                <a-menu-item key="view">查看部署</a-menu-item>
              </a-menu>
            </template>
            <a-button type="primary" :loading="deploying">部署</a-button>
          </a-dropdown>
        </template>
        <template v-else>
          <a-button type="primary" :loading="deploying" @click="doDeploy">部署</a-button>
        </template>
      </a-space>
    </div>

    <a-row :gutter="16" class="content-row">
      <a-col :xs="24" :lg="12" class="left">
        <a-card size="small" title="对话" class="panel" :bordered="true">
          <div class="messages" ref="messageBoxRef" @click="handleMessageClick">
            <div class="load-more" style="display:flex;justify-content:center;margin-bottom:8px;">
              <a-button v-if="hasMoreHistory" size="small" :loading="loadingHistory" @click="loadMoreHistory">加载更多</a-button>
            </div>
            <div
              v-for="(m, idx) in messages"
              :key="idx"
              class="msg"
              :class="m.role === 'user' ? 'is-user' : 'is-ai'"
            >
              <div class="bubble">
                <!-- 流式阶段：尝试用 Markdown 渲染，以便也能看到代码框。注意可能带来的性能开销 -->
                <template v-if="m.role === 'ai' && idx === streamingMsgIndex && sending">
                   <div class="md" v-html="renderMarkdown(streamingText)" />
                </template>
                <template v-else>
                  <div class="md" v-html="renderMarkdown(m.content)" />
                </template>
              </div>
            </div>
          </div>

          <a-form layout="inline" class="input-row" @submit.prevent>
            <a-input
              v-model:value="input"
              placeholder="请输入你的需求，然后发送给 AI"
              @pressEnter="send"
            />
            <a-button type="primary" :loading="sending" @click="send">发送</a-button>
            <a-button :disabled="!sending" danger @click="abort">停止</a-button>
          </a-form>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="12" class="right">
        <a-card size="small" title="预览" class="panel" :bordered="true">
          <div class="preview-actions">
            <a-space>
              <a-button :disabled="!app?.codeGenType" @click="refreshPreview">刷新预览</a-button>
              <a-button :disabled="!previewUrl" @click="openPreview">新窗口打开</a-button>
              <a-typography-text v-if="previewUrl" type="secondary">{{ previewUrl }}</a-typography-text>
            </a-space>
          </div>
          <div v-if="previewUrl" class="iframe-wrap">
            <iframe :src="iframeSrc" class="iframe" />
          </div>
          <a-empty v-else description="生成完成后会在这里展示网站效果" />
        </a-card>
      </a-col>
    </a-row>
  </a-card>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import { getAppVoById, deployApp } from '@/api/appController'
import { listAppChatHistory } from '@/api/chatHistoryController'
import { useLoginUserStore } from '@/stores/loginUser'
import { openEventSource, type EventSourceClient } from '@/utils/sse'
import { buildDeployPreviewUrl, buildGeneratedPreviewUrl } from '@/utils/appPreview'
import { setPreviewUrl, getPreviewUrl, hasPreviewUrl } from '@/utils/deployPreviewStore'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

type ChatMsg = {
  role: 'user' | 'ai'
  content: string
  createTime?: string
}

const route = useRoute()
const router = useRouter()

const appId = computed(() => String(route.params.id ?? ''))

const app = ref<API.AppVO>()

const messages = ref<ChatMsg[]>([])
const hasMoreHistory = ref(false)
const loadingHistory = ref(false)
// 记录当前已加载最早一条的 createTime，用于作为游标请求更早记录
const earliestCreateTime = ref<string | undefined>()
const input = ref('')

const sending = ref(false)
const deploying = ref(false)

const previewUrl = ref('')
const deployedPreviewUrl = ref('')
const iframeNonce = ref(0)
const iframeSrc = computed(() => {
  if (!previewUrl.value) return ''
  // 强制刷新 iframe
  const sep = previewUrl.value.includes('?') ? '&' : '?'
  return `${previewUrl.value}${sep}t=${iframeNonce.value}`
})

const messageBoxRef = ref<HTMLDivElement>()

const scrollToBottom = async () => {
  await nextTick()
  const el = messageBoxRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

// 流式渲染专用：避免每个 chunk 都触发 markdown 全量 render
const streamingText = ref('')
const streamingMsgIndex = ref<number>(-1)

let sseClient: EventSourceClient | null = null

// 防止自动发送 initPrompt 形成 loadApp -> send -> loadApp -> send 循环
const autoSendInFlight = ref(false)
const lastAutoSentPrompt = ref('')

const closeSse = () => {
  sseClient?.close()
  sseClient = null
}

const markDoneAndFinalize = async (aiMsg?: ChatMsg) => {
  // 将流式文本落回消息内容，之后再走 markdown 渲染
  if (aiMsg) {
    aiMsg.content = streamingText.value
    if (!aiMsg.createTime) aiMsg.createTime = new Date().toISOString()
  }
  sending.value = false
  streamingMsgIndex.value = -1
  closeSse()

  if (app.value?.codeGenType) {
    previewUrl.value = buildGeneratedPreviewUrl({ id: appId.value, codeGenType: app.value.codeGenType })
    refreshPreview()
  }
  // 重新拉一次应用信息（例如 deployKey 等）
  await loadApp({ skipAutoSend: true })
  // 完成后刷新预览为生成页面，保证最新交互结果可见
  refreshPreview()
}

const loadApp = async (opts?: { skipAutoSend?: boolean }) => {
  if (!appId.value) return
  let lastErrorMsg = ''

  // 增加重试机制，防止刚创建时可能有短暂延时或者数据库同步
  // 策略：尝试 6 次，前快后慢，总大概率覆盖 6-8 秒延迟
  const maxRetries = 6
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await getAppVoById({ id: appId.value })
      if (res.data.code === 0 && res.data.data) {
        app.value = res.data.data
        lastErrorMsg = ''
        break
      } else {
        lastErrorMsg = res.data.message ?? 'Unknown Error'
      }
    } catch (e: any) {
      lastErrorMsg = e?.message ?? 'Network Error'
    }

    // 如果获取失败，等待重试
    if (i < maxRetries - 1) {
      // i=0: 300ms, i=1: 600ms, i=2: 1200ms... 逐步增加
      const delay = 300 * Math.pow(2, i)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // 如果依然没有获取到 app
  if (!app.value) {
    message.error('获取应用信息失败：' + (lastErrorMsg || '请求数据不存在（data 为空），请确认应用 id 是否存在、是否有权限访问'))
    return
  }

  // 优先使用持久化的 previewUrl（首次部署返回的完整 URL）
  const stored = getPreviewUrl(appId.value)
  if (stored) {
    deployedPreviewUrl.value = stored
    console.log('loadApp: using stored deployedPreviewUrl', stored)
  } else if (app.value.deployKey) {
    const built = buildDeployPreviewUrl(app.value.deployKey)
    deployedPreviewUrl.value = built
    console.log('loadApp: using buildDeployPreviewUrl from deployKey', app.value.deployKey, '->', built)
  }

  // 不在这里直接切换 iframe（refreshPreview 会负责展示生成预览）

  if (opts?.skipAutoSend) return
  const initPrompt = app.value?.initPrompt?.trim()
  const key = INIT_SENT_KEY(appId.value)
  const sent = sessionStorage.getItem(key) === '1'

  // 只有当：
  // - 有 initPrompt
  // - 之前未在 sessionStorage 标记
  // - 当前应用属于自己
  // - 当前没有任何对话历史（前面已经加载过一次历史）
  // - 没有正在自动发送
  // - 避免同一个 prompt 被重复发送
  const loginStore = useLoginUserStore()
  const isOwnApp = !!(app.value?.user?.id && loginStore.loginUser?.id && app.value.user.id === loginStore.loginUser.id)

  if (
    initPrompt &&
    !sent &&
    messages.value.length === 0 &&
    !autoSendInFlight.value &&
    initPrompt !== lastAutoSentPrompt.value &&
    isOwnApp
  ) {
    autoSendInFlight.value = true
    lastAutoSentPrompt.value = initPrompt
    sessionStorage.setItem(key, '1')
    input.value = initPrompt
    // 注意：send 内部会把 autoSendInFlight 复位
    void send({ isAuto: true })
  }
}

// 拉取第一页（最近一页）对话历史，按创建时间升序放入 messages
const loadHistory = async () => {
  if (!appId.value) return
  loadingHistory.value = true
  try {
    const res = await listAppChatHistory({ appId: appId.value })
    if (res.data.code !== 0 || !res.data.data) {
      message.error('获取对话历史失败：' + (res.data.message ?? ''))
      return
    }
    const records = res.data.data.records ?? []
    // 把后端返回的记录转换为页面需要的格式
    const mapped: ChatMsg[] = (records as API.ChatHistory[])
      .map((r) => ({
        role: (String(r.messageType || '').toLowerCase() === 'ai' || String(r.messageType || '').toLowerCase() === 'assistant') ? 'ai' as const : 'user' as const,
        content: r.message ?? '',
        createTime: r.createTime,
      }))
      // 升序
      .sort((a, b) => (a.createTime || '').localeCompare(b.createTime || ''))

    messages.value = mapped
    earliestCreateTime.value = mapped.length ? mapped[0]?.createTime : undefined
    const total = res.data.data.totalRow ?? 0
    hasMoreHistory.value = total > messages.value.length
  } finally {
    loadingHistory.value = false
    // 如果没有历史记录则允许 loadApp 执行自动发送（initPrompt），否则跳过自动发送
    if (!messages.value.length) {
      await loadApp()
    } else {
      await loadApp({ skipAutoSend: true })
    }
    // 进入页面后自动刷新预览为“生成”URL（保持 iframe 显示最新交互的生成页面）
    refreshPreview()
  }
}

// 加载更早的历史并 prepend 到 messages
const loadMoreHistory = async () => {
  if (!appId.value || !earliestCreateTime.value) return
  const el = messageBoxRef.value
  const prevScrollHeight = el?.scrollHeight ?? 0
  loadingHistory.value = true
  try {
    const res = await listAppChatHistory({ appId: appId.value, lastCreateTime: earliestCreateTime.value })
    if (res.data.code !== 0 || !res.data.data) {
      message.error('获取更多历史失败：' + (res.data.message ?? ''))
      return
    }
    const records = res.data.data.records ?? []
    const mapped: ChatMsg[] = (records as API.ChatHistory[])
      .map((r) => ({
        role: (String(r.messageType || '').toLowerCase() === 'ai' || String(r.messageType || '').toLowerCase() === 'assistant') ? 'ai' as const : 'user' as const,
        content: r.message ?? '',
        createTime: r.createTime,
      }))
      .sort((a, b) => (a.createTime || '').localeCompare(b.createTime || ''))

    if (mapped.length) {
      messages.value = [...mapped, ...messages.value]
      earliestCreateTime.value = messages.value.length ? messages.value[0]?.createTime : undefined
    }
    const total = res.data.data.totalRow ?? 0
    hasMoreHistory.value = total > messages.value.length
    // 维持滚动条位置：新内容加入后，设置 scrollTop 使页面位置不变
    await nextTick()
    if (el) {
      const newScrollHeight = el.scrollHeight
      el.scrollTop = newScrollHeight - prevScrollHeight
    }
  } finally {
    loadingHistory.value = false
  }
}

const goEdit = () => {
  router.push(`/app/${appId.value}/edit`)
}

const INIT_SENT_KEY = (id: string) => `app_init_sent_${id}`

const send = async (options?: { isAuto?: boolean }) => {
  const text = input.value.trim()
  if (!text) {
    message.warning('请输入内容')
    return
  }
  if (!appId.value) return
  messages.value.push({ role: 'user', content: text, createTime: new Date().toISOString() })
  const aiMsg: ChatMsg = { role: 'ai', content: '', createTime: undefined }
  messages.value.push(aiMsg)

  // 进入流式阶段
  streamingText.value = ''
  streamingMsgIndex.value = messages.value.length - 1

  input.value = ''
  await scrollToBottom()

  sending.value = true
  closeSse()

  const url = `http://localhost:8123/api/app/chat/gen/code?appId=${encodeURIComponent(
    appId.value,
  )}&message=${encodeURIComponent(text)}`

  try {
    sseClient = openEventSource(url, {
      onMessage: (msg) => {
        const appended = decodeSseDelta(msg.data)
        if (appended) {
          streamingText.value += appended
          // 这里不修改 aiMsg.content，避免 markdown 渲染成本
          void scrollToBottom()
        }
      },
      onError: (e) => {

        console.error('[SSE] error:', e)
      },
    })

    // 监听后端 event: done（你反馈“最后以 done 结尾”）
    sseClient.es.addEventListener('done', () => {
      void markDoneAndFinalize(aiMsg)
    })
  } catch (e: unknown) {

    console.error('[SSE] failed:', e)
    const err = e as any
    const detail = err?.message ? `：${String(err.message)}` : ''
    message.error(`生成失败${detail}`)
    sending.value = false
    streamingMsgIndex.value = -1
    closeSse()
  } finally {
    if (options?.isAuto) {
      autoSendInFlight.value = false
    }
  }
}

const abort = () => {
  closeSse()
  sending.value = false
  streamingMsgIndex.value = -1
  message.info('已停止生成')
  autoSendInFlight.value = false
}

const doDeploy = async () => {
  if (!appId.value) return
  deploying.value = true
  try {
    const res = await deployApp({ appId: appId.value })
    console.log('deployApp response (full):', res)
    console.log('deployApp response.data:', res.data)
    console.log('deployApp returned deployResult:', res.data?.data)
    if (res.data.code !== 0 || !res.data.data) {
      message.error('部署失败：' + (res.data.message ?? ''))
      return
    }
    const urlOrKey = res.data.data
    // 记录后端返回的部署地址（直接使用）到 deployedPreviewUrl，并持久化
    deployedPreviewUrl.value = urlOrKey
    if (appId.value) {
      setPreviewUrl(appId.value, urlOrKey)
    }
    if (app.value) {
      app.value.deployKey = urlOrKey
    }
    // 重新部署后保持 iframe 显示生成预览（refresh 仍指向生成页面）
    // 如果需要立即查看部署，可点击“查看部署”打开新窗口
    message.success('部署成功')
    void loadApp({ skipAutoSend: true })
  } finally {
    deploying.value = false
  }
}

const refreshPreview = () => {
  // 永远使用按规则构造的生成预览 URL 来展示（优先展示生成页面）
  const gen = app.value?.codeGenType ? buildGeneratedPreviewUrl({ id: appId.value, codeGenType: app.value.codeGenType }) : ''
  if (gen) {
    previewUrl.value = gen
  }
  // 打印调试信息
  console.log('refreshPreview called, using generated preview:', previewUrl.value, 'deployedPreviewUrl:', deployedPreviewUrl.value)
  iframeNonce.value++
}

const openPreview = () => {
  if (!previewUrl.value) return
  window.open(previewUrl.value, '_blank')
}

const openDeployedPreview = () => {
  if (!deployedPreviewUrl.value) return
  window.open(deployedPreviewUrl.value, '_blank')
}

const handleDeployMenuClick = (info: { key: string | number }) => {
  const k = String(info.key)
  if (k === 'redeploy') {
    void doDeploy()
  } else if (k === 'view') {
    openDeployedPreview()
  }
}

const decodeSseDelta = (raw: string): string => {
  if (!raw) return ''

  // 结束标记（兼容 data 方式）
  if (raw === '[DONE]' || raw === 'DONE') {
    // 交给 markDoneAndFinalize 统一收尾
    // 由于这里没有 aiMsg 引用，send 里也会监听 event: done，因此这里仅返回空
    return ''
  }

  try {
    const obj: any = JSON.parse(raw)
    if (typeof obj?.d === 'string') return obj.d
    if (typeof obj?.content === 'string') return obj.content
    if (typeof obj?.data === 'string') return obj.data
    if (typeof obj?.message === 'string') return obj.message
    if (Array.isArray(obj)) {
      return obj
        .map((it) => {
          if (typeof it === 'string') return it
          if (it && typeof it === 'object') {
            if (typeof (it as any).d === 'string') return (it as any).d
            if (typeof (it as any).content === 'string') return (it as any).content
            if (typeof (it as any).data === 'string') return (it as any).data
          }
          return ''
        })
        .join('')
    }
    return ''
  } catch {
    return raw
  }
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const md: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(code: string, lang: string): string {
    const language = lang && hljs.getLanguage(lang) ? lang : ''
    const highlightedCode = language
      ? hljs.highlight(code, { language }).value
      : escapeHtml(code)

    return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-block-lang">${language}</span><span class="code-block-copy-btn">复制代码</span></div><pre class="hljs"><code>${highlightedCode}</code></pre></div>`
  },
})

const renderMarkdown = (text: string) => md.render(text || '')

const handleMessageClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.classList.contains('code-block-copy-btn')) {
    const wrapper = target.closest('.code-block-wrapper')
    const codeEl = wrapper?.querySelector('pre code')
    if (codeEl && codeEl.textContent) {
      navigator.clipboard
        .writeText(codeEl.textContent)
        .then(() => {
          message.success('已复制')
        })
        .catch(() => {
          message.error('复制失败')
        })
    }
  }
}

watch(
  () => route.params.id,
  () => {
    messages.value = []
    previewUrl.value = ''
    sending.value = false
    streamingText.value = ''
    streamingMsgIndex.value = -1
    autoSendInFlight.value = false
    closeSse()
    void loadHistory()
  },
)

onMounted(async () => {
  await loadHistory()
})

onUnmounted(() => {
  closeSse()
})
</script>

<style scoped>
.chat-page {
  /* 由 BasicLayout 的 .content 控制可用高度，这里只需要占满父容器 */
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* ant-design-vue Card body 需要允许子元素 flex 收缩，否则内容会把卡片撑高 */
.chat-page :deep(.ant-card-body) {
  flex: 1;
  height: 0; /* 重要：强制 flex item 高度收缩 */
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 16px;
}

.content-row {
  flex: 1;
  height: 0; /* 重要：继承父级高度限制 */
  min-height: 0;
}

.left,
.right {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel {
  flex: 1;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel :deep(.ant-card-body) {
  flex: 1;
  height: 0; /* 重要：强制限制 body 高度！！！！！！！！！！！！！！！！ */
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
}

.messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  background: linear-gradient(180deg, #f7f9fc 0%, #f3f6fb 100%);
  border: 1px solid #eef1f6;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
  scroll-behavior: smooth;
}

.msg {
  display: flex;
  margin-bottom: 12px;
}

.msg.is-user {
  justify-content: flex-end;
}

.msg.is-ai {
  justify-content: flex-start;
}

.bubble {
  max-width: 82%;
  min-width: 0; /* 修复 Flex 布局下被宽内容撑开的问题 */
  padding: 14px 18px;
  border-radius: 12px;
  line-height: 1.6;
  font-size: 14px;
  background: #ffffff;
  border: 1px solid #e6ebf2;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
  overflow: hidden; /* 防止内部宽元素撑开 bubble */
}

.msg.is-user .bubble {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  color: #fff;
  border: none;
  box-shadow: 0 8px 20px rgba(24, 144, 255, 0.28);
}

.msg.is-user .md :deep(a) {
  color: #e6f4ff;
}

.msg.is-ai .bubble {
  background: linear-gradient(180deg, #fefefe 0%, #fafbfc 100%);
  color: #1f2a44;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
}

.iframe-wrap {
  flex: 1;
  min-height: 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #eef1f6;
  background: #fafafa;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}

.iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.preview-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #eef1f6;
  border-radius: 10px;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-shrink: 0; /* 防止头部被压缩 */
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2a44;
}

/* 文字内容与气泡边缘留出间距，避免贴边 */
.md {
  padding: 2px 0;
  box-sizing: border-box;
}

/* 段落、列表等排版（通用） */
.md :deep(p) {
  margin: 0.5em 0 0.75em;
  line-height: 1.7;
  color: inherit;
}
.md :deep(p:first-child) {
  margin-top: 0;
}
.md :deep(p:last-child) {
  margin-bottom: 0;
}
.md :deep(ul),
.md :deep(ol) {
  margin: 0.5em 0 0.75em;
  padding-left: 1.6em;
  line-height: 1.7;
}
.md :deep(li) {
  margin: 0.25em 0;
}
.md :deep(li > p) {
  margin: 0.25em 0;
}
.md :deep(h1),
.md :deep(h2),
.md :deep(h3),
.md :deep(h4),
.md :deep(h5),
.md :deep(h6) {
  margin: 1em 0 0.5em;
  font-weight: 600;
  line-height: 1.4;
  color: inherit;
}
.md :deep(h1:first-child),
.md :deep(h2:first-child),
.md :deep(h3:first-child),
.md :deep(h4:first-child),
.md :deep(h5:first-child),
.md :deep(h6:first-child) {
  margin-top: 0;
}
.md :deep(blockquote) {
  margin: 0.75em 0;
  padding: 0.4em 0 0.4em 1em;
  border-left: 4px solid #e6ebf2;
  color: #64748b;
}
.md :deep(hr) {
  margin: 1em 0;
  border: none;
  border-top: 1px solid #e6ebf2;
}
.md :deep(> *:first-child) {
  margin-top: 0 !important;
}
.md :deep(> *:last-child) {
  margin-bottom: 0 !important;
}

/* ========== AI 气泡内「纯文字」阅读优化（不影响代码块） ========== */
.msg.is-ai .bubble .md :deep(p) {
  font-size: 15px;
  line-height: 1.78;
  color: #334155;
  letter-spacing: 0.01em;
  max-width: 42em; /* 舒适阅读行宽 */
}
.msg.is-ai .bubble .md :deep(ul),
.msg.is-ai .bubble .md :deep(ol) {
  max-width: 42em;
  font-size: 15px;
  line-height: 1.78;
  color: #334155;
  letter-spacing: 0.01em;
}
.msg.is-ai .bubble .md :deep(li) {
  margin: 0.35em 0;
}
.msg.is-ai .bubble .md :deep(blockquote) {
  max-width: 42em;
  font-size: 14px;
  line-height: 1.72;
  color: #475569;
  border-left-color: #cbd5e1;
  background: rgba(248, 250, 252, 0.6);
  padding: 0.5em 0 0.5em 1em;
  border-radius: 0 6px 6px 0;
}
.msg.is-ai .bubble .md :deep(h1),
.msg.is-ai .bubble .md :deep(h2),
.msg.is-ai .bubble .md :deep(h3),
.msg.is-ai .bubble .md :deep(h4),
.msg.is-ai .bubble .md :deep(h5),
.msg.is-ai .bubble .md :deep(h6) {
  color: #1e293b;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.msg.is-ai .bubble .md :deep(strong) {
  font-weight: 600;
  color: #1e293b;
}
.msg.is-ai .bubble .md :deep(em) {
  font-style: italic;
  color: #475569;
}
.msg.is-ai .bubble .md :deep(a) {
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.2s;
}
.msg.is-ai .bubble .md :deep(a:hover) {
  color: #1d4ed8;
}
/* 行内代码（仅文字中的 `code`，不影响代码块） */
.msg.is-ai .bubble .md :deep(p code),
.msg.is-ai .bubble .md :deep(li code) {
  display: inline;
  padding: 0.18em 0.45em;
  font-size: 0.9em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: #f1f5f9;
  color: #1e293b;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  border: 1px solid #e2e8f0;
}

.md :deep(pre) {
  margin: 0 !important;
  padding: 0 !important;
  background: transparent;
  border-radius: 0;
  overflow-x: auto; /* 仅 pre 区域横向滚动 */
  width: 100%;
  display: block;
}

/* 仅代码块内的 code（不影响行内 code） */
.md :deep(pre code) {
  display: block;
  padding: 12px 16px 16px 16px; /* 底部 padding 增加到 16px，给滚动条留足空间 */
  box-sizing: border-box; /* 确保 padding 包含在宽度内 */
  white-space: pre; /* 保持原始换行与空白，长行由 pre 产生横向滚动 */
  overflow-wrap: normal;
  word-break: normal;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

/* 滚动条样式优化 */
.md :deep(pre)::-webkit-scrollbar {
  height: 8px; /* 稍微调高一点，便于点击 */
  background-color: transparent;
}

.md :deep(pre)::-webkit-scrollbar-track {
  background-color: transparent;
}

.md :deep(pre)::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

/* 代码块外层容器 - 改为浅色主题适配 github.css */
.md :deep(.code-block-wrapper) {
  background: #fafafa;
  border-radius: 8px;
  margin: 12px 0;
  overflow: hidden;
  color: #24292e; /* Github 默认文字颜色 */
  border: 1px solid #e1e4e8;
  width: 100%; /* 强制占满可用宽度 */
  max-width: 100%; /* 防止溢出 */
  display: block; /* 改回 block 布局，避免 flex 导致的宽度计算问题 */
}

/* 顶部栏：语言 + 复制按钮 */
.md :deep(.code-block-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: #f0f0f0;
  font-size: 12px;
  color: #586069;
  border-bottom: 1px solid #e1e4e8;
  width: 100%;
  box-sizing: border-box;
}

.md :deep(.code-block-lang) {
  font-weight: 600;
  white-space: nowrap;
}

.md :deep(.code-block-copy-btn) {
  cursor: pointer;
  color: #586069;
  transition: color 0.2s;
  user-select: none;
  white-space: nowrap;
}

.md :deep(.code-block-copy-btn):hover {
  color: #0366d6;
}

/* 覆盖 highlight.js 默认背景，统一用 wrapper 背景 */
.md :deep(.hljs) {
  background: transparent !important;
  color: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  padding: 0; /* 移除可能的内边距 */
}

.streaming-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.input-row {
  display: flex;
  gap: 8px;
  padding-top: 4px;
  flex-shrink: 0; /* 防止输入框被压缩 */
}

.input-row :deep(.ant-input) {
  border-radius: 10px;
}
</style>
