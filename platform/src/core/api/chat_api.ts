import * as express from 'express';
import { ChatService } from '../chat_service';

export function chatAPI(chatService : ChatService) : { preConfigure: Function } {

  type Msg = { [key:string]:string };

  return {
    preConfigure(app : express.Application): void {

      app.post('/api/chat/:chatId', (req : express.Request, res : express.Response) : void => {
        const body : Msg = <Msg> req.body;
        const params : Msg = <Msg> req.params;
        if (body.text) {
          chatService.postMessage(params.chatId, body.source, body.text);
        } else {
          chatService.startChat(params.chatId, body.source);
        }
        res.json({});
      });

      app.delete('/api/chat/:chatId', (req : express.Request, res : express.Response) : void => {
        const params : Msg = <Msg> req.params;
        chatService.endChat(params.chatId);
        res.status(204).json({});
      });

    }
  };
}
