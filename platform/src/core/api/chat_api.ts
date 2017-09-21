import * as express from 'express';
import {
  EventBus,
  EventStore,
  EntityEvent
} from 'ddd-es-node';
import {
  AuthenticationVerificationRequestedEvent,
  AuthenticationVerificationSucceededEvent
} from '../identity';
import {
  ChatParticipantVO,
  ChatParticipantVerificationEvent
} from '../chat';
import { ChatService } from '../chat_service';
import { chatsByParticipantSessionId, ChatProjectionItem } from '../projection/projection';

export function chatAPI(eventBus : EventBus, eventStore : EventStore, chatService : ChatService) : { preConfigure: Function } {

  type Msg = { [key:string]:string };

  eventBus.subscribe(
    (event : EntityEvent, isReplaying : boolean) => {
      if (event instanceof AuthenticationVerificationRequestedEvent) {
        chatsByParticipantSessionId(event.streamId, (chats : ChatProjectionItem[]) => {
          chats.forEach((chat : ChatProjectionItem) => {
            const syntheticEvent : ChatParticipantVerificationEvent = new ChatParticipantVerificationEvent(
              event.requestId,
              event.streamId,
              'requested');
            syntheticEvent.streamId = chat.chatId;
            if (!isReplaying) {
              eventBus.emit(syntheticEvent);
            }
          });
        });
      } else if (event instanceof AuthenticationVerificationSucceededEvent) {
        chatsByParticipantSessionId(event.streamId, (chats : ChatProjectionItem[]) => {
          chats.forEach((chat : ChatProjectionItem) => {
            const syntheticEvent : ChatParticipantVerificationEvent =
              new ChatParticipantVerificationEvent(
                event.requestId,
                event.streamId,
                'succeeded',
                event.username,
                event.role);
            syntheticEvent.streamId = chat.chatId;
            if (!isReplaying) {
              eventBus.emit(syntheticEvent);
            }
          });
        });
      }
    });

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
          chatService.startChat(params.chatId, chatParticipant); // tslint:disable-line:no-floating-promises
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
        const log : EntityEvent[] = [];
        eventStore.replay(params.chatId, (event : EntityEvent) => {
          log.push(event);
        },() => {
          res.json(log);
        });
      });

    }
  };
}
