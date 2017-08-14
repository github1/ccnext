import * as express from 'express';
import {
  EventBus,
  EventRecord
} from '../entity/entity';
import { IdentityRegisteredEvent } from '../identity';
import { ChatMessagePostedEvent } from '../chat';
import { ChatService } from '../chat_service';

export function chatAPI(eventBus : EventBus, chatService : ChatService) : { preConfigure: Function } {

  type Msg = { [key:string]:string };

  type ChatLog = { [key:string]:EventRecord[] };

  const chatLog : ChatLog = {};

  const chatParticipantRoles : Msg = {
    visitor: 'customer',
    CCaaSBot: 'bot'
  };

  eventBus.subscribe(
    (event : EventRecord) => {
      if (event.name === 'ChatMessagePostedEvent') {
        chatLog[event.stream] = chatLog[event.stream] || [];
        const payload : ChatMessagePostedEvent = (<ChatMessagePostedEvent>event.payload);
        if(/^sms-incoming/.test(payload.fromParticipant)) {
          payload.fromParticipantRole = 'customer';
        } else {
          payload.fromParticipantRole = chatParticipantRoles[payload.fromParticipant];
        }
        chatLog[event.stream].push(event);
      } else if (/^ChatParticipant(Joined|Left)Event$/.test(event.name)) {
        chatLog[event.stream] = chatLog[event.stream] || [];
        chatLog[event.stream].push(event);
      } else if (event.name === 'IdentityRegisteredEvent') {
        const payload : IdentityRegisteredEvent = (<IdentityRegisteredEvent> event.payload);
        chatParticipantRoles[event.stream] = payload.role;
      }
    },
    {replay: true});

  return {
    preConfigure(app : express.Application): void {

      app.post('/api/chat/:chatId', (req : express.Request, res : express.Response) : void => {
        const body : Msg = <Msg> req.body;
        const params : Msg = <Msg> req.params;
        if (body.text) {
          chatService.postMessage(params.chatId, body.fromParticipant, body.text);
        } else {
          chatService.startChat(params.chatId, body.fromParticipant);
        }
        res.json({});
      });

      app.delete('/api/chat/:chatId/participant/:participant', (req : express.Request, res : express.Response) : void => {
        const params : Msg = <Msg> req.params;
        chatService.leaveChat(params.chatId, params.participant);
        res.status(204).json({});
      });

      app.get('/api/chat/:chatId', (req : express.Request, res : express.Response) : void => {
        const params : Msg = <Msg> req.params;
        res.json(chatLog[params.chatId]);
      });

    }
  };
}
