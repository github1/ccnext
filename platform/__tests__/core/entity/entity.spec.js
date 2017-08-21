import {
  BaseEntityRepository
} from '../../../src/core/entity/entity';
import {
  Chat
} from '../../../src/core/chat';


describe('BaseEntityRepository', () => {

  describe('when loading an entity', () => {
    it('dispatches the event after an operation is executed', () => {
      const dispatcher = (id, event) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(event);
          }, 25);
        });
      };
      const store = {
        replay: (id, handler, done) => {
          setTimeout(() => {
            done();
          }, 25);
        }
      };
      const repo = new BaseEntityRepository(dispatcher, store);
      return repo.load(Chat, '123').then((chat) => {
        chat.start('someUser');
        return 'loaded_entity';
      }).then((value) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve('arbitrary_async_call_' + value);
          }, 25);
        });
      }).then((value) => {
        return 'events_dispatched_from_' + value;
      }).then((value) => {
        expect(value).toEqual('events_dispatched_from_arbitrary_async_call_loaded_entity');
      });
    });
  });

});
