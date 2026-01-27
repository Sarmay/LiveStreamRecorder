const express = require('express');
const router = express.Router();
const recordingManager = require('../utils/recordingManager');
const cronManager = require('../utils/cronManager');


let recordingStatus = {
  current: null,
  progress: []
};

let schedules = [];

let wxClient = null;

router.ws("/ws", (ws, req) => {
  wxClient = ws;
  console.log("WebSocket连接成功");

  // 更新所有活动录音任务的WebSocket连接
  recordingManager.updateWebSocketConnections(ws);

  ws.send("pong");

  ws.on("message", function (msg) {
    if (wxClient && wxClient.readyState === 1) {
      wxClient.send("pong"); // 发送消息
    }
  });

  ws.on("ping", function () {
    if (wxClient && wxClient.readyState === 1) {
      wxClient.send("pong"); // 发送 pong 响应
    }
  });

  ws.on("close", function () {
    console.log("连接关闭");
    wxClient = null; // 清空 wxClient
  });

  ws.on("error", function (error) {
    console.error("WebSocket错误:", error);
    wxClient = null; // 清空 wxClient
  });
});

// start-recording
router.post('/start-recording', async function (req, res, next) {
  const { url, name } = req.body;
  if (wxClient) {
    await recordingManager.startRecording({ url, name }, wxClient);
    res.success(null, 'Recording started');
  } else {
    res.json({
      code: 400,
      message: 'WebSocket not connected',
      data: null
    });
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



router.post('/add-schedule', async (req, res) => {
  if (wxClient) {
    const schedule = await cronManager.addSchedule(req.body, wxClient);
    res.success(schedule);
  } else {
    res.json({
      code: 400,
      message: 'WebSocket not connected',
      data: null
    });
  }
});

router.post('/remove-schedule', (req, res) => {
  const { id } = req.body;
  const result = cronManager.removeSchedule(id);
  schedules = schedules.filter(s => s.id !== id);
  res.success(result);
});

router.get('/schedules', (req, res) => {
  const allSchedules = cronManager.getAllSchedules();
  res.success(allSchedules);
});

module.exports = router;
