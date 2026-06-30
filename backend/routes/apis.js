const express = require('express');
const router = express.Router();
const recordingManager = require('../utils/recordingManager');
const cronManager = require('../utils/cronManager');

const wsClients = new Set();

const broadcastSocket = {
  get readyState () {
    return wsClients.size > 0 ? 1 : 0;
  },
  send (message) {
    wsClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }
};

router.ws("/ws", (ws, req) => {
  wsClients.add(ws);
  console.log("WebSocket连接成功");

  // 更新所有活动录音任务的WebSocket连接
  recordingManager.updateWebSocketConnections(broadcastSocket);

  ws.send("pong");

  ws.on("message", function (msg) {
    if (ws.readyState === 1) {
      ws.send("pong"); // 发送消息
    }
  });

  ws.on("ping", function () {
    if (ws.readyState === 1) {
      ws.send("pong"); // 发送 pong 响应
    }
  });

  ws.on("close", function () {
    console.log("连接关闭");
    wsClients.delete(ws);
  });

  ws.on("error", function (error) {
    console.error("WebSocket错误:", error);
    wsClients.delete(ws);
  });
});

// start-recording
router.post('/start-recording', async function (req, res, next) {
  const { url, name } = req.body;
  if (!url) {
    return res.status(400).json({
      code: 400,
      message: '直播地址不能为空',
      data: null
    });
  }

  try {
    const recording = await recordingManager.startRecording({ url, name }, broadcastSocket);
    res.success(recording, 'Recording started');
  } catch (error) {
    next(error);
  }
});

router.post('/stop-recording', (req, res) => {
  const { id } = req.body;
  const result = recordingManager.stopRecording(id);
  res.success(result);
});

router.get('/recordings', (req, res) => {
  const recordings = recordingManager.getAllRecordings();
  res.success(recordings);
});

router.get('/recording-status', (req, res) => {
  const currentRecordings = recordingManager.getAllRecordings();
  const status = {
    current: currentRecordings.length > 0 ? currentRecordings[0] : null,
    progress: currentRecordings
  };
  res.success(status);
});

router.get('/completed-recordings', (req, res) => {
  const completedRecordings = recordingManager.getCompletedRecordings();
  res.success(completedRecordings);
});

router.post('/remove-completed-recordings', (req, res) => {
  const { id } = req.body;
  const result = recordingManager.removeCompletedRecordings(id);
  res.success(result);
});



router.post('/add-schedule', async (req, res, next) => {
  if (!req.body.url || !req.body.startTime) {
    return res.status(400).json({
      code: 400,
      message: '请填写直播地址和开始时间',
      data: null
    });
  }

  try {
    const schedule = await cronManager.addSchedule(req.body, broadcastSocket);
    res.success(schedule);
  } catch (error) {
    next(error);
  }
});

router.post('/remove-schedule', (req, res) => {
  const { id } = req.body;
  const result = cronManager.removeSchedule(id);
  res.success(result);
});

router.get('/schedules', (req, res) => {
  const allSchedules = cronManager.getAllSchedules();
  res.success(allSchedules);
});

module.exports = router;
