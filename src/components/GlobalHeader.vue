<template>
  <header class="global-header" :class="{ 'is-scrolled': isScrolled }">
    <div class="header-inner">
      <div class="header-left">
        <img
          alt="Logo"
          class="logo"
          src="@/assets/logo.png"
          width="32"
          height="32"
        />
      </div>

      <nav class="header-center">
        <div class="nav-list">
          <button
            v-for="item in menuItems"
            :key="item?.key"
            class="nav-item"
            :class="{ 'is-active': selectedKeys.includes(String(item?.key)) }"
            @click="handleMenuClick({ key: item?.key })"
          >
            {{ item?.label }}
          </button>
        </div>
      </nav>

      <div class="header-right">
        <div v-if="loginUserStore.loginUser.id" class="user-dropdown">
          <a-dropdown trigger="hover">
            <template #overlay>
              <a-menu @click="handleUserMenuClick">
                <a-menu-item key="logout">注销</a-menu-item>
              </a-menu>
            </template>
            <a-space class="user-entry">
              {{ loginUserStore.loginUser.userName ?? 'momo' }}
              <a-avatar :src="loginUserStore.loginUser.userAvatar" />
            </a-space>
          </a-dropdown>
        </div>
        <div v-else>
          <a-button
            type="primary"
            shape="round"
            class="login-btn"
            @click="router.push('/user/login')"
          >
            登录
          </a-button>
        </div>
      </div>
    </div>
  </header>
</template>



<!--核心关注这里的代码逻辑-->
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLoginUserStore } from '@/stores/loginUser.ts'
import { userLogout } from '@/api/userController'
// Simple nav item type for custom header rendering
interface NavItem {
  key: string
  label: string
  title?: string
}

const isScrolled = ref(false)

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// 引入这个全局的登录用户存储实例
// 为什么App.vue已经创建了这个实例，这里还要引入？
// 因为Pinia的store是全局单例的，引入后可以访问到同一个实例
// 那下面为什么还要创建一次？
// 因为在Vue组件中使用store时，需要通过useXXXStore函数获取实例。
// 但是为什么加const？const只是为了在当前组件中使用这个实例，并不会重新创建一个新的store实例。
const loginUserStore = useLoginUserStore()

const router = useRouter()
const route = useRoute()

// 当前选中的菜单项
const selectedKeys = ref([route.path])

// 监听路由变化，更新选中的菜单项（否则只会初始化一次）
watch(
  () => route.path,
  (newPath) => {
    selectedKeys.value = [newPath]
  },
  { immediate: true }
)

// 菜单配置项
const originItems: NavItem[] = [
  {
    key: '/',
    label: '主页',
    title: '主页',
  },
  {
    key: '/admin/userManage',
    label: '用户管理',
    title: '用户管理',
  },
  {
    key: '/admin/appManage',
    label: '应用管理',
    title: '应用管理',
  },
]

// 过滤菜单项
const filterMenus = (menus: NavItem[] = []) => {
  return menus.filter((menu) => {
    const menuKey = menu.key
    if (menuKey.startsWith('/admin')) {
      const loginUser = loginUserStore.loginUser
      if (!loginUser || loginUser.userRole !== 'admin') {
        return false
      }
    }
    return true
  })
}

// 展示在菜单的路由数组
const menuItems = computed<NavItem[]>(() => filterMenus(originItems))

// 菜单点击处理
const handleMenuClick = (info: { key: string | number }) => {
  router.push(String(info.key))
}

// 新增：用户区菜单点击处理（来自下拉菜单）
const handleUserMenuClick = (info: { key: string | number }) => {
  if (String(info.key) === 'logout') {
    void handleLogout()
  }
}

// 注销处理：调用后端注销接口，清空本地登录信息，并跳转到登录页
async function handleLogout() {
  try {
    const res = await userLogout()
    // 如果后端约定 code === 0 为成功
    if (res && res.data && res.data.code === 0) {
      // 清空本地登录用户信息
      loginUserStore.setLoginUser({ userName: '未登录' })
      // 跳转到登录页
      router.push('/user/login')
    } else {
      // 不阻塞用户操作，失败也跳转（可改为提示）
      loginUserStore.setLoginUser({ userName: '未登录' })
      router.push('/user/login')
    }
  } catch {
    // 出错也清理并跳转
    loginUserStore.setLoginUser({ userName: '未登录' })
    router.push('/user/login')
  }
}



</script>

<!-- 样式 -->

<style scoped>
/* 顶部入场动画 */
@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.global-header {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  /* 默认状态：更透明，无阴影，更轻盈 */
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideDown 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* 滚动时：背景变实，模糊加深，阴影浮现 */
.global-header.is-scrolled {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.header-inner {
  width: 100%;
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 滚动时：收缩高度，显得更精致 */
.is-scrolled .header-inner {
  height: 56px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.logo {
  height: 36px;
  width: 36px;
  /* 增加Logo的通透感，不hover时不那么突兀 */
  opacity: 0.9;
  transition: all 0.3s ease;
}

.logo:hover {
  transform: rotate(10deg);
  opacity: 1;
}

.site-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.5px;
  white-space: nowrap;
}

.header-center {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  justify-content: center;
}

/* 移除 nav-list 的所有容器样式，完全透明 */
.nav-list {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 0;
  background: transparent;
}

.nav-item {
  border: none;
  background: transparent;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  color: #555; /* 字体颜色稍微柔和一点 */
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  white-space: nowrap;
  position: relative;
}

/* 统一 hover 效果：轻微的灰色背景 */
.nav-item:hover {
  color: #1890ff;
  background: rgba(0, 0, 0, 0.04);
}

/* Active 状态：加粗，无背景，仅保留文字颜色区分，更简洁 */
.nav-item.is-active {
  background: transparent;
  color: #1890ff;
  font-weight: 600;
}

/* 移除下划线指示器，让只有文字颜色变化，视觉更加一体化 */
.nav-item.is-active::after {
  display: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 0 0 auto;
}

.user-entry {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #555;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s ease-in-out;
}

/* 保持 User Entry 和 Nav Item 的 hover 效果完全一致 */
.user-entry:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #1890ff; /* hover 时也变色，和导航栏保持一致 */
}

.login-btn {
  background: #1a1a1a;
  border: none;
  color: #ffffff;
  font-weight: 600;
  padding: 0 24px;
  height: 38px;
  border-radius: 19px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  background: #000;
}

.login-btn:active {
  transform: translateY(1px);
}

@media (max-width: 768px) {
  .header-inner {
    padding: 0 16px;
  }

  .site-title {
    display: none;
  }

  .nav-list {
    gap: 4px;
  }

  .nav-item {
    font-size: 14px;
    padding: 6px 10px;
  }
}

.header-right > div {
  display: flex;
  align-items: center;
}
</style>
