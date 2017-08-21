import ajax from './ajax';
import { identity } from './identity';
import { getChatLog, startChat, leaveChat } from './chat';
import { subscribeTo } from './events';

export const getTasks = () => {
  const id = identity();
  return ajax({
    url: `/api/worker/${id.username}/tasks`,
    method: 'get'
  }).then((result) => {
    return Object.keys(result).map((taskId) => result[taskId]);
  }).then((tasks) => populateTasks(tasks));
};

export const markTaskComplete = (task, reason) => {
  const id = identity();
  return ajax({
    url: `/api/tasks/${task.taskId}`,
    method: 'post',
    data: {
      command: 'complete',
      reason: reason
    }
  }).then(() => {
    if(task.channel === 'chat') {
      return leaveChat(task.chatId, id.username);
    }
  });
};

export const populateTasks = (tasks) => {
  const id = identity();
  return Promise.all((tasks.constructor === Array ? tasks : [tasks]).map((task) => {
    if (task.channel === 'chat') {
      return getChatLog(task.chatId).then((chatLog) => {
        task.chatLog = chatLog;
        if(task.status === 'assigned') {
          return subscribeTo(task.chatId).then(() => {
            return startChat(task.chatId, id.username).then(() => {
              return task;
            });
          });
        } else {
          return task;
        }
      });
    } else {
      return Promise.resolve(task);
    }
  }));
};
