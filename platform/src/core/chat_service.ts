import { Chat, ChatParticipantVO } from './chat';
import { EntityRepository } from './entity/entity';

export class ChatService {
  private entityRepository : EntityRepository;

  constructor(entityRepository : EntityRepository) {
    this.entityRepository = entityRepository;
  }

  public startChat(chatId : string, participant : ChatParticipantVO) : Promise<void> {
    return this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        chat.start();
        chat.join(participant);
      })
      .catch((error : Error) => {
        throw error;
      });
  }

  public joinChat(chatId : string, participant : ChatParticipantVO) : Promise<void> {
    return this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        chat.join(participant);
      });
  }

  public postMessage(chatId : string, participant : ChatParticipantVO, text : string, hidden : boolean = false) : void {
    this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        chat
          .postMessage(participant, text, hidden)
          .catch((error : Error) => {
            console.error(error);
          });
      })
      .catch((error : Error) => {
        throw error;
      });
  }

  public postStatus(chatId : string, text : string) : void {
    this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        chat
          .postStatus(text);
      })
      .catch((error : Error) => {
        throw error;
      });
  }

  public transferTo(chatId : string, queue : string) : void {
    this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        chat.transferTo(queue);
      })
      .catch((error : Error) => {
        throw error;
      });
  }

  public signalReadyForFulfillment(chatId : string,
                                   fulfillForParticipant: ChatParticipantVO,
                                   fulfillerParticipant: ChatParticipantVO,
                                   payload : {}) : void {
    this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        chat.signalReadyForFulfillment(fulfillForParticipant, fulfillerParticipant, payload);
      })
      .catch((error : Error) => {
        throw error;
      });
  }

  public signalError(chatId : string, error : Error) : void {
    this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        chat.signalError(error);
      })
      .catch((error : Error) => {
        throw error;
      });
  }

  public leaveChat(chatId : string, participantSessionId : string) : void {
    this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        chat.leave(participantSessionId);
      })
      .catch((error : Error) => {
        throw error;
      });
  }

  public endChat(chatId : string) : void {
    this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        chat.end();
      })
      .catch((error : Error) => {
        throw error;
      });
  }

}
