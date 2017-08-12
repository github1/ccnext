import {
  Task,
  TaskSubmittedEvent,
  TaskAmendedEvent,
  TaskAssignedEvent,
  TaskCompletedEvent
} from '../../src/core/task';
import { Clock } from '../../src/core/clock';

describe('Task', () => {

  let task;

  beforeEach(() => {
    Clock.freeze(0);
    task = new Task('taskId');
    task.dispatch = jest.fn((id, event) => {
      task.apply(event);
    });
  });

  afterEach(() => {
    Clock.unfreeze();
  });

  describe('when a task is submitted', () => {
    it('dispatches a task submitted event', () => {
      task.submit({someData: 'someValue '});
      expect(task.dispatch)
        .toBeCalledWith('taskId', new TaskSubmittedEvent({someData: 'someValue '}));
    });
    describe('when a task is submitted multiple times', () => {
      it('dispatches a single task submitted event', () => {
        task.submit({someData: 'someValue '});
        task.submit({someData: 'someValue '});
        expect(task.dispatch.mock.calls.filter((call) => call[1] instanceof TaskSubmittedEvent).length).toBe(1);
      });
    });
  });

  describe('when a task is amended', () => {
    beforeEach(() => {
      task.submit({someData: 'someValue'});
      task.amend({foo: 'bar'});
      task.amend({someData: 'someOtherValue'});
    });
    it('dispatches a task amended event', () => {
      expect(task.dispatch)
        .toBeCalledWith('taskId', new TaskAmendedEvent({foo: 'bar'}));
    });
    it('updates the tasks data', () => {
      expect(task.taskData.someData).toEqual('someOtherValue');
      expect(task.taskData.foo).toEqual('bar');
    });
  });

  describe('when a task is assigned', () => {
    describe('when it has not been submitted', () => {
      it('throws an error', () => {
        try {
          task.assign('aWorker');
          expect(false).toEqual(true);
        } catch (err) {
          expect(err.message).toEqual('task not submitted yet');
        }
      });
    });
    describe('when it has been submitted', () => {
      beforeEach(() => {
        task.submit({});
      });
      describe('when it has already been completed', () => {
        it('throws an error', () => {
          try {
            task.complete('aReason');
            task.assign('aWorker');
            expect(false).toEqual(true);
          } catch (err) {
            expect(err.message).toEqual('task is complete');
          }
        });
      });
      it('dispatches a task assigned event', () => {
        task.submit({someData: 'someValue '});
        task.assign('aWorker');
        expect(task.dispatch)
          .toBeCalledWith('taskId', new TaskAssignedEvent('aWorker', {}));
      });
    });
  });

  describe('when a task is marked complete', () => {
    describe('when it has not been submitted', () => {
      it('throws an error', () => {
        try {
          task.complete('someReason');
          expect(false).toEqual(true);
        } catch (err) {
          expect(err.message).toEqual('task not submitted yet');
        }
      });
    });
    describe('when it has been submitted', () => {
      beforeEach(() => {
        task.submit({});
        task.assign('someWorker');
      });
      describe('when it is not already complete', () => {
        it('dispatches a task completed event', () => {
          task.complete('someReason');
          expect(task.dispatch)
            .toBeCalledWith('taskId', new TaskCompletedEvent('someReason', 'someWorker', {}));
        });
      });
      describe('when it is already complete', () => {
        it('dispatches a single task completed event', () => {
          task.complete('someReason');
          task.complete('someReason');
          expect(task.dispatch.mock.calls.filter((call) => call[1] instanceof TaskCompletedEvent).length).toBe(1);
        });
      });
    });
  });

});
