import { ChatReadyForFulfillmentEvent } from '../core/chat';

import { WELCOME_MESSAGE } from './consts.js';

module.exports = (eventBus, chatService) => {

  eventBus.subscribe((event) => {
    if (event instanceof ChatReadyForFulfillmentEvent) {
      // implement real fulfillment logic here
      switch (event.payload.intentName) {
        case "Welcome":
          chatService.postMessage(
            event.streamId,
            event.queue,
            WELCOME_MESSAGE
          );
          break;
        // case "AskQuestion":
        // let answer = validateAskQuestion(event.payload.payload.)
        //   chatService.postMessage(
        //     event.streamId,
        //     event.queue,
        //     answer
        //   );
        //   break;
        default:
        chatService.postMessage(
          event.streamId,
          event.queue,
          `${event.intentName} fulfilled!`);
        chatService.endChat(event.streamId);
      }
    }
  });
};

// example of escalating to agent
// chatService.postMessage(
//   event.stream,
//   event.payload.queue,
//   'I\'m sorry, something went wrong, let me pass you over to a human agent');
// setTimeout(function() {
//   // give it time to catch up
//   chatService.leaveChat(event.stream, event.payload.queue);
//   chatService.transferTo(event.stream, 'agentChatQueue');
// }, 500);
