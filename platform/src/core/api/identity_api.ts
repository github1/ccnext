import * as express from 'express';
import { IdentityService, IdentityVO } from '../identity_service';
import * as jwts from 'jwt-simple';

export function identityAPI(jwtSecret : string, identityService : IdentityService) : { preConfigure: Function } {
  return {
    preConfigure(app : express.Application): void {

      app.use((req : express.Request, res : express.Response, next : express.NextFunction) : void => {
        if (req.path.indexOf('/api') === 0) {
          const bypass : boolean = ['/api/authenticate']
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
                res.status(401).send({});
              }
            } else {
              res.status(401).send({});
            }
          }
        } else {
          next();
        }
      });

      app.post('/api/authenticate', (req : express.Request, res : express.Response) : void => {
        const body : AuthenticateRequestBody = <AuthenticateRequestBody> req.body;
        identityService
          .authenticate(body.username, body.password)
          .then((identity : IdentityVO) => {
            res.json({
              identity: identity,
              token: jwts.encode(identity, jwtSecret)
            });
          })
          .catch((error : Error) => {
            res.status(403);
            res.json({
              message: `${error.message}`
            });
          });
      });

    }
  };
}

type AuthenticateRequestBody = {
  username : string,
  password : string
};
