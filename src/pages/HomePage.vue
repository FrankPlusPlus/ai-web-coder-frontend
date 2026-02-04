<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { ThunderboltOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { addApp, deleteApp, getAppVoById, listFeaturedAppVoByPage, listMyAppVoByPage } from '@/api/appController'
import { useLoginUserStore } from '@/stores/loginUser'
import AppCard from '@/components/app/AppCard.vue'

const router = useRouter()
const loginUserStore = useLoginUserStore()

const isLogin = computed(() => !!loginUserStore.loginUser.id)

// 创建应用表单
const creating = ref(false)
const createForm = reactive<{ initPrompt: string; codeGenType: string; appName: string }>({
  initPrompt: '',
  codeGenType: 'html',
  appName: '',
})

const doCreate = async () => {
  if (!createForm.initPrompt.trim()) {
    message.warning('请输入提示词')
    return
  }
  creating.value = true
  try {
    const res = await addApp({
      initPrompt: createForm.initPrompt,
      codeGenType: createForm.codeGenType,
      appName: createForm.appName || undefined,
    })
    if (res.data.code !== 0 || !res.data.data) {
      message.error('创建失败：' + (res.data.message ?? ''))
      return
    }
    const id = res.data.data

    message.success('创建成功')
    router.push(`/app/${String(id)}/chat`)
  } finally {
    creating.value = false
  }
}

// 列表分页
const mySearch = reactive<API.AppQueryRequest>({ pageNum: 1, pageSize: 20, appName: '' })
const featuredSearch = reactive<API.AppQueryRequest>({ pageNum: 1, pageSize: 20, appName: '' })

const myData = ref<API.AppVO[]>([])
const myTotal = ref(0)
const myLoading = ref(false)

const featuredData = ref<API.AppVO[]>([])
const featuredTotal = ref(0)
const featuredLoading = ref(false)

const fetchMy = async () => {
  if (!isLogin.value) return
  myLoading.value = true
  try {
    const res = await listMyAppVoByPage({ ...mySearch })
    if (res.data.code !== 0 || !res.data.data) {
      message.error('获取我的应用失败：' + (res.data.message ?? ''))
      return
    }
    myData.value = res.data.data.records ?? []
    myTotal.value = res.data.data.totalRow ?? 0
  } finally {
    myLoading.value = false
  }
}

const fetchFeatured = async () => {
  featuredLoading.value = true
  try {
    const res = await listFeaturedAppVoByPage({ ...featuredSearch })
    if (res.data.code !== 0 || !res.data.data) {
      message.error('获取精选应用失败：' + (res.data.message ?? ''))
      return
    }
    featuredData.value = res.data.data.records ?? []
    featuredTotal.value = res.data.data.totalRow ?? 0
  } finally {
    featuredLoading.value = false
  }
}

const goChat = (id?: string) => {
  if (!id) return
  router.push(`/app/${id}/chat`)
}

const goEdit = (id?: string) => {
  if (!id) return
  router.push(`/app/${id}/edit`)
}

const doDelete = async (id?: number | string) => {
  if (!id) return
  const res = await deleteApp({ id: String(id) })
  if (res.data.code === 0) {
    message.success('删除成功')
    void fetchMy()
    void fetchFeatured()
  } else {
    message.error('删除失败：' + (res.data.message ?? ''))
  }
}

onMounted(() => {
  void fetchFeatured()
  if (isLogin.value) {
    void fetchMy()
  }
})
</script>

<template>
  <div class="home">
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">AI Web Coder</h1>
        <p class="hero-subtitle">一句话生成你的专属应用，让 AI 帮你写代码</p>

        <a-card :bordered="false" class="create-card">
          <div class="create-form-wrapper">
            <!-- 顶部选项栏：模式与名称 -->
            <div class="form-options-header">
              <div class="option-group">
                <span class="option-label">模式</span>
                <a-select v-model:value="createForm.codeGenType" class="mode-select" :bordered="false" dropdownClassName="mode-select-dropdown">
                  <a-select-option value="html">单页HTML</a-select-option>
                  <a-select-option value="multi_file">多文件</a-select-option>
                </a-select>
              </div>

              <div class="vertical-divider"></div>

              <div class="option-group" style="flex: 1;">
                 <span class="option-label">名称</span>
                 <a-input
                   v-model:value="createForm.appName"
                   placeholder="给应用起个名字（可选）"
                   class="app-name-input"
                   :bordered="false"
                 />
              </div>
            </div>

            <a-divider style="margin: 0;" />

            <!-- 底部输入栏：提示词与按钮 -->
            <div class="form-prompt-area">
              <a-textarea
                v-model:value="createForm.initPrompt"
                class="prompt-textarea"
                placeholder="描述你要生成的网站，例如：生成一个个人主页..."
                :auto-size="{ minRows: 2, maxRows: 6 }"
                :bordered="false"
                @pressEnter="doCreate"
              />
              <div class="prompt-actions">
                <a-button type="primary" size="large" :loading="creating" @click="doCreate" class="generate-btn">
                  <template #icon><ThunderboltOutlined /></template>
                  立即生成
                </a-button>
              </div>
            </div>
          </div>
        </a-card>
      </div>
    </div>

    <div class="content-wrapper">
    <a-tabs class="custom-tabs">
      <a-tab-pane key="my" tab="我的应用">
        <div class="tab-header">
           <a-alert
            v-if="!isLogin"
            type="info"
            show-icon
            message="登录后可查看和管理自己的应用"
            banner
            class="login-alert"
          />
          <div v-if="isLogin" class="search-bar">
             <a-input-search
                v-model:value="mySearch.appName"
                placeholder="搜索我的应用"
                enter-button
                @search="() => { mySearch.pageNum = 1; fetchMy() }"
              />
          </div>
        </div>

        <a-list
          v-if="isLogin"
          :data-source="myData"
          :loading="myLoading"
          :pagination="{
            current: mySearch.pageNum,
            pageSize: mySearch.pageSize,
            total: myTotal,
            onChange: (p: number) => { mySearch.pageNum = p; fetchMy() },
          }"
          :grid="{ gutter: 24, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }"
        >
          <template #renderItem="{ item }">
            <a-list-item>
              <AppCard
                :app="item"
                show-delete
                @click="goChat(item.id)"
                @openChat="goChat(item.id)"
                @edit="goEdit(item.id)"
                @delete="doDelete(item.id)"
              />
            </a-list-item>
          </template>
        </a-list>
      </a-tab-pane>

      <a-tab-pane key="featured" tab="精选应用">
         <div class="tab-header">
            <div class="search-bar">
              <a-input-search
                v-model:value="featuredSearch.appName"
                placeholder="搜索精选应用"
                enter-button
                @search="() => { featuredSearch.pageNum = 1; fetchFeatured() }"
              />
            </div>
         </div>

        <a-list
          :data-source="featuredData"
          :loading="featuredLoading"
          :pagination="{
            current: featuredSearch.pageNum,
            pageSize: featuredSearch.pageSize,
            total: featuredTotal,
            onChange: (p: number) => { featuredSearch.pageNum = p; fetchFeatured() },
          }"
          :grid="{ gutter: 24, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }"
        >
          <template #renderItem="{ item }">
            <a-list-item>
              <AppCard
                :app="item"
                @click="goChat(item.id)"
                @openChat="goChat(item.id)"
                @edit="goEdit(item.id)"
              />
            </a-list-item>
          </template>
        </a-list>
      </a-tab-pane>
    </a-tabs>
    </div>
  </div>
</template>

<style scoped>
.home {
  width: 100%;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.hero-section {
  background: linear-gradient(135deg, #e6f7ff 0%, #ffffff 100%);
  padding: 80px 24px 60px;
  text-align: center;
  margin-bottom: 0;
  border-bottom: 1px solid #e8e8e8;
}

.hero-content {
  max-width: 900px;
  margin: 0 auto;
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  color: #1f1f1f;
  margin-bottom: 16px;
  letter-spacing: -0.5px;
}

.hero-subtitle {
  font-size: 20px;
  color: #595959;
  margin-bottom: 48px;
  font-weight: 300;
}

.create-card {
  background: transparent;
  max-width: 800px;
  margin: 0 auto;
}

.create-form-wrapper {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
  overflow: hidden; /* Ensure rounded corners */
  transition: all 0.3s;
}

.create-form-wrapper:hover {
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
}

.form-options-header {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  background-color: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.option-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-label {
  color: #8c8c8c;
  font-size: 14px;
  font-weight: 500;
}

.mode-select {
  width: 120px;
}

.mode-select :deep(.ant-select-selector) {
   font-weight: 600;
   color: #262626;
}

.vertical-divider {
  width: 1px;
  height: 20px;
  background-color: #e8e8e8;
  margin: 0 24px;
}

.app-name-input {
  font-size: 14px;
  color: #262626;
  padding: 4px 0;
  width: 100%;
}

.app-name-input:focus {
  box-shadow: none;
}

.form-prompt-area {
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: #fff;
}

.prompt-textarea {
  font-size: 16px;
  resize: none;
  padding: 0;
}

.prompt-textarea:focus {
  box-shadow: none;
}

.prompt-actions {
  display: flex;
  justify-content: flex-end;
}

.generate-btn {
  border-radius: 8px;
  height: 48px;
  padding: 0 32px;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

/* Response Design */
@media (max-width: 768px) {
  .hero-section {
    padding: 40px 16px;
  }

  .hero-title {
    font-size: 32px;
  }

  .form-options-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
  }

  .vertical-divider {
      display: none;
  }

  .option-group {
      width: 100%;
  }

  .generate-btn {
      width: 100%;
  }
}

.content-wrapper {
  max-width: 1248px;
  margin: 0 auto;
  padding: 40px 24px;
}

.tab-header {
  display: flex;
  justify-content: flex-end; /* 让搜索框靠右 */
  align-items: center;
  margin-bottom: 24px;
}

.search-bar {
  width: 100%;
  max-width: 320px;
}

/* 调整 Tabs 样式 */
.custom-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 24px;
}

.custom-tabs :deep(.ant-tabs-tab) {
  font-size: 16px;
  padding: 12px 0;
  margin-right: 32px;
}

.custom-tabs :deep(.ant-tabs-tab-active) .ant-tabs-tab-btn {
  font-weight: 600;
}

.custom-tabs :deep(.ant-list-item) {
    width: 100% !important;
    height: 100% !important;
}

.custom-tabs :deep(.ant-list-grid .ant-col > .ant-list-item) {
  margin-bottom: 24px !important;
  max-width: 100% !important;
}

.custom-tabs :deep(.ant-list-grid .ant-col) {
  display: flex !important;
  flex-direction: column !important;
  min-width: 0; /* Important for flex items to shrink */
}

.login-alert {
  flex: 1;
  margin-right: 24px;
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .hero-section {
    padding: 40px 16px;
  }

  .hero-title {
    font-size: 32px;
  }

  .custom-input-group :deep(.ant-select) {
      display: none; /* 移动端隐藏选择，使用默认 html */
  }

  .create-form-wrapper {
      padding: 4px;
  }

  .custom-input-group :deep(.ant-input) {
      width: 100% !important;
      padding-left: 12px;
  }

  .custom-input-group :deep(.ant-btn) {
      width: 80px !important;
  }

  .app-name-input {
      width: 100% !important; /* 移动端全宽 */
  }
}
</style>
