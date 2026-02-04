import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

/**
 * 这个文件定义了一个 Pinia store，名为 'counter'，用于管理计数器状态。
 * 它包含一个响应式的计数器 `count`，一个计算属性 `doubleCount`（表示计数器的两倍），
 * pinia是一个状态管理库，类似于Vuex，但更轻量和易用。
 * 状态管理库允许你在应用的不同部分之间共享和管理状态。
 * 举个例子，如果你有一个计数器应用，你可能希望在多个组件中显示和更新计数器的值。
 * 使用 Pinia，你可以创建一个 store 来管理计数器的状态，并在需要的组件中访问和修改它。
 */
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)
  function increment() {
    count.value++
  }

  return { count, doubleCount, increment }
})
