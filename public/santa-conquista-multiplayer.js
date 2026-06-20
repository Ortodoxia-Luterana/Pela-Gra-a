(function initSantaConquistaMultiplayer(root) {
  function createClient(handlers) {
    const socket = root.io({ transports: ['websocket', 'polling'] });
    socket.on('connect', () => handlers.status?.('Conectado ao servidor.'));
    socket.on('disconnect', () => handlers.status?.('Conexao perdida. Tentando reconectar.'));
    socket.on('sc:error', payload => handlers.error?.(payload?.message || 'Erro no servidor.'));
    socket.on('sc:joined', payload => handlers.joined?.(payload));
    socket.on('sc:gameState', state => handlers.state?.(state));
    return {
      socket,
      joinRoom(roomId) { socket.emit('sc:joinRoom', { roomId }); },
      chooseNation(roomId, nationId) { socket.emit('sc:chooseNation', { roomId, nationId }); },
      build(roomId, provinceId, building) { socket.emit('sc:build', { roomId, provinceId, building }); },
      trainArmy(roomId, provinceId, amount) { socket.emit('sc:trainArmy', { roomId, provinceId, amount }); },
      moveArmy(roomId, provinceId) { socket.emit('sc:moveArmy', { roomId, provinceId }); },
      declareWar(roomId, targetNationId, objective) { socket.emit('sc:declareWar', { roomId, targetNationId, objective }); },
      offerPeace(roomId, warId, cedeProvince) { socket.emit('sc:offerPeace', { roomId, warId, cedeProvince }); },
      acceptPeace(roomId, treatyId) { socket.emit('sc:acceptPeace', { roomId, treatyId }); },
      religion(roomId, provinceId, policy) { socket.emit('sc:changeReligionPolicy', { roomId, provinceId, policy }); },
      eventChoice(roomId, eventId, choiceId) { socket.emit('sc:triggerEventChoice', { roomId, eventId, choiceId }); },
      pause(roomId, paused) { socket.emit('sc:pauseGame', { roomId, paused }); },
      speed(roomId, speed) { socket.emit('sc:setSpeed', { roomId, speed }); },
      chat(roomId, message) { socket.emit('sc:chatMessage', { roomId, message }); }
    };
  }

  root.SantaConquistaNet = { createClient };
})(window);
