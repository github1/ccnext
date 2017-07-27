export interface ChatBotResponse {
  message: string;
}

export interface ChatBot {
  send(message : string) : Promise<ChatBotResponse>;
}
