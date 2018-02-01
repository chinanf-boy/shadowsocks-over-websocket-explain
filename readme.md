# shadowsocks-over-websocket

免费使用 `Heroku` 部署 `shadowsocks`

[![explain](http://llever.com/explain.svg)](https://github.com/chinanf-boy/Source-Explain)
    
Explanation

> "version": "1.0.0"

[github source](https://github.com/VincentChanX/shadowsocks-over-websocket)

~~[english](./README.en.md)~~

---

shadowsocks 的实现不再少数-分 [本地](./shadowsocks-over-websocket/local.js) 和 [服务器](./shadowsocks-over-websocket/server.js)

> 不过这次，见猎心喜-似乎写得很漂亮

---

## 目录

- [👨server.js](#服务器-server)

- [👧local.js](#本地-local)

- [协议主代码-tcprelay](./tcprelay.readme.md)

- [其他](#其他)

---

## 服务器-server

[server.js](./shadowsocks-over-websocket/server.js)

### require-导入

代码 1-6

``` js
const TCPRelay = require('./tcprelay').TCPRelay; 
// 协议主内容，后续
const server = require('commander'); // 命令解析
const constants = require('./constants'); // 版本
const throng = require('throng'); 
// 集群化Node.js应用程序的简单工作管理器 
const log4js = require('log4js'); // 日志记录
// log4js 包含 node 与 browser, 而这个
// 去掉了浏览器部分，只专注-node

const logger = log4js.getLogger('server');
// 新建-server-示例
```

- constants

``` js
const VERSION = '0.1.8';

module.exports.VERSION = VERSION;
```

---

### commander-命令解析

代码 8-16

``` js
server
    .version(constants.VERSION)
    .option('-m --method <method>', 'encryption method, default: aes-256-cfb')
    .option('-k --password <password>', 'password')
    .option('-s --server-address <address>', 'server address')
    .option('-p --server-port <port>', 'server port, default: 8388')
    .option('--log-level <level>', 'log level(debug|info|warn|error|fatal)', /^(debug|info|warn|error|fatal)$/i, 'info')
    .option('--log-file <file>', 'log file')
    .parse(process.argv);
```

配置选项-commander > 会把 `--server-address ` --> `server.serverAddress`

- `method` > 密码加密方式

- `password` > 密码

- `serverPort` > 服务器端口 「 heroku 的 端口 转移-> 80 」

- `serverAddress` > 服务器网址 「 xxx.herokuapp.com 」

- `logLevel` > 日志等级

- `logFile` > 日志文件

---

### 任务管理-throng

`throng` 可以多进程运作

代码 18-22

``` js
throng({
    workers: process.env.WEB_CONCURRENCY || 1,
    master: startMaster,
    start: startWorker
});
```

- `workers` > 进程数量

- `startMaster` > 主进程 

``` js
function startMaster() {
    logger.info('started master');
}
```

- [`startWorker` > 子进程](#子进程-startWorker)

---

## 子进程-startWorker

``` js
function startWorker(id) {
    logger.info(`started worker ${id}`);
    var relay = new TCPRelay({
        serverAddress: process.env['SERVER_ADDRESS'] || server.serverAddress || '127.0.0.1',
        serverPort: process.env['PORT'] || server.serverPort || 8388,
        password: process.env['PASSWORD'] || server.password || 'shadowsocks-over-websocket',
        method: process.env['METHOD'] || server.method || 'aes-256-cfb'
    }, false);

    relay.setLogLevel(server.logLevel);
    relay.setLogFile(server.logFile);
    relay.setServerName('server-' + id);
    relay.bootstrap();
}
```

- [`TCPRelay` > socks-协议](./tcprelay.readmd.md)

---


---

## 本地-local

[local.js](./shadowsocks-over-websocket/local.js)

### require-commander

代码 1-15

``` js
const TCPRelay = require('./tcprelay').TCPRelay;
const local = require('commander'); // 命令解析
const constants = require('./constants'); // 版本

local
    .version(constants.VERSION)
    .option('-m --method <method>', 'encryption method, default: aes-256-cfb')
    .option('-k --password <password>', 'password')
    .option('-s --server-address <address>', 'server address')
    .option('-p --server-port <port>', 'server port, default: 8388')
    .option('-b --local-address <address>', 'local binding address, default: 127.0.0.1')
    .option('-l --local-port <port>', 'local port, default: 1080')
    .option('--log-level <level>', 'log level(debug|info|warn|error|fatal)', /^(debug|info|warn|error|fatal)$/i, 'info')
    .option('--log-file <file>', 'log file')
    .parse(process.argv);
```


- `method` > 密码加密方式

- `password` > 密码

- `serverPort` > 服务器端口 「 heroku 的 端口 转移-> 80 」

- `serverAddress` > 服务器网址 「 xxx.herokuapp.com 」

- `logLevel` > 日志等级

- `logFile` > 日志文件

- `localAddress` > 本地网址 - `127.0.0.1`

- `localPort` > 本地端口

---

### socks-协议

代码 17-27

``` js
var relay = new TCPRelay({
    localAddress: local.localAddress || '127.0.0.1',
    localPort: local.localPort || 1080,
    serverAddress: local.serverAddress || '127.0.0.1',
    serverPort: local.serverPort || 8388,
    password: local.password || 'shadowsocks-over-websocket',
    method: local.method || 'aes-256-cfb'
}, true);
relay.setLogLevel(local.logLevel);
relay.setLogFile(local.logFile);
relay.bootstrap();
```

- [`TCPRelay` > socks-协议](./tcprelay.readmd.md)

---

## 其他

- [throng 多进程开启](https://github.com/hunterloftis/throng)

- [log4js 日志记录](https://github.com/log4js-node/log4js-node)