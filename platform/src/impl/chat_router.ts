import {
  EventBus,
  EventRecord
} from '../core/entity/entity';
import {
  ChatTransferredEvent,
  ChatMessagePostedEvent,
  ChatDestinationProvider,
  ChatDestination,
  ChatResponse
} from '../core/chat';
import { ChatService } from '../core/chat_service';

export const chatRouter = (eventBus : EventBus,
                           chatDestinationProvider : ChatDestinationProvider,
                           chatService : ChatService) : void => {

  type ChatState = { queue? : string };

  const chatStates : { [key:string]:ChatState } = {};

  const chatState = (chatId : string) : ChatState => {
    if (chatStates[chatId] === undefined) {
      chatStates[chatId] = {};
    }
    return chatStates[chatId];
  };

  eventBus.subscribe(
    (event : EventRecord) => {
      if (event.name === 'ChatTransferredEvent') {
        const chatEvent : ChatTransferredEvent = (<ChatTransferredEvent>event.payload);
        chatState(event.stream).queue = chatEvent.toQueue;
      } else if (event.name === 'ChatMessagePostedEvent') {
        const chatQueue : string = chatState(event.stream).queue;
        if (chatQueue) {
          const chatEvent : ChatMessagePostedEvent = (<ChatMessagePostedEvent>event.payload);
          if(chatEvent.fromParticipant === chatQueue) {
            // don't reply to self
            return;
          }
          const destination : ChatDestination = chatDestinationProvider.getChat(chatQueue);
          destination.send({
            message: chatEvent.text,
            dialogCorrelationId: chatEvent.correlationId
          }).then((response : ChatResponse) => {
            if (response.state === 'ReadyForFulfillment') {
              chatService.signalReadyForFulfillment(event.stream, chatEvent.fromParticipant, response.payload);
            } else if (response.state !== 'Deferred') {
              chatService.postMessage(event.stream, chatQueue, response.message);
            }
            if (response.state === 'Failed') {
              chatService.leaveChat(event.stream, chatQueue);
              chatService.transferTo(event.stream, 'agentChatQueue');
            }
          }).catch((error : Error) => {
            chatService.signalError(event.stream, error);
          });
        }
      }
    });

};
