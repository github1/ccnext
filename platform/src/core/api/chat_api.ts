import * as express from 'express';
import {
  EventBus,
  EventBusSubscription,
  EntityRepository
} from '../entity/entity';
import {
  Chat,
  ChatDestinationProvider,
  ChatMessagePostedEvent
} from '../chat';
import * as expressWS from 'express-ws';

type WebSocket  = { on: Function, send : Function };
interface WSApplication extends express.Application {
  on: Function;
  ws : Function;
}

export function chatAPI(chatDestinationProvider : ChatDestinationProvider,
                        entityRepository : EntityRepository,
                        eventBus : EventBus) : { preConfigure: Function } {

  return {
    preConfigure(app : WSApplication): void {

      (<Function>expressWS)(app);

      app.ws('/ws/register', (ws : WebSocket) => {
        const subscription : EventBusSubscription = eventBus.subscribe((event : { name: string, payload: {} }) => {
          switch (event.name) {
            case 'ChatMessagePostedEvent':
              const chatMessagePostedEvent : ChatMessagePostedEvent = (<ChatMessagePostedEvent>event.payload);
              ws.send(JSON.stringify({
                from: chatMessagePostedEvent.source,
                text: chatMessagePostedEvent.text
              }));
              break;
            default:
          }
        });

        ws.on('message', (msg : string) => {
          type Msg = { chatId : string, source : string, text : string, end : boolean };
          const payload : Msg = (<Msg>JSON.parse(msg));
          entityRepository
            .load(Chat, payload.chatId)
            .then((chat : Chat) => {
              if(payload.end) {
                chat.end();
              } else {
                const chatQueue : string = 'OrderFlowers'; // might need some sort of routing logic here
                chat.transferTo(chatQueue);
                chat.postMessage(payload.source, payload.text, chatDestinationProvider);
              }
            })
            .catch((error : Error) => {
              console.error(error);
            });
        });

        ws.on('close', () => {
          subscription.unsubscribe();
        });

      });

    }
  };
}
