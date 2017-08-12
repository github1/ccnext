import ajax from './ajax';
import { identity, jwt } from './identity';

export const getTasks = () => {
  const id = identity();
  return ajax({
    url: `/api/worker/${id.username}/tasks`,
    method: 'get',
    headers: {
      jwt: jwt()
    }
  }).then((result) => {
    return Object.keys(result).map((taskId) => result[taskId]);
  });
};

export const markTaskComplete = (taskId, reason) => {
  return ajax({
    url: `/api/tasks/${taskId}`,
    method: 'post',
    headers: {
      jwt: jwt()
    },
    data: {
      command: 'complete',
      reason: reason
    }
  });
};
