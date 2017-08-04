import { Chat, ChatDestinationProvider } from './chat';
import { EntityRepository } from './entity/entity';

export class ChatService {
  private entityRepository : EntityRepository;
  private chatDestinationProvider : ChatDestinationProvider;

  constructor(entityRepository : EntityRepository, chatDestinationProvider : ChatDestinationProvider) {
    this.entityRepository = entityRepository;
    this.chatDestinationProvider = chatDestinationProvider;
  }

  public postMessage(chatId : string, source : string, text : string) : void {
    this.entityRepository
      .load(Chat, chatId)
      .then((chat : Chat) => {
        const chatQueue : string = 'CCaaSBot'; // add some sort of routing logic here
        chat.transferTo(chatQueue);
        chat
          .postMessage(source, text, this.chatDestinationProvider)
          .catch((error : Error) => {
            console.error(error);
          });
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
