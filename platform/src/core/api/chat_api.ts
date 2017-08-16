import * as express from 'express';
import {
  EventBus,
  EntityEvent
} from '../entity/entity';
import { IdentityRegisteredEvent } from '../identity';
import {
  ChatMessagePostedEvent,
  ChatParticipantJoinedEvent,
  ChatParticipantLeftEvent
} from '../chat';
import { ChatService } from '../chat_service';

export function chatAPI(eventBus : EventBus, chatService : ChatService) : { preConfigure: Function } {

  type Msg = { [key:string]:string };

  type ChatLog = { [key:string]:EntityEvent[] };

  const chatLog : ChatLog = {};

  const chatParticipantRoles : Msg = {
    visitor: 'customer',
    CCaaSBot: 'bot'
  };

  eventBus.subscribe(
    (event : EntityEvent) => {
      if (event instanceof ChatMessagePostedEvent) {
        chatLog[event.streamId] = chatLog[event.streamId] || [];
        if(/^sms-incoming/.test(event.fromParticipant)) {
          event.fromParticipantRole = 'customer';
        } else {
          event.fromParticipantRole = chatParticipantRoles[event.fromParticipant];
        }
        chatLog[event.streamId].push(event);
      } else if (event instanceof ChatParticipantJoinedEvent || event instanceof ChatParticipantLeftEvent) {
        chatLog[event.streamId] = chatLog[event.streamId] || [];
        chatLog[event.streamId].push(event);
      } else if (event instanceof IdentityRegisteredEvent) {
        chatParticipantRoles[event.streamId] = event.role;
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
        if(req.headers['user-id'] && req.headers['user-session-id']) {
          chatService.linkIdentity(params.chatId, req.headers['user-id'].toString(), req.headers['user-session-id'].toString());
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
