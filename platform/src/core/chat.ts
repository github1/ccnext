import { Entity, EntityEvent } from './entity/entity';
import { Clock } from './clock';

export class ChatEvent implements EntityEvent {
  public timestamp : number = Clock.now();
}

export class ChatStartedEvent extends ChatEvent {
  public chatQueue : string;

  constructor(chatQueue : string) {
    super();
    this.chatQueue = chatQueue;
  }
}

export class ChatEndedEvent extends ChatEvent {
}

export class ChatTransferredEvent extends ChatEvent {
  public fromQueue : string;
  public toQueue : string;

  constructor(fromQueue : string, toQueue : string) {
    super();
    this.fromQueue = fromQueue;
    this.toQueue = toQueue;
  }
}

export class ChatMessagePostedEvent extends ChatEvent {
  public source : string;
  public text : string;

  constructor(source : string, text : string) {
    super();
    this.source = source;
    this.text = text;
  }
}

export class ChatErrorEvent extends ChatEvent {
  public error : Error;

  constructor(error : Error) {
    super();
    this.error = error;
  }
}

export interface ChatRequest {
  message: string;
  dialogCorrelationId: string;
}

export interface ChatResponse {
  message: string;
  state: State;
}

export type State = 'ElicitIntent' |
  'ConfirmIntent' |
  'ElicitSlot' |
  'Fulfilled' |
  'ReadyForFulfillment' |
  'Failed' |
  'Deferred';

export interface ChatDestination {
  send(request : ChatRequest) : Promise<ChatResponse>;
}

export interface ChatDestinationProvider {
  getChat(id : string) : ChatDestination;
}

export class Chat extends Entity {
  private chatQueue : string;

  constructor(id : string) {
    super(id, Entity.CONFIG((self : Chat, event : EntityEvent) : void => {
      if (event instanceof ChatStartedEvent) {
        self.chatQueue = event.chatQueue;
      } else if (event instanceof ChatTransferredEvent) {
        self.chatQueue = event.toQueue;
      }
    }));
  }

  public postMessage(source : string, text : string, provider : ChatDestinationProvider) : void {
    if (this.chatQueue) {
      this.dispatch(this.id, new ChatMessagePostedEvent(source, text));
      const dest : ChatDestination = provider.getChat(this.chatQueue);
      dest.send({
        message: text,
        dialogCorrelationId: this.id
      }).then((response : ChatResponse) => {
          if (response.state !== 'Deferred') {
            this.dispatch(this.id, new ChatMessagePostedEvent(this.chatQueue, response.message));
          }
        })
        .catch((error : Error) => {
          this.dispatch(this.id, new ChatErrorEvent(error));
        });
    } else {
      throw new Error('No chat queue set');
    }
  }

  public transferTo(newChatQueue : string) {
    if (!this.chatQueue) {
      this.dispatch(this.id, new ChatStartedEvent(newChatQueue));
    } else if (this.chatQueue !== newChatQueue) {
      this.dispatch(this.id, new ChatTransferredEvent(this.chatQueue, newChatQueue));
    }
  }

  public end() : void {
    this.dispatch(this.id, new ChatEndedEvent());
  }

}
