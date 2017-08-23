import * as express from 'express';
import {
  EventBus,
  EntityEvent
} from '../entity/entity';
import {
  AuthenticationVerificationRequestedEvent,
  AuthenticationVerificationSucceededEvent,
  AuthenticationSucceededEvent
} from '../identity';
import {
  ChatParticipantVO,
  ChatMessagePostedEvent,
  ChatParticipantJoinedEvent,
  ChatParticipantLeftEvent,
  ChatParticipantModifiedEvent,
  ChatParticipantVerificationEvent
} from '../chat';
import { ChatService } from '../chat_service';

export function chatAPI(eventBus : EventBus, chatService : ChatService) : { preConfigure: Function } {

  type Msg = { [key:string]:string };
  type ChatLogEntry = { [key:string]:EntityEvent[] };

  const chatParticipants : { [key:string]:Set<string> } = {};
  const chatLog : ChatLogEntry = {};

  eventBus.subscribe(
    (event : EntityEvent, isReplaying : boolean) => {
      if (event instanceof ChatMessagePostedEvent ||
        event instanceof ChatParticipantJoinedEvent ||
        event instanceof ChatParticipantLeftEvent ||
        event instanceof ChatParticipantModifiedEvent) {
        chatLog[event.streamId] = chatLog[event.streamId] || [];
        chatLog[event.streamId].push(event);
        if (event instanceof ChatParticipantJoinedEvent) {
          chatParticipants[event.participant.sessionId] = chatParticipants[event.participant.sessionId] || new Set<string>();
          chatParticipants[event.participant.sessionId].add(event.streamId);
        } else if (event instanceof ChatParticipantLeftEvent) {
          if (chatParticipants[event.participant.sessionId]) {
            chatParticipants[event.participant.sessionId].delete(event.streamId);
          }
        }
      } else if (event instanceof AuthenticationSucceededEvent) {
        if (chatParticipants[event.streamId]) {
          chatParticipants[event.streamId].forEach((chatId : string) => {
            chatService.joinChat(chatId, new ChatParticipantVO(event.username, event.role, event.streamId))
              .catch((err : Error) => {
                console.error(err);
              });
          });
        }
      } else if (event instanceof AuthenticationVerificationRequestedEvent) {
        if (chatParticipants[event.streamId]) {
          chatParticipants[event.streamId].forEach((chatId : string) => {
            const syntheticEvent : ChatParticipantVerificationEvent = new ChatParticipantVerificationEvent(
              event.requestId,
              event.streamId,
              'requested');
            syntheticEvent.streamId = chatId;
            if (!isReplaying) {
              eventBus.emit(syntheticEvent);
            }
            chatLog[chatId].push(syntheticEvent);
          });
        }
      } else if (event instanceof AuthenticationVerificationSucceededEvent) {
        if (chatParticipants[event.streamId]) {
          chatParticipants[event.streamId].forEach((chatId : string) => {
            const syntheticEvent : ChatParticipantVerificationEvent =
              new ChatParticipantVerificationEvent(
                event.requestId,
                event.streamId,
                'succeeded',
                event.username,
                event.role);
            syntheticEvent.streamId = chatId;
            if (!isReplaying) {
              eventBus.emit(syntheticEvent);
            }
            chatLog[chatId].push(syntheticEvent);
          });
        }
      }
    },
    {replay: true});

  return {
    preConfigure(app : express.Application): void {

      app.post('/api/chat/:chatId', (req : express.Request, res : express.Response) : void => {
        const body : Msg = <Msg> req.body;
        const params : Msg = <Msg> req.params;
        const userId : string = req.headers['user-id'].toString();
        const userRole : string = req.headers['user-role'].toString();
        const userSessionId : string = req.headers['user-session-id'].toString();
        const chatParticipant : ChatParticipantVO = new ChatParticipantVO(userId, userRole, userSessionId);
        if (body.text) {
          chatService.postMessage(params.chatId, chatParticipant, body.text);
        } else {
          chatService.startChat(params.chatId, chatParticipant);
        }
        res.json({});
      });

      app.delete('/api/chat/:chatId', (req : express.Request, res : express.Response) : void => {
        const params : Msg = <Msg> req.params;
        chatService.leaveChat(params.chatId, req.headers['user-session-id'].toString());
        res.status(204).json({});
      });

      app.get('/api/chat/:chatId', (req : express.Request, res : express.Response) : void => {
        const params : Msg = <Msg> req.params;
        res.json(chatLog[params.chatId]);
      });

    }
  };
}
