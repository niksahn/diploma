const WebSocket = require('ws');

console.log('Testing direct WebSocket connection to chat-service...');

const ws = new WebSocket('ws://localhost:8084/ws/chats/ws?token=demo-token');

ws.on('open', function open() {
  console.log('✅ WebSocket connected directly to chat-service');

  // Отправляем сообщение о присоединении к чату
  const joinMsg = { type: 'join_chat', chat_id: 1 };
  console.log('📤 Sending join_chat message:', JSON.stringify(joinMsg));
  ws.send(JSON.stringify(joinMsg));

  // Через секунду отправляем сообщение
  setTimeout(() => {
    const msg = { type: 'send_message', chat_id: 1, text: 'Hello from direct connection!' };
    console.log('📤 Sending message:', JSON.stringify(msg));
    ws.send(JSON.stringify(msg));
  }, 1000);

  // Закрываем через 3 секунды
  setTimeout(() => {
    console.log('🔌 Closing connection...');
    ws.close();
  }, 3000);
});

ws.on('message', function message(data) {
  console.log('📥 Received from server:', data.toString());
  try {
    const messages = data.toString().trim().split('\n').filter(msg => msg.trim());
    messages.forEach(msgStr => {
      console.log('📥 Parsed message:', JSON.parse(msgStr));
    });
  } catch (e) {
    console.log('❌ Failed to parse message:', e);
  }
});

ws.on('close', function close(code, reason) {
  console.log('🔌 WebSocket closed:', { code, reason: reason.toString() });
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});