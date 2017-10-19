/* tslint:disable:no-floating-promises */
import {
  EventBus,
  EntityEvent
} from 'ddd-es-node';
import {
  AuthenticationVerificationRequestedEvent,
  AuthenticationVerificationSucceededEvent
} from '../core/identity';
import {
  ChatParticipantVO,
  ChatStartedEvent,
  ChatMessagePostedEvent,
  ChatTransferredEvent,
  ChatParticipantJoinedEvent,
  ChatParticipantLeftEvent
} from '../core/chat';
import {
  TaskAssignedEvent,
  TaskCompletedEvent
} from '../core/task';
import { ChatService } from '../core/chat_service';
import { TaskService } from '../core/task_service';
import {
  taskById,
  taskByChatId,
  tasksByParticipantSessionId,
  TaskProjectionItem,
  chatById,
  chatsByParticipantSessionId,
  ChatProjectionItem,
  userById,
  UserProjectionItem
} from '../core/projection/projection';

export interface ChatRequest {
  message: string;
  correlationId: string;
  conversationData : { [key:string]:string };
}

export interface ChatResponse {
  reply(text : string) : void;
  signalReadyForFulfillment(data : {}) : void;
  signalFailed(text : string): void;
  signalError(error : Error) : void;
  nothing() : void;
  storeConversationData(data : { [key:string]:string });
}

export interface ChatDestination {
  send(request : ChatRequest, response : ChatResponse) : void;
}

export interface ChatDestinationProvider {
  getChat(id : string) : ChatDestination;
}

export class NullChatDestination implements ChatDestination {
  public send(request : ChatRequest, response : ChatResponse) : void {
    response.nothing();
  }
}

class BoundChatResponse implements ChatResponse {
  private chatId : string;
  private chatQueue : string;
  private fromParticipant : ChatParticipantVO;
  private chatService : ChatService;
  private correlationId : string;
  private selfParticipant : ChatParticipantVO;

  constructor(chatId : string,
              chatQueue : string,
              fromParticipant : ChatParticipantVO,
              chatService : ChatService,
              correlationId : string) {
    this.chatId = chatId;
    this.chatQueue = chatQueue;
    this.fromParticipant = fromParticipant;
    this.chatService = chatService;
    this.correlationId = correlationId;
    this.selfParticipant = new ChatParticipantVO(this.chatQueue, 'bot', this.chatQueue);
  }

  public reply(text : string) : void {
    this.chatService.postMessage(this.chatId, this.selfParticipant, text);
  }

  public signalReadyForFulfillment(data : {}) : void {
    this.chatService.signalReadyForFulfillment(this.chatId, this.fromParticipant, this.selfParticipant, data);
  }

  public signalFailed(text : string) : void {
    console.log('sf',text);
    this.reply(text);
    this.chatService.leaveChat(this.chatId, this.chatQueue);
    this.chatService.transferTo(this.chatId, 'agentChatQueue');
  }

  public signalError(error : Error) : void {
    console.log(error);
    this.chatService.signalError(this.chatId, error);
    this.chatService.leaveChat(this.chatId, this.chatQueue);
    this.chatService.transferTo(this.chatId, 'agentChatQueue');
  }

  public nothing() : void {
    // do nothing
  }

  public storeConversationData(data : { [key:string]:string }) : void {
    // TODO - revisit this
  }

}

export const chatRouter = (eventBus : EventBus,
                           chatDestinationProvider : ChatDestinationProvider,
                           chatService : ChatService,
                           taskService : TaskService) : void => {
  eventBus.subscribe(
    (event : EntityEvent) => {
      if (event instanceof ChatStartedEvent) {
        //chatService.transferTo(event.streamId, 'bot');
      } else if (event instanceof TaskAssignedEvent) {
        taskById(event.streamId, (task : TaskProjectionItem) => {
          console.log('task queue: ', event, task);
          if (task.queue === 'bot') {
            chatService.joinChat(task.chatId, new ChatParticipantVO(event.worker, 'bot', event.worker));
          }
          if(task.customerUsername) {
            if (task.customerUsername === 'visitor' || task.customerUsername.indexOf('+') === 0) {
              taskService.amendTask(task.taskId, {
                servicingUserData: JSON.stringify({
                  username: 'visitor',
                  role: 'visitor'
                }),
                servicingUserVerified: 'false',
                servicingUserSessionId: task.customerSessionId
              });
            } else {
              userById(task.customerUsername, (user : UserProjectionItem) => {
                taskService.amendTask(task.taskId, {
                  servicingUserData: JSON.stringify(user),
                  servicingUserVerified: 'false',
                  servicingUserSessionId: task.customerSessionId
                });
              });
            }
          }
        });
      } else if (event instanceof ChatMessagePostedEvent) {
        taskByChatId(event.streamId, (task : TaskProjectionItem) => {
          if (event.fromParticipant.handle === task.assignedWorker || !task.assignedWorker) {
            return;
          }
          const conversationData : { [key:string]:string } = {};
          if (task.customerSessionId) {
            conversationData['fromParticipantSessionId'] = task.customerSessionId;
          }
          chatDestinationProvider
            .getChat(task.assignedWorker)
            .send({
              message: event.text,
              correlationId: event.correlationId,
              conversationData: conversationData
            }, new BoundChatResponse(event.streamId, task.assignedWorker, event.fromParticipant, chatService, event.correlationId));
        });
      } else if (event instanceof ChatTransferredEvent) {
        taskByChatId(event.streamId, (task : TaskProjectionItem) => {
          if (event.fromQueue === 'bot') {
            taskService.markTaskComplete(task.taskId, `transferred to ${event.toQueue}`);
          }
        });
        /** handle this is ccsip_integrator
        // submit new task to next queue
        taskService.submitTask(event.toQueue, {
          channel: 'chat',
          chatId: event.streamId
        }).catch((error : Error) => {
          console.error('failed to create task', error);
        });
         */
      } else if (event instanceof ChatParticipantJoinedEvent) {
        chatService.postStatus(event.streamId, `${event.participant.handle} has joined the chat`);
        taskByChatId(event.streamId, (task : TaskProjectionItem) => {
          if (event.participant.role === 'visitor') {
            taskService.amendTask(task.taskId, {
              servicingUserData: JSON.stringify({
                username: event.participant.handle,
                role: event.participant.role
              }),
              servicingUserVerified: 'false',
              servicingUserSessionId: event.participant.sessionId
            });
          } else if (event.participant.role === 'customer') {
            userById(event.participant.handle, (user : UserProjectionItem) => {
              taskService.amendTask(task.taskId, {
                servicingUserData: JSON.stringify(user),
                servicingUserVerified: 'false'
              });
            });
          } else {
            chatById(event.streamId, (chat : ChatProjectionItem) => {
              let mpe : ChatMessagePostedEvent;
              while(chat.messagesSentBeforeBotJoined.length > 0) {
                mpe = chat.messagesSentBeforeBotJoined.shift();
                chatService.postMessage(event.streamId, mpe.fromParticipant, mpe.text, true);
              }
            });
          }
        });
      } else if (event instanceof ChatParticipantLeftEvent) {
        chatService.postStatus(event.streamId, `${event.participant.handle} has left the chat`);
        if(event.participant.role === 'agent') {
          // ugh ..
          chatService.transferTo(event.streamId, 'bot');
        }
      } else if (event instanceof AuthenticationVerificationRequestedEvent) {
        chatsByParticipantSessionId(event.streamId, (chats : ChatProjectionItem[]) => {
          chats.forEach((chat : ChatProjectionItem) => {
            chatService.postStatus(chat.chatId, 'identity verification requested');
          });
        });
      } else if (event instanceof AuthenticationVerificationSucceededEvent) {
        userById(event.username, (user : UserProjectionItem) => {
          if (user.role === 'customer') {
            tasksByParticipantSessionId(event.streamId, (tasks : TaskProjectionItem[]) => {
              tasks.forEach((task : TaskProjectionItem) => {
                taskService.amendTask(task.taskId, {
                  servicingUserData: JSON.stringify(user),
                  servicingUserVerified: 'true'
                });
              });
            });
          }
        });
        chatsByParticipantSessionId(event.streamId, (chats : ChatProjectionItem[]) => {
          chats.forEach((chat : ChatProjectionItem) => {
            chatService.postStatus(chat.chatId, 'identity verification succeeded');
          });
        });
      } else if (event instanceof TaskCompletedEvent) {
        if (event.taskData.chatId) {
          chatService.endChat(event.taskData.chatId);
        }
      }
    });

};
