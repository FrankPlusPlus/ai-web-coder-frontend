// 编写独立的权限校验文件，集中管理全局路由权限校验逻辑，避免在每个路由组件中重复编写权限校验代码。
// 使用 Vue Router 的全局导航守卫，在路由跳转前进行权限校验。
// 这个文件会被自动引入到项目中，无需手动导入。文件使用的方式如下所示：
// ```ts
// import '@/access'
// ```
// 通过这种方式引入后，文件中的代码会在应用启动时执行，从而实现全局的权限校验功能。


import { useLoginUserStore } from '@/stores/loginUser'
import { message } from 'ant-design-vue'
import router from '@/router'

// 是否为首次获取登录用户
let firstFetchLoginUser = true

/**
 * 全局权限校验
 */
// 解读一下下面的代码逻辑：
// router.beforeEach 是 Vue Router 提供的一个全局导航守卫函数，
// 它会在每次路由跳转前被调用，允许你在路由切换之前执行一些逻辑，比如权限校验。
// 这个函数接受三个参数：to（目标路由对象）、from（当前路由对象）和 next（一个函数，用于控制路由的继续或中断）。
// 在函数内部，首先获取登录用户信息的 Pinia store 实例 loginUserStore。
// 然后，从 store 中获取当前的登录用户信息 loginUser。
// 接下来，检查是否是首次获取登录用户信息，如果是，则调用 fetchLoginUser 方法从后端获取用户信息，
// 并将 firstFetchLoginUser 标记为 false，确保只在首次加载时获取用户信息。
// 然后，获取目标路由的完整路径 toUrl。
// 如果目标路由以 /admin 开头，表示这是一个需要管理员权限的页面，
// 则检查当前登录用户是否存在且其角色是否为 admin。
// 如果不满足条件，使用 message.error 显示“没有权限”的错误消息，
// 并调用 next 函数重定向到登录页面，同时传递当前目标路由作为重定向参数。
// 如果权限校验通过，则调用 next() 继续路由跳转。
router.beforeEach(async (to, from, next) => {
  const loginUserStore = useLoginUserStore()
  let loginUser = loginUserStore.loginUser
  // 确保页面刷新，首次加载时，能够等后端返回用户信息后再校验权限
  if (firstFetchLoginUser) {
    await loginUserStore.fetchLoginUser()
    loginUser = loginUserStore.loginUser
    firstFetchLoginUser = false
  }
  const toUrl = to.fullPath
  if (toUrl.startsWith('/admin')) {
    if (!loginUser || loginUser.userRole !== 'admin') {
      message.error('没有权限')
      next(`/user/login?redirect=${to.fullPath}`)
      return
    }
  }
  next()
})
