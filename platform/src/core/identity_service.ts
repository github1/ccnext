import { Identity, Registration } from './identity';
import { Authenticator, AuthenticationResult, Credentials } from './authentication';
import { EntityRepository, uuid } from './entity/entity';
import * as jwts from 'jwt-simple';

export class IdentityVO {
  public username : string;
  public role : string;
  public sessionId : string;
  public jwt : string;

  constructor(username : string, role : string, sessionId : string, jwt? : string) {
    this.username = username;
    this.role = role;
    this.sessionId = sessionId;
    this.jwt = jwt;
  }
}

export class IdentityService {
  private authenticator : Authenticator;
  private entityRepository : EntityRepository;
  private jwtSecret : string;

  constructor(entityRepository : EntityRepository, authenticator : Authenticator, jwtSecret : string) {
    this.entityRepository = entityRepository;
    this.authenticator = authenticator;
    this.jwtSecret = jwtSecret;
  }

  public decode(jwt : string) : IdentityVO {
    const unverifiedJwt : IdentityVO = <IdentityVO> jwts.decode(jwt, null, true);
    return <IdentityVO> jwts.decode(jwt, this.jwtSecret + unverifiedJwt.sessionId);
  }

  public authenticate(credentials : Credentials) : Promise<IdentityVO> {
    return this.entityRepository
      .load(Identity, credentials.sessionId())
      .then((identity : Identity) => {
        return identity
          .authenticate(credentials, this.authenticator);
      })
      .then((authResult : AuthenticationResult) => {
        const sessionId : string = credentials.sessionId() || uuid();
        const jwt : string = jwts.encode(new IdentityVO(authResult.username, authResult.role, sessionId), this.jwtSecret + sessionId);
        return new IdentityVO(authResult.username, authResult.role, sessionId, jwt);
      });
  }

  public register(username : string,
                  password : string,
                  firstName : string,
                  lastName : string,
                  phoneNumber : string,
                  role : string,
                  memorableWord : string) : void {
    this.entityRepository
      .load(Registration, username)
      .then((registration : Registration) => {
        registration.register(password, firstName, lastName, phoneNumber, role, memorableWord);
      })
      .catch((error : Error) => {
        console.error(error);
      });
  }
}
