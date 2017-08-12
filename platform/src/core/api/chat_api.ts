import * as express from 'express';
import {
  EventBus,
  EventRecord
} from '../entity/entity';
import { ChatService } from '../chat_service';

export function chatAPI(eventBus : EventBus, chatService : ChatService) : { preConfigure: Function } {

  type Msg = { [key:string]:string };

  type ChatLog = { [key:string]:EventRecord[] };

  const chatLog : ChatLog = {};

  eventBus.subscribe(
    (event : EventRecord) => {
      if (event.name === 'ChatMessagePostedEvent') {
        chatLog[event.stream] = chatLog[event.stream] || [];
        chatLog[event.stream].push(event);
      }
    },
    {replay: true});

  return {
    preConfigure(app : express.Application): void {

      app.post('/api/chat/:chatId', (req : express.Request, res : express.Response) : void => {
        const body : Msg = <Msg> req.body;
        const params : Msg = <Msg> req.params;
        if (body.text) {
          chatService.postMessage(params.chatId, body.source, body.text);
        } else {
          chatService.startChat(params.chatId, body.source);
        }
        res.json({});
      });

      app.delete('/api/chat/:chatId', (req : express.Request, res : express.Response) : void => {
        const params : Msg = <Msg> req.params;
        chatService.endChat(params.chatId);
        res.status(204).json({});
      });

      app.get('/api/chat/:chatId', (req : express.Request, res : express.Response) : void => {
        const params : Msg = <Msg> req.params;
        res.json(chatLog[params.chatId]);
      });

    }
  };
}
