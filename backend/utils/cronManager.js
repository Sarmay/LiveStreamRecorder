const { CronJob } = require('cron');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const recordingManager = require('./recordingManager');

const schedules = new Map();

function addSchedule (config, ws) {
  const id = uuidv4();

  const startTime = moment(config.startTime);
  const endTime = config.endTime ? moment(config.endTime) : null;
  const now = moment();

  let job;

  // 任务是否在过期时间之前
  const isPast = startTime.isBefore(now);

  if (config.isRecurring) {
    const cronTime = `${startTime.second()} ${startTime.minute()} ${startTime.hour()} * * ${startTime.day()}`;
    console.log('创建带有cron时间的重复作业:', cronTime);

    job = new CronJob(cronTime, () => {
      console.log('重复作业触发:', id);
      const recording = recordingManager.startRecording({
        url: config.url,
        name: config.name
      }, ws);

      if (endTime) {
        const duration = endTime.diff(startTime, 'minutes');
        console.log('重复作业过期时间:', duration, '分钟');
        setTimeout(() => {
          recordingManager.stopRecording(recording.id);
        }, duration * 60 * 1000);
      }
    });

    // 如果任务在过期时间之前，立即运行
    if (isPast) {
      console.log('任务立即运行:', id);
      const recording = recordingManager.startRecording({
        url: config.url,
        name: config.name
      }, ws);

      if (endTime) {
        const duration = endTime.diff(now, 'milliseconds');
        if (duration > 0) {
          console.log('任务过期时间:', duration, '毫秒');
          setTimeout(() => {
            recordingManager.stopRecording(recording.id);
          }, duration);
        }
      }
    }
  } else {
    const delay = startTime.diff(now, 'milliseconds');
    console.log('任务延迟时间:', delay, '毫秒');

    if (delay > 0) {
      setTimeout(() => {
        console.log('任务触发:', id);
        const recording = recordingManager.startRecording({
          url: config.url,
          name: config.name
        }, ws);

        if (endTime) {
          const duration = endTime.diff(moment(), 'milliseconds');
          console.log('任务过期时间:', duration, '毫秒');
          setTimeout(() => {
            recordingManager.stopRecording(recording.id);
          }, duration);
        }
      }, delay);
    } else {
      console.log('任务立即运行:', id);
      const recording = recordingManager.startRecording({
        url: config.url,
        name: config.name
      }, ws);

      if (endTime) {
        const duration = endTime.diff(now, 'milliseconds');
        if (duration > 0) {
          console.log('任务过期时间:', duration, '毫秒');
          setTimeout(() => {
            recordingManager.stopRecording(recording.id);
          }, duration);
        }
      }
    }
  }

  const schedule = {
    id,
    name: config.name || 'Scheduled Recording',
    url: config.url,
    startTime: config.startTime,
    endTime: config.endTime,
    isRecurring: config.isRecurring || false,
    status: 'active',
    job
  };

  if (job) {
    console.log('重复作业启动:', id);
    job.start();
  }

  schedules.set(id, schedule);
  console.log('任务添加成功:', id);

  const responseSchedule = {
    id,
    name: schedule.name,
    url: schedule.url,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    isRecurring: schedule.isRecurring,
    status: schedule.status
  };

  if (ws) {
    ws.send(JSON.stringify({
      type: 'SCHEDULE_ADDED',
      payload: responseSchedule
    }));
  }

  return responseSchedule;
}

function removeSchedule (id) {
  const schedule = schedules.get(id);
  if (!schedule) {
    return { success: false, message: '任务不存在'  };
  }

  if (schedule.job) {
    schedule.job.stop();
  }

  schedules.delete(id);

  return { success: true, message: '任务删除成功'  };
}

function getAllSchedules () {
  return Array.from(schedules.values()).map(schedule => ({
    id: schedule.id,
    name: schedule.name,
    url: schedule.url,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    isRecurring: schedule.isRecurring,
    status: schedule.status
  }));
}

module.exports = {
  addSchedule,
  removeSchedule,
  getAllSchedules
};
