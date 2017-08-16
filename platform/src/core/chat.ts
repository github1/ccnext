import { Entity, EntityEvent, uuid } from './entity/entity';
import { Clock } from './clock';

export class ChatEvent implements EntityEvent {
  public timestamp : number = Clock.now();
  public name : string;

  constructor() {
    this.name = this.constructor.name;
  }
}

export class ChatStartedEvent extends ChatEvent {
  public startedParticipant : string;

  constructor(startedParticipant : string) {
    super();
    this.startedParticipant = startedParticipant;
  }
}

export class ChatParticipantJoinedEvent extends ChatEvent {
  public participant : string;

  constructor(participant : string) {
    super();
    this.participant = participant;
  }
}

export class ChatParticipantLeftEvent extends ChatEvent {
  public participant : string;

  constructor(participant : string) {
    super();
    this.participant = participant;
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
  public messageId : string;
  public correlationId : string;
  public fromParticipant : string;
  public fromParticipantRole : string;
  public text : string;

  constructor(messageId : string, correlationId : string, fromParticipant : string, text : string) {
    super();
    this.messageId = messageId;
    this.correlationId = correlationId;
    this.fromParticipant = fromParticipant;
    this.text = text;
  }
}

export class ChatReadyForFulfillmentEvent extends ChatEvent {
  public requester : string;
  public queue : string;
  public payload : {};

  constructor(requester : string, queue : string, payload : {}) {
    super();
    this.requester = requester;
    this.queue = queue;
    this.payload = payload;
  }
}

export class ChatErrorEvent extends ChatEvent {
  public error : Error;

  constructor(error : Error) {
    super();
    this.error = error;
  }
}

export class Chat extends Entity {
  private started : boolean;
  private participants : string[] = [];
  private chatQueue : string;
  private fulfillmentSequence : number = 0;
  private chatSequence : number = 1;

  constructor(id : string) {
    super(id, Entity.CONFIG((self : Chat, event : EntityEvent) : void => {
      if (event instanceof ChatStartedEvent) {
        self.started = true;
      } else if (event instanceof ChatParticipantJoinedEvent) {
        self.participants.push(event.participant);
      } else if (event instanceof ChatParticipantLeftEvent) {
        const index = self.participants.indexOf(event.participant);
        if (index > -1) {
          self.participants.splice(index, 1);
        }
      } else if (event instanceof ChatTransferredEvent) {
        self.chatQueue = event.toQueue;
      } else if (event instanceof ChatReadyForFulfillmentEvent) {
        self.fulfillmentSequence = self.chatSequence;
      } else if (event instanceof ChatEndedEvent) {
        self.chatSequence++;
      }
    }));
  }

  public start(user : string) : void {
    if (!this.started) {
      this.dispatch(this.id, new ChatStartedEvent(user));
    }
    this.join(user);
  }

  public join(participant : string) : void {
    if (this.participants.indexOf(participant) < 0) {
      this.dispatch(this.id, new ChatParticipantJoinedEvent(participant));
    }
  }

  public leave(participant : string) : void {
    if (this.participants.indexOf(participant) > -1) {
      this.dispatch(this.id, new ChatParticipantLeftEvent(participant));
    }
  }

  public postMessage(fromParticipant : string, text : string) : Promise<{}> {
    if (this.chatQueue) {
      return new Promise((resolve : Function) : void => {
        this.start(fromParticipant);
        this.dispatch(this.id, new ChatMessagePostedEvent(uuid(), `${this.id}_${this.chatSequence}`, fromParticipant, text));
        resolve();
      });
    } else {
      throw new Error('No chat queue set');
    }
  }

  public defaultQueue(chatQueue : string) {
    if (!this.chatQueue) {
      this.transferTo(chatQueue);
    }
  }

  public transferTo(newChatQueue : string) {
    if (this.chatQueue !== newChatQueue) {
      this.dispatch(this.id, new ChatTransferredEvent(this.chatQueue, newChatQueue));
    }
  }

  public signalReadyForFulfillment(onBehalfOf : string, payload : {}) : void {
    if(this.fulfillmentSequence !== this.chatSequence) {
      this.dispatch(this.id, new ChatReadyForFulfillmentEvent(onBehalfOf, this.chatQueue, payload));
    }
  }

  public signalError(error : Error) : void {
    this.dispatch(this.id, new ChatErrorEvent(error));
  }

  public end() : void {
    this.dispatch(this.id, new ChatEndedEvent());
  }

}
