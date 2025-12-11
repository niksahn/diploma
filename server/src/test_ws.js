const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080/ws/chats/ws?token=demo-token');

ws.on('open', function open() {
  console.log('WebSocket connected');

  // Отправляем сообщение о присоединении к чату
  ws.send(JSON.stringify({
    type: 'join_chat',
    chat_id: 1
  }));

  // Через секунду отправляем сообщение
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'send_message',
      chat_id: 1,
      text: 'Hello from Node.js WebSocket test!'
    }));
  }, 1000);

  // Закрываем через 3 секунды
  setTimeout(() => {
    ws.close();
  }, 3000);
});

ws.on('message', function message(data) {
  console.log('Received:', data.toString());
  try {
    const messages = data.toString().trim().split('\n').filter(msg => msg.trim());
    messages.forEach(msgStr => {
      console.log('Parsed message:', JSON.parse(msgStr));
    });
  } catch (e) {
    console.log('Failed to parse:', e);
  }
});

ws.on('close', function close(code, reason) {
  console.log('WebSocket closed:', code, reason.toString());
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});


