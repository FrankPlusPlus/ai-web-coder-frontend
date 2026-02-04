export default {
  requestLibPath: "import request from '@/request'", // 请求库有一些封装的套路，这里是src下的request.ts（所谓的@）
  schemaPath: 'http://localhost:8123/api/v3/api-docs', // 后端接口文档地址................这个路径怎么获取的？？？？？？？？？
  serversPath: './src', // 会自动在src目录下生成api目录，保存api-docs的代码
}

/**
 * 指定了代码生成的配置，包括请求库路径、后端接口文档地址和生成代码的保存路径
 * 根据后端请求，生成前端请求和TS模型代码直接用于请求指定后端接口
 */
