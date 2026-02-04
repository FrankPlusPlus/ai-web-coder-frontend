import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getLoginUser } from '@/api/userController.ts'

/**
 * 这个文件定义了一个 Pinia store，名为 'loginUser'，用于管理登录用户的信息。
 * 它包含一个响应式的 `loginUser` 对象，默认值为未登录状态。
 * 提供了两个方法：`fetchLoginUser` 用于从后端获取登录用户信息，
 * `setLoginUser` 用于更新登录用户信息。
 * 定义了怎么更新这个   *******全局变量****  ，怎么获取这个全局变量的方法。相当于定义了数据，同时还提供了它的增删改查的方法
 * 为什么需要一个这样的登录信息的store呢？因为登录信息是整个应用都需要用到的全局状态
 * 举个例子，用户登录后，应用的多个组件可能需要显示用户的姓名、头像等信息。
 * 使用 Pinia store 来管理登录用户信息，可以确保所有组件都能访问到最新的用户信息，
 * 并且在用户信息发生变化时，所有相关组件都会自动更新。
 */
// 导出一个常量 useLoginUserStore，使用 defineStore 定义一个 Pinia store，这里id为 'loginUser'作用是唯一标识这个store
  //全局唯一性：这个 id 是整个项目唯一的，不能和其他defineStore的 id 重复！比如你不能再写defineStore('loginUser',()=>{})，Pinia 内部是通过这个 id 来区分不同的仓库的，重复会导致状态混乱、数据污染；
  // Pinia 调试必备：在 Vue 开发者工具（F12 里的 Vue 面板）中，你能看到 Pinia 的所有仓库，显示的名称就是这个 id，比如loginUser，你能直观看到这个仓库里的loginUser数据、调用的方法，方便调试；
  // 状态持久化关联：如果后续你要给这个仓库做「数据持久化」（比如刷新页面用户信息不丢失），所有持久化插件都是通过这个 id 来绑定仓库的，没有这个 id 就做不了持久化。
  //// 你的写法（箭头函数，推荐，更简洁）
  // defineStore('loginUser', () => { ... })
  //
  // // 等价的普通函数写法（完全一样的效果，只是代码更长）
  // defineStore('loginUser', function() { ... })
export const useLoginUserStore = defineStore('loginUser', () => {
  // 定义一个  响应式变量   loginUser，类型为 API.LoginUserVO（获取自后端的），初始值为一个未登录的用户对象
  //Java 的 final 关键字，同时遵守【两个铁律】，这两个铁律并行生效、互不冲突、缺一不可：✅ 铁律 1：对变量本身 → 「引用 / 赋值 只能一次」 —— 变量的「指向」一辈子不能变，这是final的核心约束，永远不会破。✅ 铁律 2：对变量的内容 → 「不锁内部、完全可变」 —— 如果变量存的是「对象 / 数组」，对象里的属性、数组里的元素，想怎么改就怎么改，final 完全不管。
    // 补充你最关心的关联点：TS/JS 的 const 完全遵守上面这两个铁律，和 Java 的final一模一样！你代码里的 const loginUser = ref(...) 就是这个规则，所以我们才说 TS const ≈ Java final
  const loginUser = ref<API.LoginUserVO>({
    userName: '未登录',
  })




  // 获取登录用户信息
  // 在函数内部，使用 await 关键字等待 getLoginUser() 函数的执行结果，这个函数是从后端获取登录用户信息的 后端API 调用
  // 当 getLoginUser() 函数执行完成后，返回的结果被存储在 res 变量中
  // 然后，检查 res.data.code 是否等于 0，并且 res.data.data 是否存在，这通常表示请求成功并且有有效的数据返回
  // 如果条件满足，将 res.data.data（即登录用户信息）赋值给 loginUser.value，从而更新响应式变量 loginUser 的值

  //async加在函数前，标记这个函数是异步函数，异步函数的返回值一定是 Promise 对象。加在函数前，标记这个函数是异步函数，异步函数的返回值一定是 Promise 对象。
  // 什么是异步函数？异步函数允许你在函数内部使用 await 关键字来等待 Promise 对象的完成，而不会阻塞整个程序的执行。
  async function fetchLoginUser() {
    // getLoginUser() 这个 API 请求函数，内部本质是 axios 请求，返回的就是 Promise 对象
    const res = await getLoginUser()
    // res.data.code === 0 ：后端约定「code=0代表请求成功」，非0代表失败（比如未登录、token过期等）
    // res.data.data ：后端返回的「真实用户信息数据」，存在则代表有合法的登录用户数据
    if (res.data.code === 0 && res.data.data) {
      loginUser.value = res.data.data
    }
  }




  // 更新登录用户信息
  // setLoginUser 是一个普通函数，接受一个参数 newLoginUser，表示新的登录用户信息
  // 函数内部将 newLoginUser 赋值给 loginUser.value，从而更新响应式变量 loginUser 的值
  // 这个方法可以在不需要从后端获取数据的情况下，直接更新登录用户信息！！！！！！！！！！！！！！！！！！！
  function setLoginUser(newLoginUser: Partial<API.LoginUserVO>) {
    loginUser.value = {
      ...loginUser.value,
      ...newLoginUser,
    }
  }

  // 导出变量、两个方法
  return { loginUser, setLoginUser, fetchLoginUser }
})
