import request from '@/utils/request'

// 获取录制状态
export function getRecordingStatus () {
  return request({
    url: '/api/recording-status',
    method: 'get',
    showLoading: true
  })
}

// 开始录制
export function startRecording (data) {
  return request({
    url: '/api/start-recording',
    method: 'post',
    data
  })
}

// 停止录制
export function stopRecording (data) {
  return request({
    url: '/api/stop-recording',
    method: 'post',
    data
  })
}

// 获取已完成的列表
export function getCompletedRecordings () {
  return request({
    url: '/api/completed-recordings',
    method: 'get'
  })
}

// 删除已完成录制
export function removeCompleted (data) {
  return request({
    url: '/api/remove-completed-recordings',
    method: 'post',
    data
  })
}

// 添加计划
export function addSchedule (data) {
  return request({
    url: '/api/add-schedule',
    method: 'post',
    data
  })
}

// 删除计划
export function removeSchedule (data) {
  return request({
    url: '/api/remove-schedule',
    method: 'post',
    data
  })
}

// 获取计划列表
export function getSchedules () {
  return request({
    url: '/api/schedules',
    method: 'get',
    showLoading: true
  })
}
