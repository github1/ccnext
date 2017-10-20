import { EventBus, EntityEvent } from 'ddd-es-node';
import {
  ChatStartedEvent,
  ChatParticipantJoinedEvent,
  ChatParticipantLeftEvent,
  ChatMessagePostedEvent
} from '../chat';
import { TaskSubmittedEvent, TaskAssignedEvent } from '../task';
import { IdentityRegisteredEvent } from '../identity';

export class TaskProjectionItem {
  public taskId : string;
  public channel : string;
  public queue : string;
  public chatId : string;
  public customerUsername : string;
  public customerSessionId : string;
  public assignedWorker : string;

  constructor(taskId : string) {
    this.taskId = taskId;
  }
}

export class ChatProjectionItem {
  public chatId : string;
  public customerUsername : string;
  public customerSessionId : string;
  public customerPhoneNumber : string;
  public participantSessionIds : Set<string> = new Set<string>();
  public active : boolean = false;
  public messagesSentBeforeBotJoined : ChatMessagePostedEvent[] = [];

  constructor(chatId : string) {
    this.chatId = chatId;
  }
  public isCustomerOnSms() : boolean {
    return this.customerSessionId && this.customerSessionId.indexOf('sms-incoming') > -1;
  }
}

export class UserProjectionItem {
  public username : string;
  public firstName : string;
  public lastName : string;
  public phoneNumber : string;
  public role : string;

  constructor(username : string,
              firstName : string,
              lastName : string,
              phoneNumber : string,
              role : string) {
    this.username = username;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phoneNumber = phoneNumber;
    this.role = role;
  }
}

const tasks : Map<string, TaskProjectionItem> = new Map<string, TaskProjectionItem>();
const tasksByChatId : Map<string, TaskProjectionItem> = new Map<string, TaskProjectionItem>();
const chats : Map<string, ChatProjectionItem> = new Map<string, ChatProjectionItem>();
const users : Map<string, UserProjectionItem> = new Map<string, UserProjectionItem>();

const fetch = <T>(data : Map<string, T>, id : string, func : (item : T) => void, notPresent? : () => void) : void => {
  if (data.has(id)) {
    func(data.get(id));
  } else if (notPresent) {
    notPresent();
  }
};

export const taskById = (taskId : string, func : (task : TaskProjectionItem) => void) => {
  fetch(tasks, taskId, func);
};

export const taskByChatId = (chatId : string, func : (task : TaskProjectionItem) => void, notPresent? : () => void) => {
  fetch(tasksByChatId, chatId, func, notPresent);
};

export const chatById = (chatId : string, func : (chat : ChatProjectionItem) => void, notPresent? : () => void) => {
  fetch(chats, chatId, func, notPresent);
};

export const userById = (username : string, func : (user : UserProjectionItem) => void) => {
  fetch(users, username, func);
};

export const userByPhoneNumber = (phoneNumber : string, func : (users : UserProjectionItem) => void) => {
  func(Array.from(users.values()).filter((user : UserProjectionItem) => {
    return user.phoneNumber === phoneNumber;
  })[0]);
};

export const allUsers = (func : (users : UserProjectionItem[]) => void) => {
  func(Array.from(users.values()));
};

export const chatsByParticipantSessionId = (sessionId : string, func : (arr : ChatProjectionItem[]) => void) => {
  func(Array.from(chats.values()).filter((chat : ChatProjectionItem) => {
    return chat.participantSessionIds.has(sessionId);
  }));
};

export const tasksByParticipantSessionId = (sessionId : string, func : (arr : TaskProjectionItem[]) => void) => {
  func(Array.from(tasks.values()).filter((task : TaskProjectionItem) => {
    return task.customerSessionId === sessionId;
  }));
};

export const Projection = (eventBus : EventBus) : void => { // tslint:disable-line:variable-name
  eventBus.subscribe((event : EntityEvent) => {
    if (event instanceof TaskSubmittedEvent) {
      const task : TaskProjectionItem = new TaskProjectionItem(event.streamId);
      task.channel = event.taskData.channel;
      task.chatId = event.taskData.chatId;
      task.queue = event.taskData.queue;
      tasks.set(event.streamId, task);
      if (task.channel === 'chat') {
        tasksByChatId.set(task.chatId, task);
      }
    } else if (event instanceof TaskAssignedEvent) {
      taskById(event.streamId, (task : TaskProjectionItem) => {
        task.assignedWorker = event.worker;
        if (task.channel === 'chat') {
          fetch(chats, task.chatId, (chat : ChatProjectionItem) => {
            task.customerUsername = chat.customerUsername;
            task.customerSessionId = chat.customerSessionId;
          });
        } else if (task.channel === 'voice') {
          task.customerUsername = event.taskData.from;
          task.customerSessionId = event.taskData.call_sid; // tslint:disable-line:variable-name
        }
      });
    } else if (event instanceof ChatStartedEvent) {
      chats.set(event.streamId, new ChatProjectionItem(event.streamId));
    } else if (event instanceof ChatParticipantJoinedEvent) {
      chatById(event.streamId, (chat : ChatProjectionItem) => {
        chat.participantSessionIds.add(event.participant.sessionId);
        if (event.participant.role === 'customer' || event.participant.role === 'visitor') {
          chat.customerUsername = event.participant.handle;
          chat.customerSessionId = event.participant.sessionId;
          chat.customerPhoneNumber = event.participant.phoneNumber;
        } else {
          // agent or bot joined
          chat.active = true;
        }
      });
    } else if (event instanceof ChatParticipantLeftEvent) {
      chatById(event.streamId, (chat : ChatProjectionItem) => {
        chat.participantSessionIds.delete(event.participant.sessionId);
      });
    } else if (event instanceof ChatMessagePostedEvent) {
      chatById(event.streamId, (chat : ChatProjectionItem) => {
        if(!chat.active) {
          chat.messagesSentBeforeBotJoined.push(event);
        }
      });
    } else if (event instanceof IdentityRegisteredEvent) {
      users.set(event.streamId, new UserProjectionItem(
        event.username,
        event.firstName,
        event.lastName,
        event.phoneNumber,
        event.role));
    }
  }, {replay: true});
};
