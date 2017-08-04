import awsSdk = require('aws-sdk');
import { ChatDestination, ChatRequest, ChatResponse } from '../../core/chat';

export class LexChatBot implements ChatDestination {
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
      userId: (request.dialogCorrelationId.replace(/[^0-9a-z._:-]+/i, '_')),
      inputText: request.message,
      sessionAttributes: {}
    };
    return new Promise((resolve : Function, reject : Function) => {
      this.lexRuntime.postText(params, (err : Error,
                                        data : awsSdk.LexRuntime.Types.PostTextResponse) => {
        if (err == null) {
          resolve({
            message: data.message,
            state: data.dialogState,
            provider: 'lex',
            payload: data
          });
        } else {
          reject(err);
        }
      });
    });
  }

}
