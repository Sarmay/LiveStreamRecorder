const { CronJob } = require('cron');
const moment = require('moment');
const recordingManager = require('./recordingManager');

const schedules = new Map();

function createValidationError (message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function toResponseSchedule (schedule) {
  return {
    id: schedule.id,
    name: schedule.name,
    url: schedule.url,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    isRecurring: schedule.isRecurring,
    status: schedule.status
  };
}

function addStopTimer (schedule, recording, delay) {
  if (!delay || delay <= 0) {
    return;
  }

  const timer = setTimeout(() => {
    schedule.stopTimers.delete(timer);
    recordingManager.stopRecording(recording.id);
  }, delay);

  schedule.stopTimers.add(timer);
}

async function startScheduledRecording (schedule, ws, stopDelay) {
  const recording = await recordingManager.startRecording({
    url: schedule.url,
    name: schedule.name
  }, ws);

  addStopTimer(schedule, recording, stopDelay);
  return recording;
}

async function addSchedule (config, ws) {
  const { v4: uuidv4 } = await import('uuid');
  const id = uuidv4();

  const startTime = moment(config.startTime);
  const endTime = config.endTime ? moment(config.endTime) : null;
  const now = moment();

  if (!startTime.isValid()) {
    throw createValidationError('开始时间无效');
  }

  if (endTime && (!endTime.isValid() || !endTime.isAfter(startTime))) {
    throw createValidationError('结束时间必须晚于开始时间');
  }

  if (!config.isRecurring && endTime && endTime.isBefore(now)) {
    throw createValidationError('结束时间不能早于当前时间');
  }

  const schedule = {
    id,
    name: config.name || 'Scheduled Recording',
    url: config.url,
    startTime: config.startTime,
    endTime: config.endTime,
    isRecurring: config.isRecurring || false,
    status: 'active',
    job: null,
    startTimer: null,
    stopTimers: new Set()
  };

  schedules.set(id, schedule);

  if (config.isRecurring) {
    const cronTime = `${startTime.second()} ${startTime.minute()} ${startTime.hour()} * * ${startTime.day()}`;
    console.log('创建带有cron时间的重复作业:', cronTime);

    schedule.job = new CronJob(cronTime, async () => {
      console.log('重复作业触发:', id);
      const duration = endTime ? endTime.diff(startTime, 'milliseconds') : null;
      await startScheduledRecording(schedule, ws, duration);
    });

    // 如果任务在过期时间之前，立即运行
    if (startTime.isBefore(now) && (!endTime || endTime.isAfter(now))) {
      console.log('任务立即运行:', id);
      const duration = endTime ? endTime.diff(now, 'milliseconds') : null;
      await startScheduledRecording(schedule, ws, duration);
    }
  } else {
    const delay = startTime.diff(now, 'milliseconds');
    console.log('任务延迟时间:', delay, '毫秒');

    if (delay > 0) {
      schedule.startTimer = setTimeout(async () => {
        schedule.startTimer = null;
        if (!schedules.has(id)) {
          return;
        }

        console.log('任务触发:', id);
        const duration = endTime ? endTime.diff(moment(), 'milliseconds') : null;
        await startScheduledRecording(schedule, ws, duration);
      }, delay);
    } else {
      console.log('任务立即运行:', id);
      const duration = endTime ? endTime.diff(now, 'milliseconds') : null;
      await startScheduledRecording(schedule, ws, duration);
    }
  }

  if (schedule.job) {
    console.log('重复作业启动:', id);
    schedule.job.start();
  }

  console.log('任务添加成功:', id);

  const responseSchedule = toResponseSchedule(schedule);

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

  if (schedule.startTimer) {
    clearTimeout(schedule.startTimer);
    schedule.startTimer = null;
  }

  schedules.delete(id);

  return { success: true, message: '任务删除成功'  };
}

function getAllSchedules () {
  return Array.from(schedules.values()).map(toResponseSchedule);
}

module.exports = {
  addSchedule,
  removeSchedule,
  getAllSchedules
};
