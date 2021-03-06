# 协议主代码-tcprelay

免费使用 `Heroku` 部署 `shadowsocks`

[![explain](http://llever.com/explain.svg)](https://github.com/chinanf-boy/Source-Explain)
    
Explanation

> "version": "1.0.0"

[github source](https://github.com/VincentChanX/shadowsocks-over-websocket)

~~[english](./README.en.md)~~

---

## 本目录

- [tcprelay-使用](#tcprelay-使用)

- [tcprelay-require-导入](#tcprelay-require)

- [tcprelay-tcprelay-实例](#tcprelay-tcprelay)

- [tcprelay-生命周期-bootstrap](#tcprelay-生命周期-bootstrap)

- [initserver-local - 本地的初始化](#initserver-local)

- [handleconnectionbylocal - 本地连接成功触发事件](#handleconnectionbylocal)

- [initserver-server - 服务器端初始化](#initserver-server)

- [handleConnectionByServer - 连接成功触发事件](#handleconnectionbyserver)

- [tcprelay-生命周期-stop](#tcprelay-生命周期-stop)

- [tcprelay-其他-prototype](#tcprelay-其他-prototype)

- [其他](#其他)

---
## TCPRelay-使用

[server.js](./shadowsocks-over-websocket/server.js#L28)

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

[local.js](./shadowsocks-over-websocket/local.js#L17)

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

---

看来-服务器端与本地端口的应用-都是-`TCPRelay`-的使用

[tcprelay.js](./shadowsocks-over-websocket/tcprelay.js)

## tcprelay-require

代码 1-6

``` js
const net = require('net');
const path = require('path');
const log4js = require('log4js');
const WebSocket = require('ws');
const Encryptor = require('shadowsocks/lib/shadowsocks/encrypt').Encryptor;
const WSErrorCode = require('ws/lib/ErrorCodes');
```

- net

> net 模块提供了创建基于流的 TCP 或 IPC 服务器(net.createServer())和客户端(net.createConnection()) 的异步网络 API。

- path

> path 模块提供了一些工具函数，用于处理文件与目录的路径。可以通过以下方式使用

- [ws](#其他)

> 简单易用，为Node.js快速且经过彻底测试的WebSocket客户端和服务器

- [Encryptor](#其他)

> shadowsocks-官方加密

- WSErrorCode

> 错误-问题

---

## tcprelay-TCPRelay

``` js
function TCPRelay(config, isLocal) {
	this.isLocal = isLocal;
	this.server = null;
	this.status = SERVER_STATUS_INIT;
	this.config = require('./config.json');
	if (config) {
		this.config = Object.assign(this.config, config);
	}
	this.logger = null;
	this.logLevel = 'error';
	this.logFile = null;
	this.serverName = null;
}
```

> [`config的覆盖例子`](#config-例子)

我们先看 `local.js` 的使用

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

- 用户-输出配置

``` js
// config
{
    localAddress: local.localAddress || '127.0.0.1',
    localPort: local.localPort || 1080,
    serverAddress: local.serverAddress || '127.0.0.1',
    serverPort: local.serverPort || 8388,
    password: local.password || 'shadowsocks-over-websocket',
    method: local.method || 'aes-256-cfb'
}
```

``` js
	this.config = require('./config.json'); // 默认配置
	if (config) { // config
		this.config = Object.assign(this.config, config);
    }
    // this.config -> 最终配置
```

- 设置日志

``` js
relay.setLogLevel(local.logLevel); // 设置日志等级
relay.setLogFile(local.logFile); // 设置日志文件
```

- [开始-tcprelay-生命周期-bootstrap](#tcprelay-生命周期-bootstrap)

``` js
relay.bootstrap();
```

---

先看- `local.js` -先

`function TCPRelay(config, isLocal)` <--

在 local.js 中 - `isLocal == false` <--


---
## tcprelay-生命周期-bootstrap

``` js
relay.bootstrap();
```

``` js
TCPRelay.prototype.bootstrap = function() {
    this.initLogger(); // 实行日志
	return this.initServer(); // 初始化服务器
};

```

---

### ws-try

⏰为了更好了解-`ws` 的传输，可以运行 -ws-try- 例子

`npm run server`

在另一个终端上

`npm run local`

❤️[一些基础 ruanyifeng-WebSocket 教程](http://www.ruanyifeng.com/blog/2017/05/websocket.html)

### net-createServer-try


### net-createConnection-try

---

### initServer-local

代码 159-202

``` js
TCPRelay.prototype.initServer = function() {
	var self = this;
	return new Promise(function(resolve, reject) {
		var config = self.config;
		var port = self.isLocal ? config.localPort : config.serverPort;
		var address = self.isLocal ? config.localAddress : config.serverAddress;
		var server;

		if (self.isLocal) { // 本地
			server = self.server = net.createServer({
				allowHalfOpen: true,
			});
			server.maxConnections = MAX_CONNECTIONS;
			server.on('connection', function(connection) {
				return self.handleConnectionByLocal(connection);
			});
			server.on('close', function() {
				self.logger.info('server is closed');
				self.status = SERVER_STATUS_STOPPED;
			});
			server.listen(port, address);
        }
        //  else {
		// 	server = self.server = new WebSocket.Server({
		// 		host: address,
		// 		port: port,
		// 		perMessageDeflate: false,
		// 		backlog: MAX_CONNECTIONS
		// 	});
		// 	server.on('connection', function(connection) {
		// 		return self.handleConnectionByServer(connection);
		// 	});
		// }
		server.on('error', function(error) {
			self.logger.fatal('an error of', self.getServerName(), 'occured', error);
			self.status = SERVER_STATUS_STOPPED;
			reject(error);
		}); // 错误事件-退出-Primise
		server.on('listening', function() {
			self.logger.info(self.getServerName(), 'is listening on', address + ':' + port);
			self.status = SERVER_STATUS_RUNNING;
			resolve();
		}); // 进程-监听
	});
};
```

- [net.createServer](http://nodejs.cn/api/net.html#net_net_createserver_options_connectionlistener)

> [创建一个新的TCP或IPC服务。 >> 可以看看例子](#net-createserver-try)

- `allowHalfOpen` <boolean> 表示是否允许一个半开的TCP连接。 

> 如果 allowHalfOpen 被设置为true, 那么当socket.end() 被显式调用时, 如果对边套接字发送了一个FIN包，服务只会返回一个FIN数据包， 这会持续到后来连接处在半闭状态 (不可读但是可写)。

- `server.maxConnections`

> 设置该属性使得当 server 连接数过多时拒绝连接。

- `server.on('connection'`

> 当一个新的connection建立的时候触发. 

- [self.handleConnectionByLocal(connection)](#handleconnectionbylocal)

> 本地-connection-建立-触发事件

- `server.listen(port, address)`

> 为 connections 启动一个 server 监听. 一个 net.Server 可以是一个 TCP 或者 一个 IPC server，这取决于它监听什么。

---

## handleConnectionByLocal

> [tcprelay-parseAddressHeader 解析-传输头数据->整理->规范数据](#tcprelay-parseaddressheader)

本地的服务端

- 用`net.createServer`获取需要浏览的网页数据 - [可以看看例子](#ws-try)

- 用`encryptor`加密

- 用`new WebSocket`发送-服务器端-`ws` - [可以看看例子](#ws-try)

代码 316-444

``` js
TCPRelay.prototype.handleConnectionByLocal = function(connection) {
	// 注意-本地是监听-net.createServer

	// 初始化 配置
	var self = this;
	var config = self.config;
	var method = config.method;
	var password = config.password;
	var serverAddress = config.serverAddress;
	var serverPort = config.serverPort;
	var logger = self.logger;
	var encryptor = new Encryptor(password, method);

	// STAGE_INIT == 0
	var stage = STAGE_INIT;
	// globalConnectionId == 1
	// MAX_CONNECTIONS == 50000
	var connectionId = (globalConnectionId++) % MAX_CONNECTIONS;
	var serverConnection, cmd, addressHeader;

	var canWriteToLocalConnection = true;
	var dataCache = [];

	logger.info(`[${connectionId}]: accept connection from client`);
	// connections = {};
	connections[connectionId] = connection;
	connection.setKeepAlive(false);
	connection.on('data', function(data) {
		logger.debug(`[${connectionId}]: read data[length = ${data.length}] from client connection at stage[${STAGE[stage]}]`);
	// 	const STAGE = {
	// 	[-1]: 'STAGE_DESTROYED',
	// 	0: 'STAGE_INIT',
	// 	1: 'STAGE_ADDR',
	// 	2: 'STAGE_UDP_ASSOC',
	// 	3: 'STAGE_DNS',
	// 	4: 'STAGE_CONNECTING',
	// 	5: 'STAGE_STREAM'
	// };
		switch (stage) {

			case STAGE_INIT: // 初始化
				if (data.length < 3 || data.readUInt8(0) != 5) {
					stage = STAGE_DESTROYED;
					return connection.end();
				}
				connection.write("\x05\x00");
				stage = STAGE_ADDR;
				break;

			case STAGE_ADDR: // 获取地址
				if (data.length < 10 || data.readUInt8(0) != 5) {
					stage = STAGE_DESTROYED;
					return connection.end();
				}
				cmd = data.readUInt8(1);
				addressHeader = parseAddressHeader(data, 3);
				if (!addressHeader) {
					stage = STAGE_DESTROYED;
					return connection.end();
				}

				//only supports connect cmd
				if (cmd != CMD_CONNECT) {
					logger.error('[${connectionId}]: only supports connect cmd');
					stage = STAGE_DESTROYED;
					return connection.end("\x05\x07\x00\x01\x00\x00\x00\x00\x00\x00");
				}

				logger.info(`[${connectionId}]: connecting to ${addressHeader.dstAddr}:${addressHeader.dstPort}`);
				connection.write("\x05\x00\x00\x01\x00\x00\x00\x00\x00\x00");

				stage = STAGE_CONNECTING;

				serverConnection = new WebSocket('ws://' + serverAddress + ':' + serverPort, {
					perMessageDeflate: false
				});
				serverConnection.on('open', function() {
					logger.info(`[${connectionId}]: connecting to server`);
					serverConnection.send(encryptor.encrypt(data.slice(3)), function() {
						stage = STAGE_STREAM;
						dataCache = Buffer.concat(dataCache);
						serverConnection.send(encryptor.encrypt(dataCache), {
							binary: true
						}, function() {
							logger.debug(`[${connectionId}]: write data[length = ${dataCache.length}] to client connection`);
							dataCache = null;
						});
					});
				});
				serverConnection.on('message', function(data) {
					logger.debug(`[${connectionId}]: read data[length = ${data.length}] from server connection`);
					canWriteToLocalConnection && connection.write(encryptor.decrypt(data), function() {
						logger.debug(`[${connectionId}]: write data[length = ${data.length}] to client connection`);
					});
				});
				serverConnection.on('error', function(error) {
					logger.error(`[${connectionId}]: an error of server connection occured`, error);
					stage = STAGE_DESTROYED;
					connection.end();
				});
				serverConnection.on('close', function(code, reason) {
					logger.info(`[${connectionId}]: close event[code = '${WSErrorCode[code]}'] of server connection has been triggered`);
					stage = STAGE_DESTROYED;
					connection.end();
				});

				if (data.length > addressHeader.headerLen + 3) {
					dataCache.push(data.slice(addressHeader.headerLen + 3));
				}
				break;

			case STAGE_CONNECTING: // 持续连接
				dataCache.push(data);
				break;

			case STAGE_STREAM:
				canWriteToLocalConnection && serverConnection.send(encryptor.encrypt(data), {
					binary: true
				}, function() {
					logger.debug(`[${connectionId}]: write data[length = ${data.length}] to server connection`);
				});
				break;
		}
	});
	connection.on('end', function() {
		logger.info(`[${connectionId}]: end event of client connection has been triggered`);
		stage = STAGE_DESTROYED;
	});
	connection.on('close', function(hadError) {
		logger.info(`[${connectionId}]: close event[had error = ${hadError}] of client connection has been triggered`);
		stage = STAGE_DESTROYED;
		canWriteToLocalConnection = false;
		connections[connectionId] = null;
		serverConnection && serverConnection.terminate();
	});
	connection.on('error', function(error) {
		logger.error(`[${connectionId}]: an error of client connection occured`, error);
		stage = STAGE_DESTROYED;
		connection.destroy();
		canWriteToLocalConnection = false;
		connections[connectionId] = null;
		serverConnection && serverConnection.close();
	});
};
```


---

### initServer-server

代码 159-202

``` js
TCPRelay.prototype.initServer = function() {
	var self = this;
	return new Promise(function(resolve, reject) {
		var config = self.config;
		var port = self.isLocal ? config.localPort : config.serverPort;
		var address = self.isLocal ? config.localAddress : config.serverAddress;
		var server;

		if (self.isLocal) { 
		// 	server = self.server = net.createServer({
		// 		allowHalfOpen: true,
		// 	});
		// 	server.maxConnections = MAX_CONNECTIONS;
		// 	server.on('connection', function(connection) {
		// 		return self.handleConnectionByLocal(connection);
		// 	});
		// 	server.on('close', function() {
		// 		self.logger.info('server is closed');
		// 		self.status = SERVER_STATUS_STOPPED;
		// 	});
		// 	server.listen(port, address);
        }
         else { // 服务器端
			server = self.server = new WebSocket.Server({
				host: address,
				port: port,
				perMessageDeflate: false,
				backlog: MAX_CONNECTIONS
			});
			server.on('connection', function(connection) {
				return self.handleConnectionByServer(connection);
			});
		}
		server.on('error', function(error) {
			self.logger.fatal('an error of', self.getServerName(), 'occured', error);
			self.status = SERVER_STATUS_STOPPED;
			reject(error);
		}); // 错误事件-退出-Primise
		server.on('listening', function() {
			self.logger.info(self.getServerName(), 'is listening on', address + ':' + port);
			self.status = SERVER_STATUS_RUNNING;
			resolve();
		}); // 进程-监听
	});
};
```

> 和 [初始化-localserver](#initServer-local)的不同，也就是开启服务器-那段代码

``` js
    server = self.server = new WebSocket.Server({
        host: address,
        port: port,
        perMessageDeflate: false,
        backlog: MAX_CONNECTIONS
    });
    server.on('connection', function(connection) {
        return self.handleConnectionByServer(connection);
    });
```

- WebSocket.Server

> ~~[服务器例子 >> 可以看看简单例子](#ws-try)~~

- server.on('connection'

> 服务器-connection-建立-触发事件

- [`self.handleConnectionByServer(connection)`](#handleconnectionbyserver)

> 服务器-connection-触发事件

---

## handleConnectionByServer

> [tcprelay-parseAddressHeader 解析-传输头数据->整理->规范数据](#tcprelay-parseaddressheader)

服务器端

- 用-`ws`-接收-本地-加密数据 - [可以看看ws-try例子](#ws-try)

- 用`net.createConnection`-请求-本地-网址 - [可以看看net-例子](#net-createconnection-try)

代码 205-313

``` js
//server
TCPRelay.prototype.handleConnectionByServer = function(connection) {
	var self = this;
	var config = self.config;
	var method = config.method;
	var password = config.password;
	var serverAddress = config.serverAddress;
	var serverPort = config.serverPort;

	var logger = self.logger;
	var encryptor = new Encryptor(password, method);

	var stage = STAGE_INIT;
	var connectionId = (globalConnectionId++) % MAX_CONNECTIONS;
	var targetConnection, addressHeader;

	var dataCache = [];

	logger.info(`[${connectionId}]: accept connection from local`);
	connections[connectionId] = connection;
	connection.on('message', function(data) {
		// 接收-本地-加密数据
		data = encryptor.decrypt(data);
		logger.debug(`[${connectionId}]: read data[length = ${data.length}] from local connection at stage[${STAGE[stage]}]`);

		switch (stage) {

			case STAGE_INIT:
				if (data.length < 7) {
					stage = STAGE_DESTROYED;
					return connection.close();
				}
				addressHeader = parseAddressHeader(data, 0);
				if (!addressHeader) {
					stage = STAGE_DESTROYED;
					return connection.close();
				}

				logger.info(`[${connectionId}]: connecting to ${addressHeader.dstAddr}:${addressHeader.dstPort}`);
				stage = STAGE_CONNECTING;

				targetConnection = net.createConnection({
					// 站在-服务器-角度--连接-网址
					port: addressHeader.dstPort,
					host: addressHeader.dstAddr,
					allowHalfOpen: true
				}, function() {
					logger.info(`[${connectionId}]: connecting to target`);

					dataCache = Buffer.concat(dataCache);
					targetConnection.write(dataCache, function() {
						logger.debug(`[${connectionId}]: write data[length = ${dataCache.length}] to target connection`);
						dataCache = null;
					});
					stage = STAGE_STREAM;
				});

				targetConnection.on('data', function(data) {
					logger.debug(`[${connectionId}]: read data[length = ${data.length}] from target connection`);
					if (connection.readyState == WebSocket.OPEN) {
						connection.send(encryptor.encrypt(data), {
							binary: true
						}, function() {
							logger.debug(`[${connectionId}]: write data[length = ${data.length}] to local connection`);
						});
					}
				});
				targetConnection.on('end', function() {
					logger.info(`[${connectionId}]: end event of target connection has been triggered`);
					stage = STAGE_DESTROYED;
					connection.close();
				});
				targetConnection.on('close', function(hadError) {
					logger.info(`[${connectionId}]: close event[had error = ${hadError}] of target connection has been triggered`);
					stage = STAGE_DESTROYED;
					connection.close();
				});
				targetConnection.on('error', function(error) {
					logger.error(`[${connectionId}]: an error of target connection occured`, error);
					stage = STAGE_DESTROYED;
					targetConnection.destroy();
					connection.close();
				});

				if (data.length > addressHeader.headerLen) {
					dataCache.push(data.slice(addressHeader.headerLen));
				}
				break;

			case STAGE_CONNECTING:
				dataCache.push(data);
				break;

			case STAGE_STREAM:
				targetConnection.write(data, function() {
					logger.debug(`[${connectionId}]: write data[length = ${data.length}] to target connection`);
				});
				break;
		}
	});
	connection.on('close', function(code, reason) {
		logger.info(`[${connectionId}]: close event[code = '${WSErrorCode[code]}'] of local connection has been triggered`);
		connections[connectionId] = null;
		targetConnection && targetConnection.destroy();
	});
	connection.on('error', function(error) {
		logger.error(`[${connectionId}]: an error of connection local occured`, error);
		connection.terminate();
		connections[connectionId] = null;
		targetConnection && targetConnection.end();
	});
};
```
---

## tcprelay-生命周期-stop

代码 452-471

``` js
TCPRelay.prototype.stop = function() {
	var self = this;
	var connId = null;
	return new Promise(function(resolve, reject) {
		if (self.server) {
			self.server.close(function() {
				resolve();
			});

			for (connId in connections) {
				if (connections[connId]) {
					self.isLocal ? connections[connId].destroy() : connections[connId].terminate();
				}
			}

		} else {
			resolve();
		}
	});
};
```

### tcprelay-parseAddressHeader

解析-传输头数据->整理->规范数据

``` js
function parseAddressHeader(data, offset) {
	var addressType = data.readUInt8(offset);
	var headerLen, dstAddr, dstPort, dstAddrLen;
	//domain name
	if (addressType == ADDRESS_TYPE_DOMAIN_NAME) {
		dstAddrLen = data.readUInt8(offset + 1);
		dstAddr = data.slice(offset + 2, offset + 2 + dstAddrLen).toString();
		dstPort = data.readUInt16BE(offset + 2 + dstAddrLen);
		headerLen = 4 + dstAddrLen;
	}
	//ipv4
	else if (addressType == ADDRESS_TYPE_IPV4) {
		dstAddr = data.slice(offset + 1, offset + 5).join('.').toString();
		dstPort = data.readUInt16BE(offset + 5);
		headerLen = 7;
	} else {
		return false;
	}
	return {
		addressType: addressType,
		headerLen: headerLen,
		dstAddr: dstAddr,
		dstPort: dstPort
	};
}
```
### tcprelay-其他-prototype

代码 113-148

``` js

TCPRelay.prototype.getStatus = function() {
	return this.status;
};

TCPRelay.prototype.setServerName = function(serverName) {
	this.serverName = serverName;
	return this;
};

TCPRelay.prototype.getServerName = function() {
	if (!this.serverName) {
		this.serverName = this.isLocal ? 'local' : 'server';
	}
	return this.serverName;
};

TCPRelay.prototype.setLogLevel = function(logLevel) {
	this.logLevel = logLevel;
	return this;
};

TCPRelay.prototype.getLogLevel = function() {
	return this.logLevel;
};

TCPRelay.prototype.setLogFile = function(logFile) {
	if (logFile && !path.isAbsolute(logFile)) {
		logFile = process.cwd() + '/' + logFile;
	}
	this.logFile = logFile;
	return this;
};

TCPRelay.prototype.getLogFile = function() {
	return this.logFile;
};
```


---
## 其他

- [ws-github source](https://github.com/websockets/ws)

- [shadowsock-node-js-lib 库](https://github.com/shadowsocks/shadowsocks-nodejs/tree/master/lib/shadowsocks)

### config-例子

``` bash
node tryconfig_default.js
```

- `tryconfig_default.js`

``` js
var defaultconfig = require('./config.json');
var config = {serverPort: 1200}
if (config) {
    var Config = Object.assign(defaultconfig, config);
}

console.log(Config)
```