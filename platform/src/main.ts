import { ChatBot, ChatBotResponse } from './core/chatbot';
import { LexChatBot } from './integration/lex_chatbot';

const chatbot : ChatBot = new LexChatBot('OrderFlowers', 'prod', 'user123');
chatbot.send('I would like to order some flowers').then((result : ChatBotResponse ) => {
  console.log(result);
}).catch((err : Error) => {
  console.error(err);
});
