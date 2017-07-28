export interface ChatRequest {
  message: string;
  dialogCorrelationId: string;
}

export interface ChatResponse {
  message: string;
  state: State;
}

export type State = 'ElicitIntent' |
  'ConfirmIntent' |
  'ElicitSlot' |
  'Fulfilled' |
  'ReadyForFulfillment' |
  'Failed';

export interface Chat {
  send(request : ChatRequest) : Promise<ChatResponse>;
}

export interface ChatProvider {
  getChat(id : string) : Chat;
}
