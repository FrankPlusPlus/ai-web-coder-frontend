<template>
  <div class="global-footer">
    <div class="footer-content">
      <div class="copyright">
        <a
          href="https://github.com/FrankPlusPlus"
          target="_blank"
          rel="noopener noreferrer"
          class="github-link"
        >
          https://github.com/FrankPlusPlus
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 这里可以添加更多的footer逻辑
</script>

<style scoped>
.global-footer {
  height: 100%;
  display: flex;
  align-items: center;
}

.footer-content {
  width: 100%;
  text-align: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.copyright {
  font-size: 14px;
  color: #666;
}

.github-link {
  color: #1890ff;
  text-decoration: none;
  transition: color 0.3s;
}

.github-link:hover {
  color: #40a9ff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .footer-content {
    padding: 0 16px;
  }

  .copyright {
    font-size: 12px;
  }
}
</style>