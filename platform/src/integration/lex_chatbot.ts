import awsSdk = require('aws-sdk');
import { ChatBot, ChatBotResponse } from '../core/chatbot';

export class LexChatBot implements ChatBot {
  private botName:string;
  private botAlias:string;
  private userId:string;

  constructor(botName:string, botAlias:string, userId:string) {
    this.botName = botName;
    this.botAlias = botAlias;
    this.userId = userId;
  }

  public send(message:string):Promise<ChatBotResponse> {

    /* tslint:disable */
    const lexRuntime = new awsSdk.LexRuntime({
      credentials: new awsSdk.Credentials(
        process.env.AWS_ACCESS_KEY_ID,
        process.env.AWS_SECRET_ACCESS_KEY),
      region: process.env.AWS_DEFAULT_REGION
    });
    /* tslint:enable */
    const params = {
      botName: this.botName,
      botAlias: this.botAlias,
      userId: this.userId,
      inputText: message,
      sessionAttributes: {}
    };
    return new Promise((resolve:Function, reject:Function) => {
      lexRuntime.postText(params, (err:Error, data:{ message : string }) => {
        if (err == null) {
          resolve({
            message: data.message
          });
        } else {
          reject(err);
        }
      });
    });
  }

}
