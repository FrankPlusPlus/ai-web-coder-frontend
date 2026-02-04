<script setup lang="ts">
import { reactive } from 'vue'
import { register } from '@/api/userController.ts'
import { message } from 'ant-design-vue'
import router from '@/router'

// 表单数据，使用 API 类型定义
const formState = reactive<API.UserRegisterRequest>({
  userAccount: '',
  userPassword: '',
  checkPassword: '',
})

const onFinish = async () => {
  // 简单前端校验：密码和确认密码一致
  if (formState.userPassword !== formState.checkPassword) {
    message.error('两次输入的密码不一致')
    return
  }

  try {
    const res = await register({
      userAccount: formState.userAccount,
      userPassword: formState.userPassword,
      checkPassword: formState.checkPassword,
    })

    if (res && res.data && res.data.code === 0) {
      message.success('注册成功，正在跳转到登录页')
      // 跳转到登录页
      await router.push({ path: '/user/login', replace: true })
    } else {
      message.error(res?.data?.message || '注册失败')
    }
  } catch (err: unknown) {
    const e = err as { message?: string }
    message.error(e?.message || '注册请求出错')
  }
}
</script>

<template>
  <div id="userRegisterPage">
    <h2 class="title">用户注册</h2>
    <div class="desc">创建你的账号，开始体验 AI 应用生成</div>

    <a-form
      :model="formState"
      name="register"
      autocomplete="off"
      @finish="onFinish"
      class="center-form"
    >
      <a-form-item name="userAccount" :rules="[{ required: true, message: '请输入账号!' }]">
        <a-input v-model:value="formState.userAccount" placeholder="请输入账号" />
      </a-form-item>

      <a-form-item name="userPassword" :rules="[{ required: true, message: '请输入密码!' }]">
        <a-input-password v-model:value="formState.userPassword" placeholder="请输入密码" />
      </a-form-item>

      <a-form-item name="checkPassword" :rules="[{ required: true, message: '请确认密码!' }]">
        <a-input-password v-model:value="formState.checkPassword" placeholder="请再次输入密码" />
      </a-form-item>

      <div class="tips">
        <span>已经有账号？</span>
        <RouterLink to="/user/login">去登录</RouterLink>
      </div>

      <a-form-item>
        <div class="btn-wrap">
          <a-button type="primary" html-type="submit" class="submit-btn">注册</a-button>
        </div>
      </a-form-item>
    </a-form>
  </div>
</template>

<style>
#userRegisterPage {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: #ffffff;
}
.center-form {
  display: block;
}
.title {
  text-align: center;
  font-size: 24px;
  margin-bottom: 10px;
}
.desc {
  text-align: center;
  font-size: 14px;
  color: #888888;
  margin-bottom: 20px;
}
.tips {
  text-align: center;
  margin-bottom: 20px;
}
.btn-wrap {
  display: flex;
  justify-content: center;
}
.submit-btn {
  width: 320px;
}
</style>
