module.exports = (eventBus, taskService, chatService) => {

  eventBus.subscribe((event) => {
    switch (event.name) {
      case 'ChatTransferredEvent':
        if (event.payload.toQueue === 'agentChatQueue') {
          taskService.submitTask('ccaas', {
            channel: 'chat',
            chatId: event.stream
          }).catch((error) => {
            console.error('failed to create task', error);
          });
        }
        break;
      case 'TaskCompletedEvent':
        if (event.payload.taskData.chatId) {
          chatService.endChat(event.payload.taskData.chatId);
        }
    }
  });

};
