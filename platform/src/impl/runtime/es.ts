import {
  BaseEntityRepository,
  EntityRepository,
  EntityEvent,
  EventStore,
  EventBus,
  EventBusSubscription
} from '../../core/entity/entity';
import * as eventstore from 'eventstore';
import * as events from 'events';

module EventStoreLib {
  export type EventStoreType = {
    init: Function,
    getEventStream : Function,
    getEvents : Function
  };
  export type EventStoreTypeFactory = (options?: Object) => EventStoreType;
  export type Stream = { addEvent : Function, commit : Function, events : Event[] };
  export type Event = { name : string, payload : EntityEvent };
}

class LocalEventBusSubscription implements EventBusSubscription {
  private emitter : events.EventEmitter;
  private listener : (event : EntityEvent) => void;
  constructor(emitter : events.EventEmitter, listener : (event : EntityEvent) => void) {
    this.emitter = emitter;
    this.listener = listener;
  }
  public unsubscribe() : void {
    this.emitter.removeListener('event', this.listener);
  }
}

export class LocalEventBus implements EventBus {

  private eventStore : EventStore;
  private emitter : events.EventEmitter = new events.EventEmitter();

  constructor(eventStore : EventStore) {
    this.eventStore = eventStore;
  }

  public subscribe(listener : (event : EntityEvent, isReplaying? : boolean) => void,
                   options? : { [key:string]: string | boolean }) : EventBusSubscription {
    if(options && options['replay']) {
      this.eventStore.replayAll(listener);
    }
    const emitterListener : (event : EntityEvent, isReplaying? : boolean) => void = (event : EntityEvent) : void => {
      listener(event, false);
    };
    this.emitter.on('event', emitterListener);
    return new LocalEventBusSubscription(this.emitter, emitterListener);
  }

  public emit(event : EntityEvent) : void {
    this.emitter.emit('event', event);
  }
}

// @TODO - use persistent store
const es : EventStoreLib.EventStoreType = ((<EventStoreLib.EventStoreTypeFactory>eventstore)({
  type:'dynamodb'
}));
es.init();

export class EventStoreLibEventStore implements EventStore {
  public replay(id : string, handler : (event : EntityEvent, isReplaying? : boolean) => void, done? : () => void) : void {
    es.getEventStream(id, (err : Error, stream : EventStoreLib.Stream) => {
      if (err) {
        console.log(err);
      } else {
        const history : EntityEvent[] = stream.events.map((record : EventStoreLib.Event) => record.payload);
        history.forEach((entityEvent : EntityEvent) => {
          handler(entityEvent, true);
        });
      }
      if(done) {
        done();
      }
    });
  }

  public replayAll(handler : (event : EntityEvent, isReplaying? : boolean) => void, done? : () => void) : void {
    es.getEvents(0, (err : Error, events : EventStoreLib.Event[]) => {
      if (err) {
        console.log(err);
      } else {
        events.map((record : EventStoreLib.Event) => {
          record.name = record.payload.constructor.name;
          return record;
        }).forEach((entityEvent : EntityEvent) => {
          handler(entityEvent, true);
        });
      }
      if(done) {
        done();
      }
    });
  }
}

export const eventStore : EventStore = new EventStoreLibEventStore();

export const eventBus : EventBus = new LocalEventBus(eventStore);

function eventDispatcher(streamId : string, event : EntityEvent) : void {
  es.getEventStream(streamId, (err : Error, stream : EventStoreLib.Stream) => {
    if (err) {
      console.log(err);
    }
    stream.addEvent(event);
    eventBus.emit({
      name: event.constructor.name,
      stream: streamId,
      payload: event
    });
    stream.commit();
  });
}

export const entityRepository : EntityRepository = new BaseEntityRepository(eventDispatcher, eventStore);
