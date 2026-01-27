const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const recordingsDir = path.join(__dirname, '../recordings');

const recordings = new Map();

function createRecordingsDir () {
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }
}

function startRecording (config, ws) {
  createRecordingsDir();
  const id = uuidv4();
  const startTime = moment().format('YYYY-MM-DD_HH-mm-ss');
  const filename = `${config.name || 'recording'}_${startTime}.mp4`;
  const outputPath = path.join(recordingsDir, filename);

  const recording = {
    id,
    name: config.name || 'Recording',
    url: config.url,
    outputPath,
    filename,
    startTime: new Date(),
    endTime: null,
    status: 'recording',
    duration: 0,
    size: 0,
    ws
  };

  const ffmpegProcess = ffmpeg(config.url)
    .inputOptions(['-re', '-timeout', '5000000'])
    .outputOptions(['-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k'])
    .output(outputPath)
    .on('start', (commandLine) => {
      console.log(`FFmpeg started: ${commandLine}`);
      const currentRecording = {
        id,
        name: config.name || 'started',
        url: config.url,
        outputPath,
        filename,
        startTime: recording.startTime,
        endTime: null,
        status: 'started',
        duration: 0,
        size: 0,
        ffmpegProcess,
        ws
      };
      recordings.set(id, currentRecording);

      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'RECORDING_STARTED',
          payload: {
            id,
            name: currentRecording.name,
            url: currentRecording.url,
            startTime: currentRecording.startTime,
            endTime: currentRecording.endTime,
            status: currentRecording.status,
            duration: currentRecording.duration,
            size: currentRecording.size,
            commandLine
          }
        }));
      }
    })
    .on('progress', (progress) => {
      const currentRecording = recordings.get(id);
      if (currentRecording) {
        currentRecording.duration = progress.timemark || '00:00:00';
        currentRecording.status = 'recording';

        try {
          const stats = fs.statSync(outputPath);
          currentRecording.size = stats.size;
        } catch (e) {
          currentRecording.size = 0;
        }

        recordings.set(id, currentRecording);

        if (currentRecording.ws && currentRecording.ws.readyState === 1) {
          currentRecording.ws.send(JSON.stringify({
            type: 'RECORDING_PROGRESS',
            payload: {
              id,
              url: currentRecording.url,
              name: currentRecording.name,
              duration: currentRecording.duration,
              size: currentRecording.size,
              status: currentRecording.status
            }
          }));
        }
      }
    })
    .on('end', () => {
      const currentRecording = recordings.get(id);
      if (currentRecording) {
        currentRecording.status = 'completed';
        currentRecording.endTime = new Date();

        try {
          const stats = fs.statSync(outputPath);
          currentRecording.size = stats.size;
        } catch (e) {
          currentRecording.size = 0;
        }

        if (currentRecording.ws && currentRecording.ws.readyState === 1) {
          currentRecording.ws.send(JSON.stringify({
            type: 'RECORDING_COMPLETED',
            payload: {
              id,
              url: currentRecording.url,
              name: currentRecording.name,
              status: currentRecording.status,
              endTime: currentRecording.endTime,
              duration: currentRecording.duration,
              size: currentRecording.size
            }
          }));
        }
      }

      recordings.delete(id);
    })
    .on('error', (err) => {
      const currentRecording = recordings.get(id);
      if (currentRecording) {
        currentRecording.status = 'error';
        currentRecording.error = err.message;
        currentRecording.endTime = new Date();
        console.error('FFmpeg error:', err.message);

        if (currentRecording.ws && currentRecording.ws.readyState === 1) {
          currentRecording.ws.send(JSON.stringify({
            type: 'RECORDING_ERROR',
            payload: {
              id,
              url: currentRecording.url,
              name: currentRecording.name,
              status: currentRecording.status,
              endTime: currentRecording.endTime,
              error: err.message
            }
          }));
        }
      }
      recordings.delete(id);
    });

  ffmpegProcess.run();

  return recording;
}

function stopRecording (id) {
  const recording = recordings.get(id);
  if (!recording) {
    return { success: false, message: 'Recording not found' };
  }

  if (recording.ffmpegProcess) {
    try {
      recording.ffmpegProcess.kill('SIGINT');
    } catch (e) {
      console.error('Error stopping FFmpeg process:', e.message);
    }
    recording.status = 'stopped';
    recording.endTime = new Date();
    recording.size = 0;
    recording.duration = 0;
    recording.ffmpegProcess = null;
  }
  if (recording.ws && recording.ws.readyState === 1) {
    recording.ws.send(JSON.stringify({
      type: 'RECORDING_STOPPED',
      payload: {
        id,
        url: recording.url,
        name: recording.name,
        status: recording.status,
        endTime: recording.endTime,
        duration: recording.duration,
        size: recording.size
      }
    }));
  }

  recordings.delete(id);

  return { success: true, message: 'Recording stopped' };
}

function getAllRecordings () {
  return Array.from(recordings.values()).map(rec => ({
    id: rec.id,
    name: rec.name,
    url: rec.url,
    filename: rec.filename,
    startTime: rec.startTime,
    status: rec.status,
    duration: rec.duration,
    size: rec.size
  }));
}

function updateWebSocketConnections (ws) {
  recordings.forEach(recording => {
    recording.ws = ws;
  });
}

function getCompletedRecordings () {
  createRecordingsDir();
  const files = fs.readdirSync(recordingsDir);
  const completedRecordings = [];

  files.forEach(filename => {
    if (filename.endsWith('.mp4')) {
      const filePath = path.join(recordingsDir, filename);
      const stats = fs.statSync(filePath);
      
      // 检查文件是否正在被录制（通过检查是否在recordings Map中）
      const isRecording = Array.from(recordings.values()).some(rec => 
        rec.outputPath === filePath
      );
      
      // 只添加未在录制中的文件
      if (!isRecording) {
        // 从文件名中提取信息
        const nameMatch = filename.match(/^(.*?)_([0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2})\.mp4$/);
        const name = nameMatch ? nameMatch[1] : 'Recording';
        const startTimeStr = nameMatch ? nameMatch[2] : '';
        const startTime = startTimeStr ? new Date(startTimeStr.replace('_', ' ').replace(/-/g, ':').replace(':', '-', 2)) : new Date(stats.birthtime);

        // 获取视频时长
        let duration = 0;
        try {
          // 使用ffprobe命令获取视频时长
          const cmd = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`;
          const output = execSync(cmd, { encoding: 'utf8' }).trim();
          duration = Math.round(parseFloat(output));
        } catch (error) {
          console.error('Error getting video duration:', error.message);
          duration = 0;
        }

        completedRecordings.push({
          id: filename.replace('.mp4', ''),
          name,
          filename,
          startTime,
          endTime: new Date(stats.mtime),
          status: 'completed',
          duration,
          size: stats.size,
          filePath,
          // 生成本地播放地址
          playbackUrl: `/recordings/${filename}`
        });
      }
    }
  });

  // 按时间倒序排列
  completedRecordings.sort((a, b) => b.startTime - a.startTime);

  return completedRecordings;
}

function removeCompletedRecordings(id){
  const filePath = path.join(recordingsDir, `${id}.mp4`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return { success: true, message: 'Completed recording removed' };
}

module.exports = {
  startRecording,
  stopRecording,
  getAllRecordings,
  getCompletedRecordings,
  removeCompletedRecordings,
  updateWebSocketConnections
};
