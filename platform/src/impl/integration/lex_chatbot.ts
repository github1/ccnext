import awsSdk = require('aws-sdk');
import { Chat, ChatRequest, ChatResponse } from '../../core/chat';

export class LexChatBot implements Chat {
  private botName : string;
  private botAlias : string;
  private lexRuntime : awsSdk.LexRuntime;

  constructor(botName : string,
              botAlias : string,
              lexRuntime : awsSdk.LexRuntime) {
    this.botName = botName;
    this.botAlias = botAlias;
    this.lexRuntime = lexRuntime;
  }

  public send(request : ChatRequest) : Promise<ChatResponse> {
    const params = {
      botName: this.botName,
      botAlias: this.botAlias,
      userId: request.dialogCorrelationId,
      inputText: request.message,
      sessionAttributes: {}
    };
    return new Promise((resolve : Function, reject : Function) => {
      this.lexRuntime.postText(params, (err : Error,
                                        data : awsSdk.LexRuntime.Types.PostTextResponse) => {
        if (err == null) {
          resolve({
            message: data.message,
            state: data.dialogState
          });
        } else {
          reject(err);
        }
      });
    });
  }

}