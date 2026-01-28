/**
 * 动态生成 API 基础地址（根据当前访问地址拼接 3009 端口）
 */
export function getBaseApi () {
  // 获取当前页面的协议（http/https）
  const protocol = window.location.protocol
  // 获取当前页面的主机（IP/域名，不含端口）
  const host = window.location.hostname
  // 拼接成目标地址：协议 + 主机 + 3009 端口
  return `${protocol}//${host}:3009`
}

/**
 * 动态生成 WebSocket 基础地址（根据当前访问地址拼接 3009 端口）
 */
export function getWsApi () {
  // 获取当前页面的主机（IP/域名，不含端口）
  const host = window.location.hostname
  // 根据 http/https 对应 ws/wss 协议
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  // 拼接成 WebSocket 地址
  return `${wsProtocol}//${host}:3009/api/ws`
}
