import * as express from 'express';
import { EventBus, EntityEvent } from '../entity/entity';
import { Credentials, AnonymousCredentials, UsernamePasswordCredentials } from '../authentication';
import { IdentityRegisteredEvent } from '../identity';
import { IdentityService, IdentityVO } from '../identity_service';

export function identityAPI(eventBus : EventBus, identityService : IdentityService) : { preConfigure: Function } {

  const profiles : {[key: string]:IdentityRegisteredEvent} = {};

  eventBus.subscribe((event : EntityEvent) => {
    if (event instanceof IdentityRegisteredEvent) {
      profiles[event.streamId] = Object.assign({}, event, {password: ''});
    }
  }, {replay: true});

  return {
    preConfigure(app : express.Application): void {

      app.use((req : express.Request, res : express.Response, next : express.NextFunction) : void => {
        req.headers['user-id'] = '';
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
        const credentials : Credentials = body.username && body.password ?
          new UsernamePasswordCredentials(body.username, body.password) :
          new AnonymousCredentials();
        identityService
          .authenticate(credentials)
          .then((identity : IdentityVO) => {
            res.json({
              token: identity.jwt
            });
          })
          .catch((error : Error) => {
            console.error(error);
            res.status(403);
            res.json({
              message: `${error.message}`
            });
          });
      });

      app.post('/api/register', (req : express.Request, res : express.Response) : void => {
        const body : RegisterRequestBody = <RegisterRequestBody> req.body;
        identityService
          .register(body.username, body.password, body.firstName, body.lastName, body.phoneNumber, body.role);
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
  username : string,
  password : string
};

type RegisterRequestBody = {
  username : string,
  password : string,
  firstName : string,
  lastName : string,
  phoneNumber : string,
  role : string
};
