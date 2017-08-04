import * as express from 'express';
import {
  EventBus,
  EventBusSubscription
} from '../entity/entity';
import {
  ChatMessagePostedEvent
} from '../chat';
import { ChatService } from '../chat_service';
import * as expressWS from 'express-ws';

type WebSocket  = { on: Function, send : Function };
interface WSApplication extends express.Application {
  on: Function;
  ws : Function;
}

export function chatAPI(chatService : ChatService,
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
          if (payload.end) {
            chatService.endChat(payload.chatId);
          } else {
            chatService.postMessage(payload.chatId, payload.source, payload.text);
          }
        });

        ws.on('close', () => {
          subscription.unsubscribe();
        });

      });

    }
  };
}
