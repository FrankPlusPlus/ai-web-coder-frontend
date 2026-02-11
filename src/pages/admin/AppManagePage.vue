<template>
  <a-card :bordered="false">
    <a-page-header title="应用管理" />

    <a-form layout="inline" :model="searchParams" style="margin-bottom: 16px">
      <a-form-item label="名称">
        <a-input v-model:value="searchParams.appName" placeholder="按名称搜索" allow-clear />
      </a-form-item>
      <a-form-item label="用户ID">
        <a-input-number v-model:value="searchParams.userId" :min="1" />
      </a-form-item>
      <a-form-item label="类型">
        <a-input v-model:value="searchParams.codeGenType" placeholder="html / ..." allow-clear />
      </a-form-item>
      <a-form-item label="优先级">
        <a-input-number v-model:value="searchParams.priority" :min="0" :max="99" />
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
        <template v-if="column.key === 'cover'">
          <a-image :src="record.cover" width="56" height="56" />
        </template>
        <template v-else-if="column.key === 'user'">
          <span>{{ record.userId }}</span>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button size="small" @click="goEdit(record.id)">编辑</a-button>
            <a-popconfirm title="确定删除吗？" @confirm="doDelete(record.id)">
              <a-button size="small" danger>删除</a-button>
            </a-popconfirm>
            <a-button size="small" type="dashed" @click="setFeatured(record)">
              精选(99)
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </a-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { deleteApp, listAppByPage, updateApp } from '@/api/appController'

const router = useRouter()

const searchParams = reactive<API.AppQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  appName: '',
  userId: undefined,
  codeGenType: '',
  priority: undefined,
})

const data = ref<API.App[]>([])
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
  { title: '名称', dataIndex: 'appName', key: 'appName' },
  { title: '封面', dataIndex: 'cover', key: 'cover', width: 90 },
  { title: '类型', dataIndex: 'codeGenType', key: 'codeGenType', width: 120 },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 90 },
  { title: '用户ID', dataIndex: 'userId', key: 'user', width: 90 },
  { title: '部署Key', dataIndex: 'deployKey', key: 'deployKey', width: 160 },
  { title: '操作', key: 'action', width: 240 },
]

const fetchData = async () => {
  loading.value = true
  try {
    const res = await listAppByPage({ ...searchParams })
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
  searchParams.appName = ''
  searchParams.userId = undefined
  searchParams.codeGenType = ''
  searchParams.priority = undefined
  void fetchData()
}

const doDelete = async (id: string | number | undefined) => {
  const appId = id != null ? String(id) : ''
  if (!appId) {
    message.warning('删除失败：应用 id 无效')
    return
  }

   
  console.log('deleteApp request:', { id: appId })

  const res = await deleteApp({ id: appId })

   
  console.log('deleteApp response:', res.data)

  if (res.data.code === 0) {
    message.success('删除成功')
    void fetchData()
  } else {
    const msg = res.data.message ?? ''
    if (msg.includes('不存在')) {
      message.error('删除失败：请求数据不存在（可能已被删除 / id 不存在 / 无权限）')
    } else {
      message.error('删除失败：' + msg)
    }
  }
}

const setFeatured = async (record: API.App) => {
  if (record.id == null) return
  const res = await updateApp({ id: String(record.id), priority: 99 })
  if (res.data.code === 0) {
    message.success('已设置为精选')
    void fetchData()
  } else {
    message.error('设置失败：' + (res.data.message ?? ''))
  }
}

const goEdit = (id: string | number | undefined) => {
  if (id == null) return
  router.push(`/app/${String(id)}/edit`)
}

onMounted(() => {
  void fetchData()
})
</script>
