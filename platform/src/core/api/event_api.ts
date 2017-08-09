import * as express from 'express';
import * as expressWS from 'express-ws';
import {
  EventBus,
  EventRecord
} from '../entity/entity';

type WebSocket  = { on: Function, send : Function };
interface WSApplication extends express.Application {
  on: Function;
  ws : Function;
}

export function eventAPI(eventBus : EventBus) : { preConfigure: Function } {

  type Msg = { [key:string]:string };

  return {
    preConfigure(app : WSApplication): void {

      (<Function>expressWS)(app);

      const wsConnections : { [key:string]: WebSocket } = {};

      const eventSubscriptions : { [key:string]:string[] } = {};

      eventBus.subscribe((event : EventRecord) => {
        if (eventSubscriptions[event.stream]) {
          eventSubscriptions[event.stream]
            .forEach((wsConnectionId : string) => {
              if (wsConnections[wsConnectionId]) {
                wsConnections[wsConnectionId].send(JSON.stringify(event));
              }
            });
        }
      });

      app.post('/api/events/:stream/:connection', (req : express.Request, res : express.Response) : void => {
        const params : Msg = <Msg> req.params;
        eventSubscriptions[params.stream] = eventSubscriptions[params.stream] || [];
        eventSubscriptions[params.stream].push(params.connection);
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
