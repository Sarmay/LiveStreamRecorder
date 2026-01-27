const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const moment = require('moment');
const cookieParser = require('cookie-parser');
const expressWs = require("express-ws")(app); 

const indexRouter = require('./routes/index');
const apisRouter = require('./routes/apis');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// 添加recordings目录的静态文件服务
app.use('/recordings', express.static(path.join(__dirname, 'recordings')));
// 同时支持/api/recordings路径，解决前端可能添加/api前缀的问题
app.use('/api/recordings', express.static(path.join(__dirname, 'recordings')));

const port = 3000;

// 统一响应中间件
app.use("*", (req, res, next) => {
  // 检测是否为 WebSocket 请求，如果是则跳过
  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    return next();
  }

  // 添加统一响应方法
  res.success = function (data = null, message = "成功") {
    this.json({
      code: 200,
      message: message,
      data: data
    });
  };

  next();
});

app.use("*", (req, res, next) => {
  // 检测是否为 WebSocket 请求，如果是则跳过日志
  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    return next();
  }

  const startTime = new Date();
  const requestTime = moment().format('YYYY-MM-DD HH:mm:ss');
  const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null);
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 构建请求日志字符串
  const requestLog = `\n========================================\n` +
    `请求ID: ${requestId}\n` +
    `请求时间: ${requestTime}\n` +
    `客户端IP: ${clientIp}\n` +
    `请求方法: ${req.method}\n` +
    `请求URL: ${req.originalUrl}\n` +
    `查询参数: ${JSON.stringify(req.query, null, 2)}\n` +
    `请求体: ${JSON.stringify(req.body, null, 2)}\n` +
    `----------------------------------------`;

  console.log(requestLog);

  // 监听响应完成事件以记录返回信息
  const originalSend = res.send;
  let responseSent = false;

  res.send = function (body) {
    if (responseSent) {
      return originalSend.call(this, body);
    }
    responseSent = true;

    const endTime = new Date();
    const duration = endTime - startTime;

    // 构建响应日志字符串
    const responseLog = `响应ID: ${requestId}\n` +
      `响应状态: ${res.statusCode}\n` +
      `响应体: ${typeof body === 'string' ? body : JSON.stringify(body, null, 2)}\n` +
      `响应耗时: ${duration}ms\n` +
      `========================================\n`;

    console.log(responseLog);

    return originalSend.call(this, body);
  };

  next();
});

app.use('/', indexRouter);
app.use('/api', apisRouter);

app.use("*", async (req, res) => {
  res.status(404).json({
    code: 404,
    message: "未找到接口：" + req.originalUrl,
    data: null
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    code: 500,
    message: err.message,
    data: null
  });
});

// 全局错误处理器，捕获未处理的错误
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

app.listen(port, () => {
  console.log(
    `应用正在运行在 \nhttp://127.0.0.1:${port}`,
  );
});
