import awsSdk = require('aws-sdk');
import { ChatDestination, ChatRequest, ChatResponse } from '../chat_router';

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

  public send(request : ChatRequest, response : ChatResponse) : void {
    const params = {
      botName: this.botName,
      botAlias: this.botAlias,
      userId: (request.correlationId.replace(/[^0-9a-z._:-]+/i, '_')),
      inputText: request.message,
      sessionAttributes: request.conversationData || {}
    };
    this.lexRuntime.postText(params, (err : Error,
                                      data : awsSdk.LexRuntime.Types.PostTextResponse) => {
      if (err == null) {
        response.storeConversationData(data.sessionAttributes);
        switch (data.dialogState) {
          case 'ElicitIntent':
          case 'ConfirmIntent':
          case 'ElicitSlot':
          case 'ConfirmSlot':
            response.reply(data.message);
            break;
          case 'ReadyForFulfillment':
            response.signalReadyForFulfillment(data);
            break;
          case 'Fulfilled':
            response.nothing();
            break;
          case 'Failed':
          default:
            response.signalFailed(data.message);
            break;
        }
      } else {
        response.signalError(err);
      }
    });
  }

}
