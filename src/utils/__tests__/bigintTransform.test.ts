// 该项目当前未接入 vitest/jest，这个文件仅用于开发时手动验证 request.ts 的 transformResponse 行为。
// 如需运行：可在浏览器控制台或 node 环境中自行复制逻辑验证。

import request from '../../request'

const run = () => {
  const raw = JSON.stringify({ code: 0, data: { id: 376231839437877248 } })
  const transform = (request as any)?.defaults?.transformResponse as any[]
  const out = transform?.[0]?.(raw)
  // eslint-disable-next-line no-console
  console.log('[bigintTransform] out=', out)
}

run()
