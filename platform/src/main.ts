import * as awsSdk from 'aws-sdk';
import server from './impl/runtime/server';
import { entityRepository, eventBus } from './impl/runtime/es';
import twilio_hooks from './impl/integration/twilio_hooks';
import { ChatDestinationProvider } from './core/chat';
import { ChatService } from './core/chat_service';
import { LexChatBot } from './impl/integration/lex_chatbot';
import * as fulfillment_processor from './impl/fulfillment_processor';
import { IdentityService } from './core/identity_service';
import { InMemoryAuthenticator } from './impl/in_mem_authenticator';
import { eventAPI } from './core/api/event_api';
import { identityAPI } from './core/api/identity_api';
import { chatAPI } from './core/api/chat_api';

// port to run the service on
const port : string = process.env.PORT || '9999';

// publicly accessible url of this service (for webhooks)
const publicUrl : string = process.env.PUBLIC_URL;

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

const JWT_SECRET : string = Buffer.from(twilioPhoneNumberSid, 'utf8').toString();

const identityService : IdentityService = new IdentityService(
  entityRepository,
  new InMemoryAuthenticator(entityRepository, eventBus));

const chatDesintationProvider : ChatDestinationProvider = {
  getChat(id : string) {
    return new LexChatBot(id, 'prod', awsLexRuntime);
  }
};

const chatService : ChatService = new ChatService(entityRepository, chatDesintationProvider);

// start the fulfillment processor
fulfillment_processor(eventBus, chatService);

/* tslint:disable */

const integrations : any = {
  event_api: eventAPI(eventBus),
  identity_api: identityAPI(JWT_SECRET, eventBus, identityService),
  chat_api: chatAPI(chatService)
};

if (publicUrl && publicUrl.indexOf('localhost') === -1) {
  integrations.twilio = twilio_hooks(
    publicUrl,
    '/integration/twilio',
    twilioPhoneNumberSid,
    twilioAccountSid,
    twilioAuthToken,
    chatService,
    eventBus);
} else {
  console.warn('[WARN] Invalid publicUrl provided, Unable to register twilio hooks!');
}

server(port, {
  integrations: integrations
});

/* tslint:enable */
