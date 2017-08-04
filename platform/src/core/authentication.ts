export interface AuthenticationResult {
  success : boolean;
}

export interface Authenticator {
  authenticateUsernamePassword(username : string, password : string) : Promise<AuthenticationResult>;
}

export interface Credentials {
  authenticate(authenticator : Authenticator) : Promise<AuthenticationResult>;
}

export class UsernamePasswordCredentials {
  private username : string;
  private password : string;
  constructor(username : string, password : string) {
    this.username = username;
    this.password = password;
  }
  public authenticate(authenticator : Authenticator) : Promise<AuthenticationResult> {
    return authenticator.authenticateUsernamePassword(this.username, this.password);
  }
}
