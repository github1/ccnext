import { Task } from './task';
import { EntityRepository } from './entity/entity';
import { v4 } from 'uuid';

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
    const taskId : string = data['taskId'] || v4();
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
}
