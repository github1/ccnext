export interface EntityEvent {
}

export type EventDispatcher = (streamId : string, event : EntityEvent) => void;

export type EventHandler = (entity : Entity, event : EntityEvent) => void;

export interface EventStore {
  replay(id : string, handler : (event : EntityEvent) => void, done : () => void) : void;
  replayAll(handler : (event : EntityEvent) => void, done : () => void) : void;
}

export interface EventBusSubscription {
  unsubscribe() : void;
}

export type EventRecord = { name: string, stream : string, payload: {} };

export interface EventBus {
  subscribe(listener : (event : EntityEvent) => void) : EventBusSubscription;
  emit(event : EntityEvent) : void;
}

export interface EntityRepository {
  load(construct : {new(arg : string)}, id : string) : Promise<Entity>;
}

export class BaseEntityRepository implements EntityRepository {

  private eventDispatcher : EventDispatcher;
  private eventStore : EventStore;

  constructor(eventDispatcher : EventDispatcher, eventStore : EventStore) {
    this.eventDispatcher = eventDispatcher;
    this.eventStore = eventStore;
  }

  public load(construct : {new(arg : string)}, id : string) : Promise<Entity> {
    return new Promise((resolve : Function) => {
      const entity : Entity = (<Entity> new construct(id));
      entity.init((streamId : string, event : EntityEvent) => {
        this.eventDispatcher(streamId, event);
        entity.apply(event);
      });
      this.eventStore.replay(
        id,
        (event : EntityEvent) : void => {
          entity.apply(event);
        },
        () : void => {
          resolve(entity);
        });
    });
  }

}

export class EventProcessor {
  private handler : EventHandler;

  public apply(newHandler : EventHandler) : EventProcessor {
    const parentHandler : EventHandler = this.handler;
    let handlerToSet : EventHandler = newHandler;
    if (parentHandler) {
      handlerToSet = (entity : Entity, event : EntityEvent) : void => {
        newHandler(entity, event);
        parentHandler(entity, event);
      };
    }
    this.handler = handlerToSet;
    return this;
  }

  public accept(entity : Entity, event : EntityEvent) : void {
    this.handler(entity, event);
  }
}

export class Entity {
  protected id : string;
  protected config : EventProcessor;
  protected dispatch : EventDispatcher;

  constructor(id : string,
              config : EventProcessor) {
    this.id = id;
    this.config = config;
  }

  public static CONFIG(newHandler : EventHandler) : EventProcessor {
    return new EventProcessor().apply(newHandler);
  }

  public init(dispatch : EventDispatcher) : void {
    this.dispatch = dispatch;
  }

  public apply(event : EntityEvent) : void {
    this.config.accept(this, event);
  }

}
