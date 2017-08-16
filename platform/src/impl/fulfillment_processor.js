import { ChatReadyForFulfillmentEvent } from '../core/chat';

module.exports = (eventBus, chatService) => {

  eventBus.subscribe((event) => {
    if (event instanceof ChatReadyForFulfillmentEvent) {
      // implement real fulfillment logic here
      if(event.payload.intentName === 'Welcome') {
        // example of escalating to agent
        chatService.postMessage(
          event.streamId,
          event.queue,
          'I\'m sorry, something went wrong, let me pass you over to a human agent');
        setTimeout(function() {
          // give it time to catch up
          chatService.leaveChat(event.streamId, event.queue);
          chatService.transferTo(event.streamId, 'agentChatQueue');
        }, 500);
      } else {
        chatService.postMessage(
          event.streamId,
          event.queue,
          `${event.payload.intentName} fulfilled!`);
        chatService.endChat(event.streamId);
      }

    }
  });

};
