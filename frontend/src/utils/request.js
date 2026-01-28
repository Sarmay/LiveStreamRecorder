import axios from 'axios'
import { Message, Loading, MessageBox } from 'element-ui'
import router from '@/router' // 引入路由，用于登录失效跳转
import { getBaseApi } from '@/utils/env';

// 创建 axios 实例
const service = axios.create({
  baseURL: getBaseApi(), // 基础请求地址（从环境变量读取）
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json;charset=utf-8' // 默认请求头
  }
})

// 定义 loading 实例
let loadingInstance = null

// 定义请求取消令牌
const CancelToken = axios.CancelToken
let cancelRequest = null

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 1. 显示 loading（可通过配置控制是否显示）
    if (config.showLoading !== false) {
      loadingInstance = Loading.service({
        lock: true,
        text: '加载中...',
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      })
    }

    // 2. 添加请求取消令牌
    config.cancelToken = new CancelToken((cancel) => {
      cancelRequest = cancel
    })

    // 3. 添加 token（从 localStorage 中获取，根据你的项目调整）
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    // 请求拦截错误处理
    loadingInstance && loadingInstance.close()
    Message.error('请求配置异常，请稍后重试')
    console.error('请求拦截错误：', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    // 关闭 loading
    loadingInstance && loadingInstance.close()

    // 解构响应数据
    const { data, status } = response

    // 200 状态码通用处理（可根据后端约定调整）
    if (status === 200) {
      if (data.code === 200) {
        // 业务成功，返回数据
        return data.data
      } else {
        // 业务失败，提示错误信息
        Message.warning(data.message || '操作失败')
        return Promise.reject(data)
      }
    } else {
      Message.error('请求返回异常')
      return Promise.reject(response)
    }
  },
  (error) => {
    console.log('响应拦截错误：', error)
    // 关闭 loading
    loadingInstance && loadingInstance.close()

    // 取消请求的特殊处理
    if (axios.isCancel(error)) {
      console.log('请求已取消：', error.message)
      return Promise.reject(error)
    }

    // 解构错误信息
    const { response } = error

    // 无响应的情况（网络错误、服务器宕机等）
    if (!response && error.message) {
      return Promise.reject(error.message)
    }

    // 超时处理
    if (error.message && error.message.includes('timeout')) {
      Message.error('请求超时，请检查网络或稍后重试')
      return Promise.reject(error)
    }

    // 无响应的情况（网络错误、服务器宕机等）
    if (!response || !response.status) {
      Message.error('网络异常，请检查网络连接')
      return Promise.reject(error)
    }

    // 根据 HTTP 状态码处理不同错误
    const { status, data } = response
    switch (status) {
      case 401:
        // 未登录/登录过期，提示并跳转登录页
        MessageBox.confirm(
          '登录状态已过期，请重新登录',
          '权限提示',
          {
            confirmButtonText: '去登录',
            cancelButtonText: '取消',
            type: 'warning'
          }
        ).then(() => {
          // 清除本地 token
          localStorage.removeItem('token')
          // 跳转登录页（根据你的路由配置调整）
          router.push('/login')
        })
        break
      case 403:
        Message.error('暂无权限访问该资源')
        break
      case 404:
        Message.error('请求地址不存在')
        break
      case 500:
        Message.error('服务器内部错误，请稍后重试')
        break
      default:
        // 其他状态码，显示后端返回的错误信息
        Message.error(data.msg || `请求失败，状态码：${status}`)
    }

    console.error('响应拦截错误：', error)
    return Promise.reject(error)
  }
)

// 暴露取消请求的方法（可选）
service.cancelRequest = () => {
  if (cancelRequest) {
    cancelRequest('主动取消请求')
  }
}

// 导出封装后的 axios 实例
export default service
