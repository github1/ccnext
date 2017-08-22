import { ChatReadyForFulfillmentEvent } from '../core/chat';

import { WELCOME_MESSAGE, TRANSACTIONS, TOPICS } from './consts.js';

module.exports = (eventBus, chatService) => {

  eventBus.subscribe((event) => {
    if (event instanceof ChatReadyForFulfillmentEvent) {
      const slots = event.payload.slots;
      const answer = slots.QuestionTopic ? TOPICS[slots.QuestionTopic].answer : null;
      // In reality, most cases would make calls to our APIs before returning a message
      switch (event.payload.intentName) {
        case "Welcome":
          chatService.postMessage(
            event.streamId,
            event.fulfiller,
            WELCOME_MESSAGE
          );
          chatService.endChat(event.streamId);
          break;
        case "AskQuestion":
          chatService.postMessage(
            event.streamId,
            event.fulfiller,
            answer
          );
          chatService.endChat(event.streamId);
          break;
        case "GetAccountBalance":
          chatService.postMessage(
            event.streamId,
            event.fulfiller,
            `${event.requester.handle}, your account balance is £3245.73. Is there anything else I can do for you today?`
          );
          chatService.endChat(event.streamId);
          break;
        case "GetTransactions":
          chatService.postMessage(
            event.streamId,
            event.fulfiller,
            `Your last few transactions are:\n${TRANSACTIONS.map(function(transaction) {return ` Vendor: ${transaction.vendor}, Amount: ${transaction.amount}`;})} Is there anything else I can help you with?`
          );
          chatService.endChat(event.streamId);
          break;
        case "LostCard":
          chatService.postMessage(
            event.streamId,
            event.fulfiller,
            `OK ${event.requester}, your ${event.payload.slots.cardType} has been disabled. Is there anything else I can help you with today?`
          );
          chatService.endChat(event.streamId);
          break;
        case "MakePayment":
          chatService.postMessage(
            event.streamId,
            event.fulfiller,
            `OK ${event.requester}, I have set up a payment of £${slots.amount} to ${slots.payee} on ${slots.paymentDate} from your account ending in ${slots.fromAccount}. Anything else I can do for you?`
          );
          chatService.endChat(event.streamId);
          break;
        default:
          chatService.postMessage(
            event.streamId,
            event.fulfiller,
            `${event.intentName} fulfilled!`);
          chatService.endChat(event.streamId);
      }
    }
  });
};

// // example of escalating to agent
// chatService.postMessage(
//   event.streamId,
//   event.queue,
//   'I\'m sorry, something went wrong, let me pass you over to a human agent');
// setTimeout(function() {
//   // give it time to catch up
//   chatService.leaveChat(event.streamId, event.queue);
//   chatService.transferTo(event.streamId, 'agentChatQueue');
// }, 500);
