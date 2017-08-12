/* tslint:disable:no-unsafe-any */
import * as express from 'express';
import { TaskEvent } from './../task';
import { TaskService } from './../task_service';
import { EventBus, EventRecord } from './../entity/entity';

export function taskAPI(eventBus : EventBus, taskService : TaskService) : { preConfigure: Function } {

  const taskAssignments : {} = {};

  eventBus.subscribe(
    (event : EventRecord, isReplaying : boolean) => {
      if (/^Task(Assigned|Completed)Event$/.test(event.name)) {
        const taskEvent : TaskEvent = (<TaskEvent>event.payload);
        const taskData = JSON.parse(JSON.stringify(taskEvent.taskData));
        const taskId = taskData['taskId'];
        const worker = taskEvent.worker;
        taskAssignments[worker] = taskAssignments[worker] || {};
        if (event.name === 'TaskAssignedEvent') {
          taskData['status'] = 'assigned';
          taskData['assignedAtTime'] = taskEvent.time;
        } else if (event.name === 'TaskCompletedEvent') {
          taskData['status'] = 'completed';
          taskData['completedAtTime'] = taskEvent.time;
        }
        taskAssignments[worker][taskId] = Object.assign({}, taskAssignments[worker][taskId], taskData);
        if (!isReplaying) {
          eventBus.emit({
            stream: worker,
            name: 'WorkerTaskUpdatedEvent',
            payload: {
              name: 'WorkerTaskUpdatedEvent',
              task: taskAssignments[worker][taskId]
            }
          });
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
