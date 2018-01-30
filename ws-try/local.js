const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', function open() {
  ws.send('>>> local msg');
});

ws.on('message', function incoming(data) {
  console.log('msg from server >>>',data);
});