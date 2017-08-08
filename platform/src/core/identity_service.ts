import { Identity } from './identity';
import { Authenticator, Credentials } from './authentication';
import { EntityRepository } from './entity/entity';

export class IdentityVO {
  public username : string;

  constructor(username : string) {
    this.username = username;
  }
}

export class IdentityService {
  private authenticator : Authenticator;
  private entityRepository : EntityRepository;

  constructor(entityRepository : EntityRepository, authenticator : Authenticator) {
    this.entityRepository = entityRepository;
    this.authenticator = authenticator;
  }

  public authenticate(username : string, credentials : Credentials) : Promise<IdentityVO> {
    return this.entityRepository
      .load(Identity, username)
      .then((identity : Identity) => {
        return identity
          .authenticate(credentials, this.authenticator);
      })
      .then(() => {
        return new IdentityVO(username);
      });
  }

  public register(username : string, password : string, firstName : string, lastName : string, phoneNumber : string, role : string) : void {
    this.entityRepository
      .load(Identity, username)
      .then((identity : Identity) => {
        identity.register(password, firstName, lastName, phoneNumber, role);
      })
      .catch((error : Error) => {
        console.error(error);
      });
  }
}
