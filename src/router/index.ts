/**
 * 这个文件是路由配置文件index.ts是默认名字，这个文件名是固定的，不能改，用于配置路由和页面组件，定义了路由的映射关系，以及路由的组件。
 */


// 第一步：导入路由和页面组件
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import UserLoginPage from '../pages/user/UserLoginPage.vue'
import UserRegisterPage from '../pages/user/UserRegisterPage.vue'
import UserManagePage from '../pages/admin/UserManagePage.vue'

// 第二步：创建路由实例，直接根据路由配置生成路由实例
// 这里的component的名字要和页面组件的名字一致，这样在路由跳转的时候，才能正确显示页面组件。
// 这里完成routes增加的组件可以获得的效果是：直接通过路径刷新跳转到指定component的页面

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: '主页',
      component: HomePage,
    },
    {
      path: '/user/login',
      name: '用户登录',
      component: UserLoginPage,
    },
    {
      path: '/user/register',
      name: '用户注册',
      component: UserRegisterPage,
    },
    {
      path: '/admin/userManage',
      name: '用户管理',
      component: UserManagePage,
    },
    {
      path: '/app/:id/chat',
      name: '应用对话生成',
      component: () => import('../pages/app/AppChatPage.vue'),
    },
    {
      path: '/app/:id/edit',
      name: '应用信息编辑',
      component: () => import('../pages/app/AppEditPage.vue'),
    },
    {
      path: '/admin/appManage',
      name: '应用管理',
      component: () => import('../pages/admin/AppManagePage.vue'),
    },
    {
      path: '/admin/chatHistory',
      name: '对话管理',
      component: () => import('../pages/admin/ChatHistoryManagePage.vue'),
    },
  ],
})

export default router
