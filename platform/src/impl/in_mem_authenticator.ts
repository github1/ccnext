import { Authenticator, AuthenticationResult} from '../core/authentication';

const users : {} = {
  demouser: 'password1'
};

export class InMemoryAuthenticator implements Authenticator {
  public authenticateUsernamePassword(username : string, password : string) : Promise<AuthenticationResult> {
    return Promise.resolve({
      success: users[username] === password
    });
  }
}
