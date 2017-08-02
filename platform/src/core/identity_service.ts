export class IdentityVO {
  public username : string;
  constructor(username : string) {
    this.username = username;
  }
}

export interface IdentityService {
  authenticate(username : string, password : string) : Promise<IdentityVO>;
}
