<template>
  <a-card :bordered="false">
    <a-page-header :title="title" @back="router.back()" />

    <a-alert
      v-if="!canEdit"
      type="warning"
      show-icon
      message="你没有权限编辑该应用"
      style="margin-bottom: 16px"
    />

    <a-form
      v-if="formLoaded"
      :model="form"
      :label-col="{ span: 4 }"
      :wrapper-col="{ span: 12 }"
      @finish="onSubmit"
    >
      <a-form-item label="应用名称" name="appName" :rules="[{ required: true, message: '请输入应用名称' }]">
        <a-input v-model:value="form.appName" :disabled="!canEdit" />
      </a-form-item>

      <a-form-item v-if="isAdmin" label="封面 URL" name="cover">
        <a-input v-model:value="form.cover" :disabled="!canEdit" placeholder="https://..." />
      </a-form-item>

      <a-form-item v-if="isAdmin" label="优先级" name="priority">
        <a-input-number v-model:value="form.priority" :disabled="!canEdit" :min="0" :max="99" />
        <span style="margin-left: 8px; color: rgba(0,0,0,.45)">精选可设置为 99</span>
      </a-form-item>

      <a-form-item :wrapper-col="{ offset: 4, span: 12 }">
        <a-space>
          <a-button type="primary" html-type="submit" :loading="submitting" :disabled="!canEdit">
            保存
          </a-button>
          <a-button @click="goChat">返回对话</a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </a-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import { useLoginUserStore } from '@/stores/loginUser'
import { editApp, getAppById, getAppVoById, updateApp } from '@/api/appController'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const appId = computed(() => String(route.params.id ?? ''))
const isAdmin = computed(() => loginUserStore.loginUser.userRole === 'admin')

const title = computed(() => (isAdmin.value ? '编辑应用（管理员）' : '编辑我的应用'))

const form = reactive<{ appName: string; cover?: string; priority?: number }>({
  appName: '',
  cover: '',
  priority: 0,
})

const formLoaded = ref(false)
const submitting = ref(false)

const appOwnerId = ref<string | undefined>()

const canEdit = computed(() => {
  if (!loginUserStore.loginUser.id) return false
  if (isAdmin.value) return true
  return !!appOwnerId.value && appOwnerId.value === String(loginUserStore.loginUser.id)
})

const load = async () => {
  if (!appId.value) return

  if (isAdmin.value) {
    const res = await getAppById({ id: appId.value })
    if (res.data.code !== 0 || !res.data.data) {
      message.error('获取应用失败：' + (res.data.message ?? ''))
      return
    }
    const a = res.data.data
    appOwnerId.value = a.userId != null ? String(a.userId) : undefined
    form.appName = a.appName ?? ''
    form.cover = a.cover ?? ''
    form.priority = a.priority ?? 0
  } else {
    const res = await getAppVoById({ id: appId.value })
    if (res.data.code !== 0 || !res.data.data) {
      message.error('获取应用失败：' + (res.data.message ?? ''))
      return
    }
    const a = res.data.data
    appOwnerId.value = a.userId != null ? String(a.userId) : undefined
    form.appName = a.appName ?? ''
  }

  formLoaded.value = true
}

const onSubmit = async () => {
  if (!appId.value) return
  submitting.value = true
  try {
    if (!canEdit.value) {
      message.warning('无权限')
      return
    }

    if (isAdmin.value) {
      const res = await updateApp({
        id: appId.value,
        appName: form.appName,
        cover: form.cover,
        priority: form.priority,
      })
      if (res.data.code === 0) {
        message.success('保存成功')
      } else {
        message.error('保存失败：' + (res.data.message ?? ''))
      }
    } else {
      const res = await editApp({ id: appId.value, appName: form.appName })
      if (res.data.code === 0) {
        message.success('保存成功')
      } else {
        message.error('保存失败：' + (res.data.message ?? ''))
      }
    }
  } finally {
    submitting.value = false
  }
}

const goChat = () => {
  router.push(`/app/${appId.value}/chat`)
}

onMounted(() => {
  void load()
})
</script>
