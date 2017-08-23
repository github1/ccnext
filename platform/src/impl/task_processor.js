import { ChatTransferredEvent } from '../core/chat';
import { TaskCompletedEvent } from '../core/task';

module.exports = (eventBus, taskService, chatService) => {

  eventBus.subscribe((event) => {
    if(event instanceof ChatTransferredEvent) {
      if (event.toQueue === 'agentChatQueue') {
        taskService.submitTask('ccaas', {
          channel: 'chat',
          chatId: event.streamId
        }).catch((error) => {
          console.error('failed to create task', error);
        });
      }
    } else if (event instanceof TaskCompletedEvent) {
      if (event.taskData.chatId) {
        chatService.endChat(event.taskData.chatId);
      }
    }
  });

};
