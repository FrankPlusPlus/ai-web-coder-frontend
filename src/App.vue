<script setup lang="ts">
import BasicLayout from './layouts/BasicLayout.vue'
import { useLoginUserStore } from '@/stores/loginUser.ts'
import '@/access' // 用于权限控制的全局引入，因为App.vue是应用的入口文件，本质是其他模块的依赖，各个组件其效果的基础是App.vue被加载执行
// 详细通俗解释一下App.vue和其他.vue文件的不同与特殊之处：
// 1. 入口文件：App.vue是Vue应用的根组件，是整个应用的入口文件，其他.vue文件通常是应用中的子组件或页面组件。
// 2. 全局作用域：App.vue的代码在应用启动时会被执行一次，具有全局作用域，可以用来设置全局状态、引入全局样式和插件等。
// 3. 依赖关系：其他.vue文件通常是App.vue的子组件或页面组件，它们依赖于App.vue的加载和渲染。
// 4. 生命周期：App.vue的生命周期钩子在应用启动时会被调用，而其他.vue文件的生命周期钩子则在它们被渲染时才会被调用。
// 5. 配置和设置：App.vue通常用于配置应用的整体结构和布局，而其他.vue文件则用于实现具体的功能和界面。
// 因此，App.vue作为应用的根组件，具有特殊的地位和作用，是整个Vue应用的基础。
// 为什么没有引入router.ts？
// 因为router.ts已经在main.ts中引入并注册到Vue应用实例中了，App.vue作为根组件，可以直接使用路由功能，无需再次引入router.ts
// 解释一下main.ts与App.vue的关系：
// main.ts是Vue应用的入口文件，负责创建和配置Vue应用实例，并将App.vue作为根组件挂载到应用实例中。
// App.vue是Vue应用的根组件，定义了应用的整体结构和布局。
// main.ts中引入并注册了路由（router.ts）和状态管理
// （如Pinia：Pinia 使用 defineStore 方法创建 Store。每个 Store 是一个独立的模块，可以包含状态（state）、计算属性（getters）和方法（actions）），
// 使得App.vue及其子组件可以访问路由和全局状态。
// 因此，main.ts负责应用的初始化和配置，而App.vue负责定义应用的界面和功能，两者共同构成了完整的Vue应用。

// 创建这个全局的登录用户存储实例，以便在应用程序的任何地方都可以访问它
const loginUserStore = useLoginUserStore();
// 尝试从本地存储或 API 获取登录用户信息
loginUserStore.fetchLoginUser();

</script>

<template>
  <BasicLayout />
</template>

<style>
/* 全局样式重置 */
* {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  height: 100vh;
  margin: 0;
  padding: 0;
}
</style>
