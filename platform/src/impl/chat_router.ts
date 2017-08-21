import {
  EventBus,
  EntityEvent
} from '../core/entity/entity';
import {
  ChatTransferredEvent,
  ChatMessagePostedEvent
} from '../core/chat';
import { ChatService } from '../core/chat_service';

export interface ChatRequest {
  message: string;
  correlationId: string;
  conversationData : { [key:string]:string };
}

export interface ChatResponse {
  reply(text : string) : void;
  signalReadyForFulfillment(data : {}) : void;
  signalFailed(text : string): void;
  signalError(error : Error) : void;
  nothing() : void;
  storeConversationData(data : { [key:string]:string });
}

export interface ChatDestination {
  send(request : ChatRequest, response : ChatResponse) : void;
}

export interface ChatDestinationProvider {
  getChat(id : string) : ChatDestination;
}

export class NullChatDestination implements ChatDestination {
  public send(request : ChatRequest, response : ChatResponse) : void {
    response.nothing();
  }
}

type ChatData = {
  queue? : string,
  conversationData? : { [key:string]:{ [key:string]:string } }
};

const chatStates : { [key:string]:ChatData } = {};

class BoundChatResponse implements ChatResponse {
  private chatId : string;
  private chatQueue : string;
  private fromParticipant : string;
  private chatService : ChatService;
  private correlationId : string;

  constructor(chatId : string,
              chatQueue : string,
              fromParticipant : string,
              chatService : ChatService,
              correlationId : string) {
    this.chatId = chatId;
    this.chatQueue = chatQueue;
    this.fromParticipant = fromParticipant;
    this.chatService = chatService;
    this.correlationId = correlationId;
  }

  public reply(text : string) : void {
    this.chatService.postMessage(this.chatId, this.chatQueue, text);
  }

  public signalReadyForFulfillment(data : {}) : void {
    this.chatService.signalReadyForFulfillment(this.chatId, this.fromParticipant, data);
  }

  public signalFailed(text : string) : void {
    this.chatService.postMessage(this.chatId, this.chatQueue, text);
    this.chatService.leaveChat(this.chatId, this.chatQueue);
    this.chatService.transferTo(this.chatId, 'agentChatQueue');
  }

  public signalError(error : Error) : void {
    this.chatService.signalError(this.chatId, error);
    this.chatService.leaveChat(this.chatId, this.chatQueue);
    this.chatService.transferTo(this.chatId, 'agentChatQueue');
  }

  public nothing() : void {
    // do nothing
  }

  public storeConversationData(data : { [key:string]:string }) : void {
    if (data) {
      chatStates[this.chatId]
        .conversationData[this.correlationId] = Object.assign(chatStates[this.chatId].conversationData[this.correlationId], data);
    }
  }

}

export const chatRouter = (eventBus : EventBus,
                           chatDestinationProvider : ChatDestinationProvider,
                           chatService : ChatService) : void => {

  const getChatData = (chatId : string) : ChatData => {
    if (chatStates[chatId] === undefined) {
      chatStates[chatId] = {conversationData: {}};
    }
    return chatStates[chatId];
  };

  const getChatConversationData = (chatId : string, correlationId? : string) : {[key:string]:string} => {
    const chatState : ChatData = getChatData(chatId);
    if (correlationId) {
      if (chatState.conversationData[correlationId] === undefined) {
        chatState.conversationData[correlationId] = {};
      }
    }
    return chatState.conversationData[correlationId];
  };

  eventBus.subscribe(
    (event : EntityEvent) => {
      if (event instanceof ChatTransferredEvent) {
        // store current chat queue;
        getChatData(event.streamId).queue = event.toQueue;
      } else if (event instanceof ChatMessagePostedEvent) {
        const chatQueue : string = getChatData(event.streamId).queue;
        if (chatQueue) {
          if (event.fromParticipant === chatQueue) {
            // don't reply to messages sent from the same chatQueue
            return;
          }
          const conversationData : { [key:string]:string } = getChatConversationData(event.streamId, event.correlationId);
          conversationData['fromParticipantIdentityId'] = event.fromParticipantIdentityId;
          chatDestinationProvider
            .getChat(chatQueue)
            .send({
              message: event.text,
              correlationId: event.correlationId,
              conversationData: conversationData
            }, new BoundChatResponse(event.streamId, chatQueue, event.fromParticipant, chatService, event.correlationId));
        }
      }
    });

};
