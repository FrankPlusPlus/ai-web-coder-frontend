<template>
  <a-card :bordered="false">
    <a-page-header title="对话管理" />

    <a-form layout="inline" :model="searchParams" style="margin-bottom: 16px">
      <a-form-item label="应用ID">
        <a-input-number v-model:value="searchParams.appId" :min="1" />
      </a-form-item>
      <a-form-item label="用户ID">
        <a-input-number v-model:value="searchParams.userId" :min="1" />
      </a-form-item>
      <a-form-item label="消息类型">
        <a-input v-model:value="searchParams.messageType" placeholder="user / ai" allow-clear />
      </a-form-item>
      <a-form-item>
        <a-space>
          <a-button type="primary" @click="doSearch">搜索</a-button>
          <a-button @click="reset">重置</a-button>
        </a-space>
      </a-form-item>
    </a-form>

    <a-table
      :columns="columns"
      :data-source="data"
      row-key="id"
      :pagination="pagination"
      :loading="loading"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'message'">
          <div style="max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ record.message }}</div>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-popconfirm title="确定删除吗？" @confirm="doDelete(record.id)">
              <a-button size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>
  </a-card>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { listAllChatHistoryByPageForAdmin } from '@/api/chatHistoryController'

const searchParams = reactive<API.ChatHistoryQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  appId: undefined,
  userId: undefined,
  messageType: '',
})

const data = ref<API.ChatHistory[]>([])
const total = ref(0)
const loading = ref(false)

const pagination = computed(() => ({
  current: searchParams.pageNum,
  pageSize: searchParams.pageSize,
  total: total.value,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (t: number) => `共 ${t} 条`,
}))

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '应用ID', dataIndex: 'appId', key: 'appId' },
  { title: '用户ID', dataIndex: 'userId', key: 'userId' },
  { title: '消息', dataIndex: 'message', key: 'message' },
  { title: '类型', dataIndex: 'messageType', key: 'messageType' },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime' },
  { title: '操作', key: 'action', width: 160 },
]

const fetchData = async () => {
  loading.value = true
  try {
    const res = await listAllChatHistoryByPageForAdmin({ ...searchParams })
    if (res.data.code !== 0 || !res.data.data) {
      message.error('获取列表失败：' + (res.data.message ?? ''))
      return
    }
    data.value = res.data.data.records ?? []
    total.value = res.data.data.totalRow ?? 0
  } finally {
    loading.value = false
  }
}

const handleTableChange = (p: { current?: number; pageSize?: number }) => {
  searchParams.pageNum = p.current
  searchParams.pageSize = p.pageSize
  void fetchData()
}

const doSearch = () => {
  searchParams.pageNum = 1
  void fetchData()
}

const reset = () => {
  searchParams.pageNum = 1
  searchParams.pageSize = 10
  searchParams.appId = undefined
  searchParams.userId = undefined
  searchParams.messageType = ''
  void fetchData()
}

const doDelete = async (id?: number) => {
  // 后端未提供删除接口的生成代码，这里直接提醒并刷新
  message.info('请使用后端管理或 API 调用删除记录（未生成删除接口）')
}

onMounted(() => {
  void fetchData()
})
</script>
