import {
  EventBus,
  EventRecord
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

class BoundChatResponse implements ChatResponse {
  private chatId : string;
  private chatQueue : string;
  private fromParticipant : string;
  private chatService : ChatService;
  private conversationData : {[key:string]:string};

  constructor(chatId : string,
              chatQueue : string,
              fromParticipant : string,
              chatService : ChatService,
              conversationData : {[key:string]:string}) {
    this.chatId = chatId;
    this.chatQueue = chatQueue;
    this.fromParticipant = fromParticipant;
    this.chatService = chatService;
    this.conversationData = conversationData;
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
      Object.assign(this.conversationData, data);
    }
  }

}

export const chatRouter = (eventBus : EventBus,
                           chatDestinationProvider : ChatDestinationProvider,
                           chatService : ChatService) : void => {

  type ChatState = {
    queue? : string,
    conversationData? : { [key:string]:{ [key:string]:string } }
  };

  const chatStates : { [key:string]:ChatState } = {};

  const getChatState = (chatId : string) : ChatState => {
    if (chatStates[chatId] === undefined) {
      chatStates[chatId] = {conversationData: {}};
    }
    return chatStates[chatId];
  };

  const getChatConversationState = (chatId : string, correlationId? : string) : {[key:string]:string} => {
    const chatState : ChatState = getChatState(chatId);
    if (correlationId) {
      if (chatState.conversationData[correlationId] === undefined) {
        chatState.conversationData[correlationId] = {};
      }
    }
    return chatState.conversationData[correlationId];
  };

  eventBus.subscribe(
    (event : EventRecord) => {
      if (event.name === 'ChatTransferredEvent') {
        // store current chat queue
        const chatEvent : ChatTransferredEvent = (<ChatTransferredEvent>event.payload);
        getChatState(event.stream).queue = chatEvent.toQueue;
      } else if (event.name === 'ChatMessagePostedEvent') {
        const chatQueue : string = getChatState(event.stream).queue;
        if (chatQueue) {
          const chatEvent : ChatMessagePostedEvent = (<ChatMessagePostedEvent>event.payload);
          if (chatEvent.fromParticipant === chatQueue) {
            // don't reply to messages sent generically from the same chatQueue
            return;
          }
          const conversationData : { [key:string]:string } = getChatConversationState(event.stream, chatEvent.correlationId);
          chatDestinationProvider
            .getChat(chatQueue)
            .send(
              {
                message: chatEvent.text,
                correlationId: chatEvent.correlationId,
                conversationData: conversationData
              },
              new BoundChatResponse(event.stream, chatQueue, chatEvent.fromParticipant, chatService, conversationData)
            );
        }
      }
    });

};
