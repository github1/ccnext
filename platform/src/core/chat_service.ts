import { Chat } from './chat';
import { EntityRepository } from './entity/entity';

export class ChatService {
  private entityRepository : EntityRepository;

  constructor(entityRepository : EntityRepository) {
    this.entityRepository = entityRepository;
  }

  public startChat(chatId : string, user : string) : void {
    this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        chat.start(user);
      })
      .catch((error : Error) => {
        throw error;
      });
  }

  public linkIdentity(chatId : string, participant : string, identityId : string) : void {
    this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        chat.linkIdentity(participant, identityId);
      })
      .catch((error : Error) => {
        throw error;
      });
  }

  public postMessage(chatId : string, fromParticipant : string, text : string) : void {
    this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        chat.defaultQueue('CCaaSBot');
        chat
          .postMessage(fromParticipant, text)
          .catch((error : Error) => {
            console.error(error);
          });
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

  public signalReadyForFulfillment(chatId : string, onBehalfOf : string, payload : {}) : void {
    this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        chat.signalReadyForFulfillment(onBehalfOf, payload);
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

  public leaveChat(chatId : string, participant : string) : void {
    this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        chat.leave(participant);
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
