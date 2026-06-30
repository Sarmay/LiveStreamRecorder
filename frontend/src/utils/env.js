/**
 * 动态生成 API 基础地址。
 * 生产环境默认根据当前访问地址拼接 3009 端口；开发环境默认使用本地代理。
 */
export function getBaseApi () {
  if (process.env.VUE_APP_BASE_API) {
    if (process.env.VUE_APP_BASE_API === 'same-origin') {
      return ''
    }

    return process.env.VUE_APP_BASE_API.replace(/\/$/, '')
  }

  if (process.env.NODE_ENV === 'development') {
    return ''
  }

  const protocol = window.location.protocol
  const host = window.location.hostname
  return `${protocol}//${host}:3009`
}

/**
 * 动态生成 WebSocket 基础地址。
 */
export function getWsApi () {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  if (process.env.VUE_APP_WS_API) {
    if (process.env.VUE_APP_WS_API === 'same-origin') {
      return `${wsProtocol}//${window.location.host}/api/ws`
    }

    const wsApi = process.env.VUE_APP_WS_API.replace(/\/$/, '')
    return wsApi.endsWith('/api/ws') ? wsApi : `${wsApi}/api/ws`
  }

  const host = window.location.hostname

  if (process.env.NODE_ENV === 'development') {
    return `${wsProtocol}//${window.location.host}/api/ws`
  }

  return `${wsProtocol}//${host}:3009/api/ws`
}
