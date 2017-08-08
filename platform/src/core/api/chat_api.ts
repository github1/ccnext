import * as express from 'express';
import {
  EventBus,
  EventRecord
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

      const wsChats : { [key:string]: WebSocket } = {};

      eventBus.subscribe((event : EventRecord) => {
        if (wsChats[event.stream]) {
          switch (event.name) {
            case 'ChatMessagePostedEvent':
              const chatMessagePostedEvent : ChatMessagePostedEvent = (<ChatMessagePostedEvent>event.payload);
              wsChats[event.stream].send(JSON.stringify({
                from: chatMessagePostedEvent.source,
                text: chatMessagePostedEvent.text
              }));
              break;
            case 'ChatErrorEvent':
              console.log(event);
              break;
            default:
          }
        }
      });

      app.ws('/ws/register', (ws : WebSocket) => {

        let wsChatId : string;

        ws.on('message', (msg : string) => {
          type Msg = { chatId : string, source : string, text : string, end : boolean, register : boolean };
          const payload : Msg = (<Msg>JSON.parse(msg));
          wsChatId = payload.chatId;
          wsChats[payload.chatId] = ws;
          if (payload.register) {
            chatService.startChat(payload.chatId, payload.source);
          } else if (payload.end) {
            chatService.endChat(payload.chatId);
          } else {
            chatService.postMessage(payload.chatId, payload.source, payload.text);
          }
        });

        ws.on('close', () => {
          if(wsChats[wsChatId]) {
            delete wsChats[wsChatId];
          }
        });

      });

    }
  };
}
