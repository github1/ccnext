import { Entity, EntityEvent } from './entity/entity';
import { Clock } from './clock';

export class TaskEvent implements EntityEvent {
  public time : number;
  public taskData : { [key:string]:string};
  public worker : string;
  constructor(taskData : { [key:string]:string}) {
    this.time = Clock.now();
    this.taskData = taskData;
  }
}

export class TaskSubmittedEvent extends TaskEvent {
  constructor(taskData : { [key:string]:string}) {
    super(taskData);
  }
}

export class TaskAmendedEvent extends TaskEvent {
  constructor(taskData : { [key:string]:string}) {
    super(taskData);
  }
}

export class TaskAssignedEvent extends TaskEvent {
  constructor(worker : string, taskData : { [key:string]:string }) {
    super(taskData);
    this.worker = worker;
  }
}

export class TaskCompletedEvent extends TaskEvent {
  public reason : string;
  constructor(reason : string, worker : string, taskData : { [key:string]:string}) {
    super(taskData);
    this.reason = reason;
    this.worker = worker;
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
        self.taskData = Object.assign({}, self.taskData, event.taskData);
      } else if (event instanceof TaskAssignedEvent) {
        self.assignedWorker = event.worker;
      } else if (event instanceof TaskCompletedEvent) {
        self.isComplete = true;
      }
    }));
  }

  public submit(data : { [key:string]:string}) : void {
    if (this.taskData === null) {
      this.dispatch(this.id, new TaskSubmittedEvent(data));
    }
  }

  public amend(data : { [key:string]:string}) : void {
    this.dispatch(this.id, new TaskAmendedEvent(data));
  }

  public assign(worker : string) : void {
    if (this.taskData === null) {
      throw new Error('task not submitted yet');
    } else if (this.isComplete) {
      throw new Error('task is complete');
    }
    this.dispatch(this.id, new TaskAssignedEvent(worker, this.taskData));
  }

  public complete(reason : string) : void {
    if (this.taskData === null) {
      throw new Error('task not submitted yet');
    }
    if (!this.isComplete) {
      this.dispatch(this.id, new TaskCompletedEvent(reason, this.assignedWorker, this.taskData));
    }
  }

}
