import { Entity, EntityEvent, uuid } from './entity/entity';

export class ChatParticipantVO {
  public typeNameMetaData : string;
  public handle : string;
  public role : string;
  public sessionId : string;
  public phoneNumber : string;

  constructor(handle : string, role : string, sessionId : string, phoneNumber? : string) {
    this.typeNameMetaData = this.constructor.name;
    this.handle = handle;
    this.role = role;
    this.sessionId = sessionId;
    this.phoneNumber = phoneNumber;
  }
  public isModified(other : ChatParticipantVO) : boolean {
    if(other.sessionId !== this.sessionId) {
      throw new Error('Session ids do not match');
    }
    return other.handle !== this.handle || other.role !== this.role;
  }
}

export class ChatEvent extends EntityEvent {
  constructor() {
    super();
  }
}

export class ChatStartedEvent extends ChatEvent {
  constructor() {
    super();
  }
}

export class ChatParticipantJoinedEvent extends ChatEvent {
  public participant : ChatParticipantVO;

  constructor(participant : ChatParticipantVO) {
    super();
    this.participant = participant;
  }
}

export class ChatParticipantLeftEvent extends ChatEvent {
  public participant : ChatParticipantVO;

  constructor(participant : ChatParticipantVO) {
    super();
    this.participant = participant;
  }
}

export class ChatParticipantModifiedEvent extends ChatEvent {
  public fromParticipant : ChatParticipantVO;
  public toParticipant : ChatParticipantVO;

  constructor(fromParticipant : ChatParticipantVO, toParticipant : ChatParticipantVO) {
    super();
    this.fromParticipant = fromParticipant;
    this.toParticipant = toParticipant;
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
  public fromParticipant : ChatParticipantVO;
  public text : string;

  constructor(messageId : string, correlationId : string, fromParticipant : ChatParticipantVO, text : string) {
    super();
    this.messageId = messageId;
    this.correlationId = correlationId;
    this.fromParticipant = fromParticipant;
    this.text = text;
  }
}

export class ChatReadyForFulfillmentEvent extends ChatEvent {
  public requester : ChatParticipantVO;
  public fulfiller : ChatParticipantVO;
  public queue : string;
  public payload : {};

  constructor(requester : ChatParticipantVO, fulfiller : ChatParticipantVO, queue : string, payload : {}) {
    super();
    this.requester = requester;
    this.fulfiller = fulfiller;
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

export class ChatParticipantVerificationEvent extends ChatEvent {
  public participantSessionId : string;
  public state : string;
  public participantHandle : string;
  public participantRole : string;
  constructor(participantSessionId : string, state : string, participantHandle? : string, participantRole? : string) {
    super();
    this.participantSessionId = participantSessionId;
    this.state = state;
    this.participantHandle = participantHandle;
    this.participantRole = participantRole;
  }
}

export class Chat extends Entity {
  private started : boolean;
  private participants : { [key:string]:ChatParticipantVO } = {};
  private defaultQueueName : string;
  private chatQueue : string;
  private fulfillmentSequence : number = 0;
  private chatSequence : number = 1;

  constructor(id : string) {
    super(id, Entity.CONFIG((self : Chat, event : EntityEvent) : void => {
      if (event instanceof ChatStartedEvent) {
        self.started = true;
      } else if (event instanceof ChatParticipantJoinedEvent) {
        self.participants[event.participant.sessionId] = event.participant;
      } else if (event instanceof ChatParticipantLeftEvent) {
        delete self.participants[event.participant.sessionId];
      } else if (event instanceof ChatParticipantModifiedEvent) {
        self.participants[event.toParticipant.sessionId] = event.toParticipant;
      } else if (event instanceof ChatTransferredEvent) {
        if(!self.chatQueue) {
          self.defaultQueueName = event.toQueue;
        }
        self.chatQueue = event.toQueue;
      } else if (event instanceof ChatReadyForFulfillmentEvent) {
        self.fulfillmentSequence = self.chatSequence;
      } else if (event instanceof ChatEndedEvent) {
        self.chatSequence++;
      }
    }));
  }

  public start() : void {
    if (!this.started) {
      this.dispatch(this.id, new ChatStartedEvent());
    }
  }

  public join(participant : ChatParticipantVO) : void {
    if (this.participants.hasOwnProperty(participant.sessionId)) {
      const existingParticipant : ChatParticipantVO = this.participants[participant.sessionId];
      if(existingParticipant.isModified(participant)) {
        this.dispatch(this.id, new ChatParticipantModifiedEvent(existingParticipant, participant));
      }
    } else {
      this.dispatch(this.id, new ChatParticipantJoinedEvent(participant));
    }
  }

  public leave(participantSessionId : string) : void {
    if (this.participants.hasOwnProperty(participantSessionId)) {
      if(this.participants[participantSessionId].role === 'agent') {
        this.transferTo(this.defaultQueueName);
      }
      this.dispatch(this.id, new ChatParticipantLeftEvent(this.participants[participantSessionId]));
    }
  }

  public postMessage(participant : ChatParticipantVO, text : string) : Promise<{}> {
    if (this.chatQueue) {
      return new Promise((resolve : Function) : void => {
        this.start();
        this.join(participant);
        const event : ChatMessagePostedEvent = new ChatMessagePostedEvent(uuid(), `${this.id}_${this.chatSequence}`, participant, text);
        this.dispatch(this.id, event);
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

  public signalReadyForFulfillment(fulfillForParticipant: ChatParticipantVO, fulfillerParticipant: ChatParticipantVO, payload : {}) : void {
    if (this.fulfillmentSequence !== this.chatSequence) {
      this.dispatch(this.id, new ChatReadyForFulfillmentEvent(fulfillForParticipant, fulfillerParticipant, this.chatQueue, payload));
    }
  }

  public signalError(error : Error) : void {
    this.dispatch(this.id, new ChatErrorEvent(error));
  }

  public end() : void {
    this.dispatch(this.id, new ChatEndedEvent());
  }

}
