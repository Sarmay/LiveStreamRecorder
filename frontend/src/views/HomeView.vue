<template>
  <el-container style="height: 100vh;">
    <el-header style="background-color: #333; color: white;display: flex;align-items: center;">
      <h1 style="margin: 0;">Live Stream Recorder</h1>
    </el-header>
    <el-main>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card>
            <div slot="header">
              <span>即时录制</span>
            </div>
            <el-form :model="recordForm" label-width="80px">
              <el-form-item label="直播地址">
                <el-input v-model="recordForm.url" clearable placeholder="输入FLV或HLS地址" style="width: 100%;"></el-input>
              </el-form-item>
              <el-form-item label="录制名称">
                <el-input v-model="recordForm.name" clearable placeholder="可选，用于标识录制文件"></el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="startRecording" :disabled="isRecording">开始录制</el-button>
              </el-form-item>
            </el-form>
          </el-card>

          <el-card style="margin-top: 8px;">
            <div slot="header">
              <span>定时录制</span>
            </div>
            <el-form :model="scheduleForm" label-width="100px">
              <el-form-item label="直播地址">
                <el-input v-model="scheduleForm.url" clearable placeholder="输入FLV或HLS地址" style="width: 100%;"></el-input>
              </el-form-item>
              <el-form-item label="录制名称">
                <el-input v-model="scheduleForm.name" clearable placeholder="用于标识录制文件"></el-input>
              </el-form-item>
              <el-form-item label="开始时间">
                <el-date-picker v-model="scheduleForm.startTime" type="datetime" placeholder="选择开始时间"
                  value-format="yyyy-MM-dd HH:mm:ss" style="width: 100%;"></el-date-picker>
              </el-form-item>
              <el-form-item label="结束时间">
                <el-date-picker v-model="scheduleForm.endTime" type="datetime" placeholder="选择结束时间（可选）"
                  value-format="yyyy-MM-dd HH:mm:ss" style="width: 100%;"></el-date-picker>
              </el-form-item>
              <el-form-item label="重复录制">
                <el-switch v-model="scheduleForm.isRecurring"></el-switch>
                <span style="margin-left: 10px;">每日同一时间录制</span>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="addSchedule">添加定时任务</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card>
            <div slot="header">
              <span>录制状态</span>
            </div>
            <div v-if="currentRecording" class="recording-status">
              <el-tag type="success" style="font-size: 18px;">录制中</el-tag>
              <p><strong>名称:</strong> {{ currentRecording.name }}</p>
              <p><strong>开始时间:</strong> {{ currentRecording.startTime }}</p>
              <p><strong>时长:</strong> {{ currentRecording.duration || '00:00:00' }}</p>
              <p><strong>文件大小:</strong> {{ formatFileSize(currentRecording.size) }}</p>
              <p><strong>操作:</strong>
                <el-button style="margin-left: 8px;" type="danger" @click="stopRecordingHandel">停止录制</el-button>
                <el-button style="margin-left: 8px;" type="primary" @click="watchRecordingHandel">观看直播</el-button>
              </p>
            </div>
            <div v-else>
              <p>当前没有正在录制的直播</p>
            </div>
          </el-card>

          <el-card style="margin-top: 8px;">
            <div slot="header">
              <span>已完成列表</span>
            </div>
            <el-table :data="completedRecordings" style="width: 100%;">
              <el-table-column prop="name" label="名称"></el-table-column>
              <el-table-column prop="startTime" label="开始时间" :formatter="formatTime"></el-table-column>
              <el-table-column prop="endTime" label="结束时间" :formatter="formatTime"></el-table-column>
              <el-table-column prop="duration" label="时长" :formatter="formatTime"></el-table-column>
              <el-table-column prop="size" label="文件大小" :formatter="formatTime"></el-table-column>
              <el-table-column label="操作">
                <template slot-scope="scope">
                  <el-button type="primary" size="mini"
                    @click="completedWatchHandel(scope.row.playbackUrl)">观看</el-button>
                  <el-button type="danger" size="mini" @click="removeCompletedHandel(scope.row.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <el-card style="margin-top: 8px;">
            <div slot="header">
              <span>定时任务列表</span>
            </div>
            <el-table :data="schedules" style="width: 100%;">
              <el-table-column prop="name" label="名称"></el-table-column>
              <el-table-column prop="startTime" label="开始时间"></el-table-column>
              <el-table-column prop="endTime" label="结束时间"></el-table-column>
              <el-table-column prop="isRecurring" label="重复">
                <template slot-scope="scope">
                  <el-tag type="info" v-if="scope.row.isRecurring">是</el-tag>
                  <el-tag v-else>否</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作">
                <template slot-scope="scope">
                  <el-button type="danger" size="mini" @click="removeSchedule(scope.row.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script>
import moment from 'moment'
import WebSocketClient from '@/utils/websocket'
import { getBaseApi, getWsApi } from '@/utils/env'
import { getRecordingStatus, startRecording, stopRecording, getCompletedRecordings, removeCompleted, addSchedule, removeSchedule, getSchedules } from '@/api'

export default {
  name: 'HomeView',
  data () {
    return {
      ws: null,
      recordForm: {
        url: '',
        name: ''
      },
      scheduleForm: {
        url: '',
        name: '',
        startTime: '',
        endTime: '',
        isRecurring: false
      },
      currentRecording: null,
      schedules: [],
      isRecording: false,
      statusCheckInterval: null,
      completedRecordings: []
    }
  },
  mounted () {
    this.recordForm.name = '录制直播_' + moment().format('YYYY_MM_DD_HH_mm_ss')
    this.connectWebSocket()
    this.loadSchedules()
    this.checkRecordingStatus()
    this.loadCompletedRecordings()
  },
  beforeDestroy () {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval)
    }
  },
  methods: {
    formatTime (row, column) {
      if (column.property === 'startTime') {
        return moment(row.startTime).format('YYYY-MM-DD HH:mm:ss')
      }
      if (column.property === 'endTime') {
        return moment(row.endTime).format('YYYY-MM-DD HH:mm:ss')
      }
      // 如果是时长，把秒转换为 HH:mm:ss 格式,手动转换
      if (column.property === 'duration') {
        return this.formatDuration(row.duration)
      }
      // 如果是文件大小，格式化为 MB 格式
      if (column.property === 'size') {
        return this.formatFileSize(row.size)
      }
      return row[column.property]
    },
    formatDuration (seconds) {
      // 1. 边界值处理：非数字/负数转为0
      const sec = Math.max(Math.floor(Number(seconds) || 0), 0)
      // 2. 计算时、分、秒
      const hours = Math.floor(sec / 3600) // 1小时=3600秒
      const minutes = Math.floor((sec % 3600) / 60) // 剩余秒数转分钟
      const secs = sec % 60 // 最终剩余秒数

      // 3. 补零函数：确保单个数字补0（如 5 → 05）
      const padZero = (num) => num.toString().padStart(2, '0')

      // 4. 拼接格式：根据是否保留小时位调整
      if (hours > 0) {
        // 完整 HH:mm:ss 格式（如 01:05:30、00:05:30）
        return `${padZero(hours)}:${padZero(minutes)}:${padZero(secs)}`
      } else {
        // 不保留小时位（如 05:30）
        return `${padZero(minutes)}:${padZero(secs)}`
      }
    },
    formatFileSize (bytes, decimalPlaces = 2) {
      // 1. 边界值处理：非数字/负数/0 直接返回 0 B
      const size = Math.max(Number(bytes) || 0, 0)
      if (size === 0) return '0 B'

      // 2. 定义单位换算常量（1KB = 1024B，1MB = 1024KB，以此类推）
      const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
      const unitStep = 1024 // 二进制换算（符合行业通用标准）

      // 3. 计算对应的单位层级（如 1024B → 1KB，层级为1）
      const unitIndex = Math.floor(Math.log(size) / Math.log(unitStep))

      // 4. 限制单位层级不超过定义的范围（避免超出 PB）
      const clampedIndex = Math.min(unitIndex, units.length - 1)

      // 5. 计算最终大小并保留指定小数位
      const formattedSize = (size / Math.pow(unitStep, clampedIndex)).toFixed(decimalPlaces)

      // 6. 去除末尾的0和小数点（如 1.00 GB → 1 GB，0.50 MB → 0.5 MB）
      const cleanSize = parseFloat(formattedSize).toString()

      // 7. 拼接结果
      return `${cleanSize} ${units[clampedIndex]}`
    },
    // 连接 WebSocket
    connectWebSocket () {
      // 创建组件内WS实例
      this.ws = new WebSocketClient({
        url: getWsApi(),
        heartbeatInterval: 15000,
        // 接收消息
        onMessage: (message) => {
          this.handleMessage(message)
        },
        // 连接成功
        onOpen: () => {
          this.$message.success('WS连接成功')
        }
      })
    },
    // 处理WS消息
    handleMessage (message) {
      // 处理错误消息
      if (message.type === 'RECORDING_ERROR') {
        this.$message.error(message.payload.error)
        /*
          payload: {
        id: "c0c0a05d-fcb0-4024-be31-634d2f1ec8bc"
        status: "error",
        error:"Recording failed",
        endTime:"2026-01-27T04:59:31.196Z"
        }
        */
        return
      }
      // 处理完成消息
      if (message.type === 'RECORDING_COMPLETED') {
        this.$message.success('录制已完成')
        /*
        payload: {
        duration: "00:00:10.17"
        id: "c0c0a05d-fcb0-4024-be31-634d2f1ec8bc"
        size: 524336,
        status: 'completed',
        endTime:"2026-01-27T04:59:31.196Z"
        }
        */
        return
      }

      // 处理开始消息
      if (message.type === 'RECORDING_STARTED') {
        this.$message.success('录制已开始')
        this.currentRecording = message.payload
        this.isRecording = true
        /*
         payload: {
          "commandLine": "ffmpeg -re -timeout 5000000 -i https://devimages.apple.com.edgekey.net/iphone/samples/bipbop/bipbopall.m3u8 -y -c:v copy -c:a aac -b:a 128k /Users/sarmay/Desktop/TestProjects/Recording/backend/recordings/recording_2026-01-27_12-59-31.mp4",
          "duration": 0,
          "endTime": null,
          "filename": "recording_2026-01-27_12-59-31.mp4",
          "id": "dc03d9f9-6c42-448b-bd4f-997064de5074",
          "name": "started",
          "outputPath": "/Users/sarmay/Desktop/TestProjects/Recording/backend/recordings/recording_2026-01-27_12-59-31.mp4",
          "size": 0,
          "startTime": "2026-01-27T04:59:31.196Z",
          "status": "recording",
          "url": "https://devimages.apple.com.edgekey.net/iphone/samples/bipbop/bipbopall.m3u8"
          }
         */
        return
      }

      // 处理进行消息
      if (message.type === 'RECORDING_PROGRESS') {
        this.currentRecording = message.payload
        this.isRecording = true
        /*
        payload: {
        duration: "00:00:10.17"
        id: "c0c0a05d-fcb0-4024-be31-634d2f1ec8bc"
        size: 524336,
        "name": "recording",
        }
        */
        return
      }

      // 处理停止消息
      if (message.type === 'RECORDING_STOPPED') {
        this.currentRecording = message.payload
        this.isRecording = true
        /*
        payload: {
        duration: "00:00:10.17"
        id: "c0c0a05d-fcb0-4024-be31-634d2f1ec8bc"
        size: 524336,
        "name": "recording",
        }
        */
        return
      }

      // 处理定时任务添加消息
      if (message.type === 'SCHEDULE_ADDED') {
        this.$message.success('定时任务已添加')
        this.schedules.push(message.payload)
        /*
        payload: {
            "id": "155bd40a-8139-4468-b08c-df3ea35d22b9",
            "name": "录制名称",
            "url": "https://devimages.apple.com.edgekey.net/iphone/samples/bipbop/bipbopall.m3u8",
            "startTime": "2026-01-27 13:13:35",
            "endTime": "2026-01-29 00:00:00",
            "isRecurring": true,
            "status": "active"
        }
        */
      }
    },
    async checkRecordingStatus () {
      const response = await getRecordingStatus()
      if (response.current) {
        this.currentRecording = response.current
        this.isRecording = true
      } else {
        this.currentRecording = null
        this.isRecording = false
      }
    },
    async startRecording () {
      if (!this.recordForm.url) {
        this.$message.error('请输入直播地址')
        return
      }
      // 验证地址是否为FLV或HLS格式
      await startRecording({
        url: this.recordForm.url,
        name: this.recordForm.name
      })
      this.recordForm.url = ''
      this.recordForm.name = ''
    },
    async stopRecordingHandel () {
      if (this.currentRecording) {
        const response = await stopRecording({
          id: this.currentRecording.id
        })
        console.log(response)
        this.$message.success('录制已停止')
        this.currentRecording = null
        this.isRecording = false
      }
    },
    async loadCompletedRecordings () {
      const response = await getCompletedRecordings()
      console.log(response)
      this.completedRecordings = response
    },
    async addSchedule () {
      if (!this.scheduleForm.url || !this.scheduleForm.startTime) {
        this.$message.error('请填写完整信息')
        return
      }
      const response = await addSchedule({
        url: this.scheduleForm.url,
        name: this.scheduleForm.name,
        startTime: this.scheduleForm.startTime,
        endTime: this.scheduleForm.endTime,
        isRecurring: this.scheduleForm.isRecurring
      })

      console.log(response)
      this.$message.success('定时任务已添加')
      this.schedules.push(response.schedule)
      this.scheduleForm = {
        url: '',
        name: '',
        startTime: '',
        endTime: '',
        isRecurring: false
      }
    },
    async removeSchedule (id) {
      this.$confirm('确定要删除这个定时任务吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        const response = await removeSchedule({
          id
        })
        console.log(response)
        this.schedules = this.schedules.filter(s => s.id !== id)
        this.$message.success('定时任务已删除')
      }).catch(() => { })
    },
    async loadSchedules () {
      const response = await getSchedules()
      this.schedules = response
    },
    async removeCompletedHandel (id) {
      this.$confirm('确定要删除这个已完成录制吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        const response = await removeCompleted({
          id
        })
        console.log(response)
        this.completedRecordings = this.completedRecordings.filter(r => r.id !== id)
        this.$message.success('已完成录制已删除')
      }).catch(() => { })
    },
    watchRecordingHandel () {
      this.$router.push({
        path: '/watch',
        query: {
          isLive: true,
          url: encodeURIComponent(this.currentRecording.url)
        }
      })
    },
    completedWatchHandel (playbackUrl) {
      // 获取当前URL地址
      const currentUrl = getBaseApi()
      this.$router.push({
        path: '/watch',
        query: {
          isLive: false,
          url: encodeURIComponent(`${currentUrl}${playbackUrl}`)
        }
      })
    }
  }
}
</script>

<style>
.recording-status {
  padding: 20px;
  background-color: #f0f9eb;
  border-radius: 4px;
}

.no-recording {
  padding: 40px 0;
}
</style>
