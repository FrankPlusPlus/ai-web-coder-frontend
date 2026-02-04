<template>
  <div class="basic-layout">
    <a-layout class="layout-container">
      <!-- 头部导航 -->
      <a-layout-header class="layout-header">
        <GlobalHeader />
      </a-layout-header>

      <!-- 内容区域 -->
      <a-layout class="layout-content">
        <a-layout-content class="content">
          <router-view />
        </a-layout-content>
      </a-layout>

      <!-- 底部版权 -->
      <a-layout-footer class="layout-footer">
        <GlobalFooter />
      </a-layout-footer>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import { Layout as ALayout } from 'ant-design-vue'
import GlobalHeader from '@/components/GlobalHeader.vue'
import GlobalFooter from '@/components/GlobalFooter.vue'
</script>

<style scoped>
.basic-layout {
  height: 100vh;
  overflow: hidden;
}

.layout-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.layout-header {
  background: transparent;
  padding: 0;
  z-index: 1000;
}

.layout-content {
  flex: 1;
  overflow: hidden;
}

.content {
  height: 100%;
  overflow-y: auto;
  padding: 0;
}

.layout-footer {
  background: #f5f5f5;
  padding: 0;
  border-top: 1px solid #e8e8e8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .content {
    padding: 16px;
  }
}
</style>
