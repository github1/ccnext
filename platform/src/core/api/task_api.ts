/* tslint:disable:no-unsafe-any */
import * as express from 'express';
import { TaskEvent, TaskStatusChangedEvent, TaskAmendedEvent } from './../task';
import { TaskService } from './../task_service';
import { EventBus, EntityEvent } from 'ddd-es-node';

export function taskAPI(eventBus : EventBus, taskService : TaskService) : { preConfigure: Function } {

  const taskAssignments : {} = {};

  eventBus.subscribe(
    (event : EntityEvent, isReplaying : boolean) => {
      if(event instanceof TaskEvent) {
        let emitEventName : string;
        let taskData = JSON.parse(JSON.stringify(event.taskData));
        const taskId = taskData['taskId'];
        const worker = event.worker;
        taskAssignments[worker] = taskAssignments[worker] || {};
        if (event instanceof TaskStatusChangedEvent) {
          taskData['status'] = event.status;
          taskData[`${event.status}AtTime`] = event.timestamp;
          emitEventName = 'WorkerTaskStatusUpdatedEvent';
        } else if (event instanceof TaskAmendedEvent) {
          taskData = Object.assign({}, taskData, event.amendedTaskData);
          emitEventName = 'WorkerTaskDataUpdatedEvent';
        }
        if(emitEventName) {
          taskAssignments[worker][taskId] = Object.assign({}, taskAssignments[worker][taskId], taskData);
          if (!isReplaying) {
            eventBus.emit({
              streamId: worker,
              name: emitEventName,
              task: taskAssignments[worker][taskId]
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
