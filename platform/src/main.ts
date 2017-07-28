import * as awsSdk from 'aws-sdk';
import { ChatProvider } from './core/chat';
import { LexChatBot } from './impl/integration/lex_chatbot';
import twilio_hooks from './impl/integration/twilio_hooks';
import server from './impl/runtime/server';

// port to run the service on
const port : string = process.env.PORT || '9999';

// publicly accessible url of this service (for webhooks)
const publicUrl : string = process.env.PUBLIC_URL || `http://localhost${port}`;

// twilio credentials
const twilioPhoneNumberSid : string = process.env.TWILIO_NUMBER_SID;
const twilioAccountSid : string = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken : string = process.env.TWILIO_AUTH_TOKEN;
// lex runtime
const awsLexRuntime : awsSdk.LexRuntime = new awsSdk.LexRuntime({
  credentials: new awsSdk.Credentials(
    process.env.AWS_ACCESS_KEY_ID,
    process.env.AWS_SECRET_ACCESS_KEY),
  region: process.env.AWS_DEFAULT_REGION
});

// chat provider
const chatProvider : ChatProvider = {
  getChat(id : string) {
    return new LexChatBot(id, 'prod', awsLexRuntime);
  }
};

server(port, {
  integrations: {
    twilio_hooks: twilio_hooks(
      publicUrl,
      '/integration/twilio',
      twilioPhoneNumberSid,
      twilioAccountSid,
      twilioAuthToken,
      chatProvider)
  }
});
