<template>
  <div id="userLoginPage">
    <h2 class="title">AI应用生成</h2>
    <div class="desc">零代码应用生成，感受AI时代的力量</div>
    <!--    表单整体布局设置-->
    <a-form
      :model="formState"
      name="basic"
      autocomplete="off"
      @finish="onFinish"
      class="center-form"
    >
                          <!--      用户名组件（含label和输入框必要设置：名字、提示语+++绑定变量）(还可以做校验)-->
      <a-form-item name="userAccount" :rules="[{ required: true, message: 'Please input your username!' }]">
        <a-input v-model:value="formState.userAccount" placeholder="请输入账号"/>
      </a-form-item>
      <!--      密码组件（含label和输入框必要设置：名字、提示语+++绑定变量）-->
      <a-form-item name="userPassword" :rules="[{ required: true, message: 'Please input your password!' }]">
        <a-input-password v-model:value="formState.userPassword" placeholder="请输入密码"/>
      </a-form-item>
                          <!--跳转注册页面提示， RouterLink是跳转按钮组件，到指定路由-->
      <div class="tips">
        <span>还没有账号？</span>
        <RouterLink to="/user/register">点击注册</RouterLink>
      </div>
                          <!--      提交按钮组件：距离、样式设置****在下面绑定   样式：居中-->
      <a-form-item>
        <div class="btn-wrap">
          <a-button type="primary" html-type="submit" class="submit-btn">登录</a-button>
        </div>
      </a-form-item>
    </a-form>
  </div>
</template>


<script lang="ts" setup>
import { reactive } from 'vue'
import { userLogin } from '@/api/userController.ts'
import { useLoginUserStore } from '@/stores/loginUser.ts'
import { message } from 'ant-design-vue'
import router from '@/router'

// 对话框绑定对应的表单数据对象，这里重点是去找API的类型定义**************
const formState = reactive<API.UserLoginRequest>({
  userAccount: '',
  userPassword: '',
})

// 这里让 提交按钮组件 绑定登录请求的对象类型 ********************************************
const onFinish = async (values: API.UserLoginRequest) => {
  const res = await userLogin(values)
  // 处理登录响应结果
  if (res.data.code == 0 && res.data.data) {
    await useLoginUserStore().fetchLoginUser();
    message.success()
    // 登录成功后跳转到首页或之前访问的页面 **********************************************
    await router.push({
      path: '/',
      replace: true,
    })
  } else {
    message.error(res.data.message || '登录失败');
  }
}

</script>

<style>
#userLoginPage {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: #ffffff;
}
/* 让表单内部元素垂直居中布局 */
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

/* 按钮包裹容器居中 */
.btn-wrap {
  display: flex;
  justify-content: center;
}

/* 登录按钮固定宽度或最大宽度 */
.submit-btn {
  width: 320px; /* 可改为 max-width: 100% 配合 .form-control */
}
</style>
