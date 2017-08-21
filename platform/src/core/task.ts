import { Entity, EntityEvent } from './entity/entity';

export class TaskEvent extends EntityEvent {
  public taskData : { [key:string]:string};
  public worker : string;
  constructor(taskData : { [key:string]:string}) {
    super();
    this.taskData = taskData;
  }
}

export class TaskSubmittedEvent extends TaskEvent {
  constructor(taskData : { [key:string]:string}) {
    super(taskData);
  }
}

export class TaskAmendedEvent extends TaskEvent {
  public amendedTaskData : { [key:string]:string};
  constructor(amendedTaskData : { [key:string]:string}, taskData : { [key:string]:string}) {
    super(taskData);
    this.amendedTaskData = amendedTaskData;
  }
}

export class TaskStatusChangedEvent extends TaskEvent {
  public status : string;
  public reason : string;
  constructor(status : string, reason : string, worker : string, taskData : { [key:string]:string}) {
    super(taskData);
    this.status = status;
    this.reason = reason;
    this.worker = worker;
  }
}

export class TaskAssignedEvent extends TaskStatusChangedEvent {
  constructor(worker : string, taskData : { [key:string]:string }) {
    super('assigned', 'Task Assigned', worker, taskData);
  }
}

export class TaskCompletedEvent extends TaskStatusChangedEvent {
  constructor(reason : string, worker : string, taskData : { [key:string]:string}) {
    super('completed', reason, worker, taskData);
  }
}

export class TaskCancelledEvent extends TaskStatusChangedEvent {
  constructor(reason : string, worker : string, taskData : { [key:string]:string}) {
    super('cancelled', reason, worker, taskData);
  }
}

export class Task extends Entity {
  private taskData : { [key:string]:string} = null;
  private assignedWorker : string;
  private isComplete : boolean = false;

  constructor(id : string) {
    super(id, Entity.CONFIG((self : Task, event : EntityEvent) : void => {
      if (event instanceof TaskSubmittedEvent) {
        self.taskData = event.taskData;
      } else if (event instanceof TaskAmendedEvent) {
        self.taskData = Object.assign({}, self.taskData, event.amendedTaskData);
      } else if (event instanceof TaskAssignedEvent) {
        self.assignedWorker = event.worker;
      } else if (event instanceof TaskStatusChangedEvent) {
        if (['completed', 'cancelled'].indexOf(event.status) > -1) {
          self.isComplete = true;
        }
      }
    }));
  }

  public submit(data : { [key:string]:string}) : void {
    if (this.taskData === null) {
      this.dispatch(this.id, new TaskSubmittedEvent(data));
    }
  }

  public amend(data : { [key:string]:string}) : void {
    const event : TaskAmendedEvent = new TaskAmendedEvent(data, this.taskData);
    event.worker = this.assignedWorker;
    this.dispatch(this.id, event);
  }

  public assign(worker : string) : void {
    if (this.taskData === null) {
      throw new Error('task not submitted yet');
    } else if (this.isComplete) {
      throw new Error('task is complete');
    }
    if(this.assignedWorker !== worker) {
      this.dispatch(this.id, new TaskAssignedEvent(worker, this.taskData));
    }
  }

  public complete(reason : string) : void {
    if (this.taskData === null) {
      throw new Error('task not submitted yet');
    }
    if (!this.isComplete) {
      this.dispatch(this.id, new TaskCompletedEvent(reason, this.assignedWorker, this.taskData));
    }
  }

  public cancel(reason : string): void {
    if (this.taskData === null) {
      throw new Error('task not submitted yet');
    }
    if (!this.isComplete) {
      this.dispatch(this.id, new TaskCancelledEvent(reason, this.assignedWorker, this.taskData));
    }
  }

}
