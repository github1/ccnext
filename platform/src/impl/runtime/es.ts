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
    getEventStream : Function
  };
  export type EventStoreTypeFactory = () => EventStoreType;
  export type Stream = { addEvent : Function, commit : Function, events : Event[] };
  export type Event = { payload : EntityEvent };
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

  private emitter : events.EventEmitter = new events.EventEmitter();

  public subscribe(listener : (event : EntityEvent) => void) : EventBusSubscription {
    this.emitter.on('event', listener);
    return new LocalEventBusSubscription(this.emitter, listener);
  }

  public emit(event : EntityEvent) : void {
    this.emitter.emit('event', event);
  }
}

export const eventBus : EventBus = new LocalEventBus();

// @TODO - use persistent store
const es : EventStoreLib.EventStoreType = ((<EventStoreLib.EventStoreTypeFactory>eventstore)());
es.init();

export class EventStoreLibEventStore implements EventStore {
  public replay(id : string, handler : (event : EntityEvent) => void, done : () => void) : void {
    es.getEventStream(id, (err : Error, stream : EventStoreLib.Stream) => {
      if (err) {
        console.log(err);
      }
      const history : EntityEvent[] = stream.events.map((record : EventStoreLib.Event) => record.payload);
      history.forEach(handler);
      done();
    });
  }

  public replayAll(handler : (event : EntityEvent) => void, done : () => void) : void {
    // @TODO
    console.log(handler, done);
  }
}

export const eventStore : EventStore = new EventStoreLibEventStore();

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
