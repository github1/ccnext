import { Task } from './task';
import { EntityRepository, uuid } from 'ddd-es-node';

export interface TaskVO {
  id : string;
  data: { [key:string]:string };
}

export class TaskService {

  private entityRepository : EntityRepository;

  constructor(entityRepository : EntityRepository) {
    this.entityRepository = entityRepository;
  }

  public submitTask(queue : string, data : { [key:string]:string}) : Promise<TaskVO> {
    const taskId : string = data['taskId'] || uuid();
    data['taskId'] = taskId;
    data['queue'] = queue;
    return this.entityRepository
      .load(Task, taskId)
      .then((task : Task) => {
        task.submit(data);
        return {
          id: taskId,
          data: data
        };
      });
  }

  public amendTask(taskId : string, data : { [key:string]:string}) : Promise<TaskVO> {
    return this.entityRepository
      .load(Task, taskId)
      .then((task : Task) => {
        task.amend(data);
        return {
          id: taskId,
          data: data
        };
      });
  }

  public assignTask(taskId : string, worker : string) : Promise<{}> {
    return this.entityRepository
      .load(Task, taskId)
      .then((task : Task) => {
        task.assign(worker);
        return task;
      });
  }

  public markTaskComplete(taskId : string, reason : string) : Promise<{}> {
    return this.entityRepository
      .load(Task, taskId)
      .then((task : Task) => {
        task.complete(reason);
        return task;
      });
  }

  public cancelTask(taskId : string, reason : string) : Promise<{}> {
    return this.entityRepository
      .load(Task, taskId)
      .then((task : Task) => {
        task.cancel(reason);
        return task;
      });
  }
}
