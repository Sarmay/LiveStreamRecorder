import { getWsApi } from '@/utils/env'

/**
 * Vue2 WebSocket 工具封装
 * 支持：自动重连、心跳检测、消息格式化、错误处理、多实例管理
 */
class WebSocketClient {
  /**
   * 构造函数
   * @param {Object} options 配置项
   * @param {String} options.url WS连接地址（如：ws://localhost:8080/ws）
   * @param {Number} [options.reconnectTimes=5] 最大重连次数（-1表示无限重连）
   * @param {Number} [options.reconnectInterval=3000] 重连间隔（ms）
   * @param {Number} [options.heartbeatInterval=10000] 心跳间隔（ms）
   * @param {String} [options.heartbeatMsg='ping'] 心跳消息内容
   * @param {String} [options.heartbeatResponseMsg='pong'] 心跳响应消息内容
   * @param {Function} [options.onMessage] 消息接收回调
   * @param {Function} [options.onOpen] 连接成功回调
   * @param {Function} [options.onClose] 连接关闭回调
   * @param {Function} [options.onError] 错误回调
   */
  constructor (options = {}) {
    // 默认配置
    this.config = {
      url: getWsApi(),
      reconnectTimes: -1, // 最大重连次数，-1为无限重连
      reconnectInterval: 3000, // 重连间隔
      heartbeatInterval: 10000, // 心跳间隔
      heartbeatMsg: 'ping', // 心跳消息
      onMessage: () => { },
      onOpen: () => { },
      onClose: () => { },
      onError: () => { }
    }

    // 合并用户配置
    Object.assign(this.config, options)

    // 状态管理
    this.ws = null // WS实例
    this.isConnected = false // 是否已连接
    this.reconnectCount = 0 // 当前重连次数
    this.heartbeatTimer = null // 心跳定时器
    this.reconnectTimer = null // 重连定时器

    // 初始化连接
    this.connect()
  }

  /**
   * 建立WS连接
   */
  connect () {
    // 关闭已有连接
    if (this.ws) {
      this.ws.close()
    }

    // 校验URL
    if (!this.config.url) {
      console.error('WebSocket 连接失败：URL不能为空')
      this.config.onError('URL不能为空')
      return
    }

    try {
      // 创建WS实例
      this.ws = new WebSocket(this.config.url)

      // 连接成功回调
      this.ws.onopen = (event) => {
        this.isConnected = true
        this.reconnectCount = 0 // 重置重连次数
        console.log('WebSocket 连接成功')

        // 启动心跳检测
        this.startHeartbeat()

        // 执行用户回调
        this.config.onOpen(event)
      }

      // 接收消息回调
      this.ws.onmessage = (event) => {
        try {
          if (!event.data || event.data.trim() === '') {
            return
          }
          if (event.data === this.config.heartbeatResponseMsg) {
            // 心跳响应，不处理业务逻辑
            console.log('收到心跳响应：', event.data)
            return
          }
          // 尝试解析JSON格式消息，兼容普通文本
          const message = JSON.parse(event.data)
          this.config.onMessage(message, event)
        } catch (e) {
          this.config.onMessage(event.data, event)
        }
      }

      // 连接关闭回调
      this.ws.onclose = (event) => {
        this.isConnected = false
        console.log('WebSocket 连接关闭', event)

        // 清除定时器
        this.clearTimer()

        // 执行用户回调
        this.config.onClose(event)

        // 自动重连
        this.reconnect()
      }

      // 错误回调
      this.ws.onerror = (error) => {
        this.isConnected = false
        console.error('WebSocket 连接错误', error)

        // 执行用户回调
        this.config.onError(error)
      }
    } catch (error) {
      console.error('WebSocket 初始化失败', error)
      this.config.onError(error)
      this.reconnect()
    }
  }

  /**
   * 启动心跳检测
   */
  startHeartbeat () {
    // 清除已有心跳
    this.clearHeartbeat()

    // 定时发送心跳
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send(this.config.heartbeatMsg)
      }
    }, this.config.heartbeatInterval)
  }

  /**
   * 发送消息
   * @param {Any} data 要发送的消息（支持对象/字符串）
   * @returns {Boolean} 是否发送成功
   */
  send (data) {
    if (!this.isConnected || !this.ws) {
      console.error('WebSocket 未连接，发送消息失败')
      return false
    }

    try {
      // 统一格式化消息（对象转JSON）
      const sendData = typeof data === 'object' ? JSON.stringify(data) : data
      this.ws.send(sendData)
      return true
    } catch (error) {
      console.error('WebSocket 发送消息失败', error)
      return false
    }
  }

  /**
   * 自动重连
   */
  reconnect () {
    // 清除已有重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    // 判断是否需要重连
    const { reconnectTimes, reconnectInterval } = this.config
    if (reconnectTimes === 0 || (reconnectTimes > 0 && this.reconnectCount >= reconnectTimes)) {
      console.error(`WebSocket 重连次数已达上限（${reconnectTimes}次），停止重连`)
      return
    }

    // 重连计数+1
    this.reconnectCount++
    console.log(`WebSocket 准备重连（第${this.reconnectCount}次），间隔${reconnectInterval}ms`)

    // 定时重连
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, reconnectInterval)
  }

  /**
   * 清除所有定时器
   */
  clearTimer () {
    this.clearHeartbeat()
    this.clearReconnect()
  }

  /**
   * 清除心跳定时器
   */
  clearHeartbeat () {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * 清除重连定时器
   */
  clearReconnect () {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * 手动关闭连接
   * @param {Boolean} [isReconnect=false] 是否禁止自动重连
   */
  close (isReconnect = false) {
    // 禁止重连
    if (isReconnect) {
      this.config.reconnectTimes = 0
    }

    // 清除定时器
    this.clearTimer()

    // 关闭连接
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnected = false
    console.log('WebSocket 手动关闭连接')
  }
}

// 导出单例创建方法（可选）
let wsInstance = null
export function createWebSocket (options) {
  if (!wsInstance) {
    wsInstance = new WebSocketClient(options)
  }
  return wsInstance
}

// 导出类（支持多实例）
export default WebSocketClient
