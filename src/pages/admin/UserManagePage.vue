<template>
<!--  下面是一个搜索表单，用于用户管理页面，包含账号和用户名的搜索输入框，以及一个搜索按钮。表单使用了Ant Design Vue的组件，并绑定了响应式数据searchParams。-->
<!--  当用户提交表单时，会触发doSearch方法进行搜索操作。表单布局为inline，适合放在一行内显示。-->
<!--  @符号表示监听事件，这里监听的是表单的finish事件，即表单提交完成时触发。即点击搜索按钮后触发doSearch方法。-->
  <div id="userManagePage">
    <!-- 搜索表单 -->
    <a-form layout="inline" :model="searchParams" @finish="doSearch">
      <a-form-item label="账号">
        <a-input v-model:value="searchParams.userAccount" placeholder="输入账号" />
      </a-form-item>
      <a-form-item label="用户名">
        <a-input v-model:value="searchParams.userName" placeholder="输入用户名" />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" html-type="submit">搜索</a-button>
      </a-form-item>
    </a-form>
    <a-divider />
    <!-- 表格 -->
  </div>

  <!--   绑定数据和列， 以及分页配置-->
<!--  解释一下这里绑定的各个部分的含义，以及@change事件的作用-->
<!--  1. :columns="columns"：这是一个属性绑定，将组件的columns属性绑定到Vue实例中的columns数据。columns定义了表格的列信息，包括每列的标题、数据索引等。-->
<!--  2. :data-source="data"：这是另一个属性绑定，将组件的data-source属性绑定到Vue实例中的data数据。data存储了表格中要显示的数据记录。-->
<!--  3. :pagination="pagination"：这是第三个属性绑定，将组件的pagination属性绑定到Vue实例中的pagination计算属性。pagination定义了表格的分页配置，包括当前页码、每页显示的条数、总条数等。-->
<!--  4. @change="doTableChange"：这是一个事件监听器，监听表格的change事件。当表格的分页、排序或筛选条件发生变化时，会触发这个事件，并调用Vue实例中的doTableChange方法。这个方法用于处理表格的变化，例如更新搜索参数并重新获取数据。-->
<!--  5. rowKey="id"：这是一个属性，指定表格中每一行数据的唯一标识符，这里使用数据记录的id字段作为行的唯一标识符。-->
<!--  绑定数据只在a-table标签上面，不需要在template标签上面绑定，因为template标签本身并不是一个具体的表格组件，而是Vue中的一个模板语法，用于定义组件的结构和内容。数据绑定应该直接应用于具体的表格组件（如a-table），以确保数据能够正确传递和渲染在表格中。-->
  <a-table :columns="columns" :data-source="data" :pagination="pagination"
  @change="doTableChange" rowKey="id">

        <!--    自定义列头-->
<!--    <template #headerCell="{ column }">-->
<!--      <template v-if="column.key === 'name'">-->
<!--        <span>-->
<!--          <smile-outlined />-->
<!--          Name-->
<!--        </span>-->
<!--      </template>-->
<!--    </template>-->

        <!--    body美化-->
    <template #bodyCell="{ column, record }">
      <template v-if="column.dataIndex === 'userAvatar'">
        <a-image :src="record.userAvatar" :width="120" />
      </template>
      <template v-else-if="column.dataIndex === 'userRole'">
        <div v-if="record.userRole === 'admin'">
          <a-tag color="green">管理员</a-tag>
        </div>
        <div v-else>
          <a-tag color="blue">普通用户</a-tag>
        </div>
      </template>
      <template v-else-if="column.dataIndex === 'createTime'">
        {{ dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') }}
      </template>
      <template v-else-if="column.key === 'action'">
<!--        给删除按钮绑定点击事件，调用doDelete方法，并传入当前记录的id-->
<!--        record表示当前行的数据记录-->
<!--        通过record.id获取当前记录的id值-->
<!--        这样点击删除按钮时，就能知道要删除哪一条记录-->
<!--        下面的@click是Vue的事件绑定语法，表示当按钮被点击时，执行后面的doDelete(record.id)方法-->
<!--        这个方法会接收record.id作为参数，用于删除对应的用户记录-->
<!--        这样就实现了点击删除按钮后删除对应用户的功能-->
<!--        具体的删除逻辑会在doDelete方法中实现-->
<!--        这个模板用于渲染操作列，包含一个删除按钮-->
<!--        通过@click事件绑定，点击按钮时会调用doDelete方法，并传入当前记录的id-->
<!--        这样可以实现删除对应用户的功能-->
<!--        具体的删除逻辑会在doDelete方法中实现-->
        <a-button danger @click="doDelete(record.id)">删除</a-button>
      </template>
    </template>

  </a-table>
</template>


<script lang="ts" setup>
import { deleteUser, listUserVoByPage } from '@/api/userController.ts'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'

const columns = [
  {
    title: 'id',
    dataIndex: 'id',
  },
  {
    title: '账号',
    dataIndex: 'userAccount',
  },
  {
    title: '用户名',
    dataIndex: 'userName',
  },
  {
    title: '头像',
    dataIndex: 'userAvatar',
  },
  {
    title: '简介',
    dataIndex: 'userProfile',
  },
  {
    title: '用户角色',
    dataIndex: 'userRole',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
  },
  {
    title: '操作',
    key: 'action',
  },
];


// 数据动态获取和处理
const data = ref<API.UserVO[]>([])
const total = ref(0)

// 搜索条件
const searchParams = reactive<API.UserQueryRequest>({
  pageNum: 1,
  pageSize: 10,
})

// 通俗讲解下面函数的语法，还有函数属于什么库，什么作用，什么原理：
// 这个函数是一个异步函数，属于JavaScript语言的语法。异步函数使用`async`关键字定义，允许在函数内部使用`await`关键字来等待异步操作完成，从而简化了异步代码的编写和阅读。
// 这个函数的作用是从服务器获取用户数据，并将其存储在响应式引用`data`中，同时更新总条数`total`。
// 在函数体内，首先调用`listUserVoByPage`函数，来自于`@/api/userController.ts`模块，这是一个API调用函数，用于向服务器发送请求以获取用户数据。传递给它的参数是`searchParams`对象，包含了分页信息，如当前页码和每页显示的条数。
// 使用`await`关键字等待`listUserVoByPage`函数的返回结果，并将结果存储在`res`变量中。
// res相当于java中的一个对象，里面的属性有data，data里面又有data和message属性，data属性存储了获取到的数据，message属性存储了服务器返回的消息。它的结构取决于后端API的设计。可以看出后端封装的响应对象的结构是
// {
//   data: {
//     data: { records: [...], totalRow: number },
//     message: string
//   }
// }
// 接下来，检查`res.data.data`是否存在。如果存在，说明数据获取成功，将返回的数据中的记录赋值给`data.value`，并将总行数赋值给`total.value`。这里使用了可选链操作符`??`，如果`records`或`totalRow`为`null`或`undefined`，则分别赋值为空数组和0。
// 如果`res.data.data`不存在，说明数据获取失败，使用`message.error`函数显示错误信息，提示用户获取数据失败，并附加服务器返回的错误消息。
// 通过使用异步函数和`await`关键字，这个函数能够以同步的方式编写异步代码，提高了代码的可读性和维护性。
const fetchData = async () => {
  // 调试：打印请求参数

  console.log('fetchData request params:', JSON.parse(JSON.stringify(searchParams)))
  const res = await listUserVoByPage({
    ...searchParams,
  })
  // 调试：打印响应

  console.log('fetchData response:', res)
  if (res.data.data) {
    data.value = res.data.data.records ?? []
    total.value = res.data.data.totalRow ?? 0
  } else {
    message.error('获取数据失败，' + res.data.message)
  }
}

// 通俗讲解下面函数的语法，还有函数属于什么库，什么作用，什么原理：
// 这个函数是一个计算属性，属于Vue.js框架中的computed函数。computed函数用于创建基于响应式数据的计算属性，当依赖的数据发生变化时，计算属性会自动重新计算。比如，当searchParams或total发生变化时，pagination会自动更新。
// 响应式数据是Vue.js中的一个核心概念，它允许数据的变化自动反映在视图上，从而实现数据驱动的用户界面。computed函数利用了Vue的响应式系统，确保计算属性始终与其依赖的数据保持同步。
// 这个计算属性的作用是生成一个分页配置对象，用于表格组件的分页功能。
// 在函数体内，返回一个对象，这个对象包含了分页所需的各种属性：
// current: 当前页码，取自searchParams.pageNum，如果没有值则默认为1。
// pageSize: 每页显示的条数，取自searchParams.pageSize，如果没有值则默认为10。
// total: 总条数，取自total.value，这是一个响应式引用，存储了数据的总条数。
// showSizeChanger: 一个布尔值，表示是否显示每页条数的选择器，这里设置为true，表示显示。
// showTotal: 一个函数，用于显示总条数的信息，接受一个参数total，返回一个字符串，格式为“共 X 条”，其中X是总条数。
// 通过使用computed函数，这个分页配置对象会根据searchParams和total的变化自动更新，从而确保表格组件的分页功能始终与当前的数据状态保持一致。
// 箭头函数的语法使得代码更加简洁，同时也避免了传统函数中的this绑定问题。它等于下面的传统函数写法：
// const pagination = computed(function() {
//   return {
//     current: searchParams.pageNum ?? 1,
//     pageSize: searchParams.pageSize ?? 10,
//     total: total.value,
//     showSizeChanger: true,
//     showTotal: function(total) { return `共 ${total} 条`; },
//   }
// });
const pagination = computed(() => {
  return {
    current: searchParams.pageNum ?? 1,
    pageSize: searchParams.pageSize ?? 10,
    total: total.value,
    showSizeChanger: true,
    showTotal: (total: number) => `共 ${total} 条`,
  }
})

// 通俗讲解下面函数的语法，还有函数属于什么库，什么作用，什么原理：
// 这个函数是一个箭头函数，属于JavaScript语言的语法。箭头函数是一种简洁的函数定义方式，使用`=>`符号来表示函数体。
// 这个函数的作用是处理表格的分页变化事件。当用户在表格中更改页码或每页显示的条数时，会触发这个函数。
// 函数接受一个参数`page`，它是一个对象，包含了当前页码和每页显示的条数。
// searchParams是一个响应式对象，存储了当前的搜索条件，包括页码和每页显示的条数。这个响应式对象来自Vue的`reactive`函数，可以在数据变化时自动更新视图。reactive是Vue 3中用于创建响应式对象的函数，它使得对象的属性在变化时能够触发视图的更新。
// 在函数体内，首先将`page.current`赋值给`searchParams.pageNum`，表示更新当前页码。
// 然后将`page.pageSize`赋值给`searchParams.pageSize`，表示更新每页显示的条数。
// 最后调用`fetchData()`函数，重新获取数据并更新表格内容
const doTableChange = (page: { current?: number; pageSize?: number }) => {
  searchParams.pageNum = page.current
  searchParams.pageSize = page.pageSize
  fetchData()
}


// 获取数据
const doSearch = () => {
  // 重置页码
  searchParams.pageNum = 1
  fetchData()
}

// 删除数据
const doDelete = async (id: number | string) => {
  const userId = id != null ? String(id) : ''
  if (!userId) {
    return
  }
  const res = await deleteUser({ id: userId })
  if (res.data.code === 0) {
    message.success('删除成功')
    // 刷新数据
    fetchData()
  } else {
    message.error('删除失败')
  }
}




// 页面加载时请求一次
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
#userManagePage {
  padding: 24px;
}
</style>
