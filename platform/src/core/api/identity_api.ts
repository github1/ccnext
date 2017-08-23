import * as express from 'express';
import { EventBus, EntityEvent } from '../entity/entity';
import {
  Credentials,
  AnonymousCredentials,
  UsernamePasswordCredentials,
  MemorableWordCredentials
} from '../authentication';
import {
  IdentityRegisteredEvent,
  AuthenticationVerificationRequestedEvent,
  AuthenticationVerificationSucceededEvent
} from '../identity';
import { IdentityService, IdentityVO } from '../identity_service';

export function identityAPI(eventBus : EventBus, identityService : IdentityService) : { preConfigure: Function } {

  type Msg = { [key:string]:string };

  const profiles : {[key: string]:IdentityRegisteredEvent} = {};

  const verificationRequests : {[key: string]:string} = {};

  eventBus.subscribe((event : EntityEvent) => {
    if (event instanceof IdentityRegisteredEvent) {
      profiles[event.streamId] = Object.assign({}, event, {password: ''});
    } else if (event instanceof AuthenticationVerificationRequestedEvent) {
      verificationRequests[event.requestId] = event.streamId;
    } else if (event instanceof AuthenticationVerificationSucceededEvent) {
      delete verificationRequests[event.requestId];
    }
  }, {replay: true});

  return {
    preConfigure(app : express.Application): void {

      app.use((req : express.Request, res : express.Response, next : express.NextFunction) : void => {
        req.headers['user-id'] = '';
        req.headers['user-role'] = '';
        req.headers['user-session-id'] = '';
        if (req.path.indexOf('/api') === 0) {
          const bypass : boolean = [
            '/api/authenticate',
            '/api/register',
            '/api/chat',
            '/api/events'
          ]
            .map((path : string) : boolean => req.path.indexOf(path) === 0)
            .filter((result : boolean) : boolean => result)[0];
          if (req.headers['jwt']) {
            try {
              const identityVO : IdentityVO = identityService.decode(req.headers['jwt'].toString());
              req.headers['user-id'] = identityVO.username;
              req.headers['user-role'] = identityVO.role;
              req.headers['user-session-id'] = identityVO.sessionId;
              next();
            } catch (err) {
              res.status(401).send({status: 401});
            }
          } else {
            if (bypass) {
              next();
            } else {
              res.status(401).send({status: 401});
            }
          }
        } else {
          next();
        }
      });

      app.post('/api/authenticate', (req : express.Request, res : express.Response) : void => {
        const body : AuthenticateRequestBody = <AuthenticateRequestBody> req.body;
        const sessionId : string = body.sessionId || req.headers['user-session-id'].toString();
        const credentials : Credentials = (() : Credentials => {
          if (body.username && body.password) {
            return new UsernamePasswordCredentials(body.username, body.password, sessionId);
          }
          else if (body.memorableWordPositionsRequested) {
            return new MemorableWordCredentials(body.username,
              body.memorableWordPositionsRequested.split(',').map((v : string) => parseInt(v, 10)),
              body.memorableWordChars.split(','), sessionId);
          }
          return new AnonymousCredentials();
        })();
        identityService
          .authenticate(credentials)
          .then((identity : IdentityVO) => {
            res.json({ token: identity.jwt });
          })
          .catch((error : Error) => {
            console.error(error, credentials.constructor.name);
            res.status(403);
            res.json({
              message: `${error.message}}`
            });
          });
      });

      app.post('/api/verification', (req : express.Request, res : express.Response) : void => {
        const body : Msg = <Msg> req.body;
        identityService.requestVerification(body.identityId).then((requestId : string) => {
          res.json({
            requestId: requestId
          });
        });
      });

      app.get('/api/verification/:requestId', (req : express.Request, res : express.Response) : void => {
        const params : Msg = <Msg> req.params;
        if(verificationRequests[params.requestId]) {
          res.json({
            identityId: verificationRequests[params.requestId]
          });
        } else {
          res.status(404).json({});
        }
      });

      app.post('/api/register', (req : express.Request, res : express.Response) : void => {
        const body : RegisterRequestBody = <RegisterRequestBody> req.body;
        identityService
          .register(body.username, body.password, body.firstName, body.lastName, body.phoneNumber, body.role, body.memorableWord);
        res.json({
          username: body.username
        });
      });

      app.get('/api/profile', (req : express.Request, res : express.Response) : void => {
        res.json(profiles[req.headers['user-id'].toString()]);
      });

    }
  };
}

type AuthenticateRequestBody = {
  sessionId : string;
  verificationRequestId : string;
  username : string,
  password : string,
  memorableWordPositionsRequested : string,
  memorableWordChars : string
};

type RegisterRequestBody = {
  username : string,
  password : string,
  firstName : string,
  lastName : string,
  phoneNumber : string,
  role : string,
  memorableWord : string
};
