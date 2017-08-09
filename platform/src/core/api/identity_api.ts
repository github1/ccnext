import * as express from 'express';
import { EventBus, EventRecord } from '../entity/entity';
import { UsernamePasswordCredentials } from '../authentication';
import { IdentityRegisteredEvent } from '../identity';
import { IdentityService, IdentityVO } from '../identity_service';
import * as jwts from 'jwt-simple';

export function identityAPI(jwtSecret : string, eventBus : EventBus, identityService : IdentityService) : { preConfigure: Function } {

  const profiles : {[key: string]:IdentityRegisteredEvent} = {};

  eventBus.subscribe((event : EventRecord) => {
    if (event.name === 'IdentityRegisteredEvent') {
      profiles[event.stream] = (<IdentityRegisteredEvent>event.payload);
    }
  });

  return {
    preConfigure(app : express.Application): void {

      app.use((req : express.Request, res : express.Response, next : express.NextFunction) : void => {
        if (req.path.indexOf('/api') === 0) {
          const bypass : boolean = [
            '/api/authenticate',
            '/api/register',
            '/api/chat'
          ]
            .map((path : string) : boolean => req.path.indexOf(path) === 0)
            .filter((result : boolean) : boolean => result)[0];
          if (bypass) {
            next();
          } else {
            if (req.headers['jwt']) {
              try {
                const jwt : IdentityVO = <IdentityVO> jwts.decode(req.headers['jwt'], jwtSecret);
                req.headers['user-id'] = jwt.username;
                next();
              } catch (err) {
                res.status(401).send({status: 401});
              }
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
        identityService
          .authenticate(body.username, new UsernamePasswordCredentials(body.username, body.password))
          .then((identity : IdentityVO) => {
            res.json({
              token: jwts.encode(profiles[identity.username], jwtSecret)
            });
          })
          .catch((error : Error) => {
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
        res.json(profiles[`${req.headers['user-id']}`]);
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
