import * as express from 'express';
import * as expressWS from 'express-ws';
import {
  EventBus,
  EntityEvent
} from 'ddd-es-node';

type WebSocket  = { on: Function, send : Function };
interface WSApplication extends express.Application {
  on: Function;
  ws : Function;
}

export function eventAPI(baseUrl : string, eventBus : EventBus) : { preConfigure: Function } {

  type Msg = { [key:string]:string };

  return {
    preConfigure(app : WSApplication): void {

      (<Function>expressWS)(app);

      const wsConnections : { [key:string]: WebSocket } = {};

      const eventSubscriptions : { [key:string]:string[] } = {};

      eventBus.subscribe((event : EntityEvent) => {
        if (eventSubscriptions[event.streamId]) {
          eventSubscriptions[event.streamId]
            .forEach((wsConnectionId : string) => {
              if (wsConnections[wsConnectionId]) {
                wsConnections[wsConnectionId].send(JSON.stringify(event));
              }
            });
        }
      });

      const unsubscribeFromStream = (streamId : string, connection : string) => {
        if(eventSubscriptions[streamId]) {
          const index = eventSubscriptions[streamId].indexOf(connection);
          if (index > -1) {
            eventSubscriptions[streamId].splice(index, 1);
          }
        }
      };

      const unsubscribe = (connection : string) => {
        Object.keys(eventSubscriptions).forEach((streamId : string) => {
          unsubscribeFromStream(streamId, connection);
        });
      };

      app.get('/api/events/connectionUrl', (req : express.Request, res : express.Response) : void => {
        const query : Msg = <Msg> req.query;
        const wsConnectionId : string = query.id;
        res.json({
          connectionUrl: (`${baseUrl}/ws/realtime?id=${wsConnectionId}`.replace(/^http/, 'ws'))
        });
      });

      app.get('/api/events/subscriptions/:connection', (req : express.Request, res : express.Response) : void => {
        const params : Msg = <Msg> req.params;
        res.json(Object.keys(eventSubscriptions)
          .filter((streamId : string) => {
            return eventSubscriptions[streamId].indexOf(params.connection) > -1;
          }));
      });

      app.delete('/api/events/subscriptions/:connection', (req : express.Request, res : express.Response) : void => {
        const params : Msg = <Msg> req.params;
        unsubscribe(params.connection);
        res.json({});
      });

      app.delete('/api/events/stream/:stream/subscriptions/:connection', (req : express.Request, res : express.Response) : void => {
        const params : Msg = <Msg> req.params;
        unsubscribeFromStream(params.stream, params.connection);
        res.json({});
      });

      app.post('/api/events/:stream/:connection', (req : express.Request, res : express.Response) : void => {
        const params : Msg = <Msg> req.params;
        eventSubscriptions[params.stream] = eventSubscriptions[params.stream] || [];
        if (eventSubscriptions[params.stream].indexOf(params.connection) < 0) {
          eventSubscriptions[params.stream].push(params.connection);
        }
        res.json({});
      });

      app.ws('/ws/realtime', (ws : WebSocket, req : express.Request) => {
        const query : Msg = <Msg> req.query;
        const wsConnectionId : string = query.id;
        wsConnections[wsConnectionId] = ws;
        ws.on('close', () => {
          if (wsConnections[wsConnectionId]) {
            delete wsConnections[wsConnectionId];
          }
        });
      });

    }
  };
}
