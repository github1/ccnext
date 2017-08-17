/* tslint:disable:no-unsafe-any */
import * as express from 'express';
import { TaskEvent, TaskStatusChangedEvent, TaskAmendedEvent } from './../task';
import { TaskService } from './../task_service';
import { EventBus, EventRecord } from './../entity/entity';

export function taskAPI(eventBus : EventBus, taskService : TaskService) : { preConfigure: Function } {

  const taskAssignments : {} = {};

  eventBus.subscribe(
    (event : EventRecord, isReplaying : boolean) => {
      if(event.payload instanceof TaskEvent) {
        let emitEventName : string;
        const taskEvent : TaskEvent = (<TaskEvent>event.payload);
        let taskData = JSON.parse(JSON.stringify(taskEvent.taskData));
        const taskId = taskData['taskId'];
        const worker = taskEvent.worker;
        taskAssignments[worker] = taskAssignments[worker] || {};
        if (event.payload instanceof TaskStatusChangedEvent) {
          const taskStatusChangedEvent : TaskStatusChangedEvent = (<TaskStatusChangedEvent>event.payload);
          taskData['status'] = taskStatusChangedEvent.status;
          taskData[`${taskStatusChangedEvent.status}AtTime`] = taskStatusChangedEvent.time;
          emitEventName = 'WorkerTaskStatusUpdatedEvent';
        } else if (event.payload instanceof TaskAmendedEvent) {
          const taskAmendedEvent : TaskAmendedEvent = (<TaskAmendedEvent>event.payload);
          taskData = Object.assign({}, taskData, taskAmendedEvent.amendedTaskData);
          emitEventName = 'WorkerTaskDataUpdatedEvent';
        }
        if(emitEventName) {
          taskAssignments[worker][taskId] = Object.assign({}, taskAssignments[worker][taskId], taskData);
          if (!isReplaying) {
            eventBus.emit({
              stream: worker,
              name: emitEventName,
              payload: {
                name: emitEventName,
                task: taskAssignments[worker][taskId]
              }
            });
          }
        }
      }
    },
    {replay: true});

  return {
    preConfigure(app : express.Application): void {

      app.get('/api/worker/:worker/tasks', (req : express.Request, res : express.Response) : void => {
        const params = req.params;
        res.json(taskAssignments[params.worker] || {});
      });

      app.post('/api/tasks/:task', (req : express.Request, res : express.Response) : void => {
        if (taskAssignments[req.headers['user-id'].toString()]) {
          if (req.body.command === 'complete') {
            taskService
              .markTaskComplete(req.params.task, req.body.reason)
              .catch((err : Error) => {
                console.error(err);
              });
          }
          res.json({});
        } else {
          res.status(403).json({status: 'denied'});
        }
      });

    }
  };
}
