import * as awsSdk from 'aws-sdk';
import server from './impl/runtime/server';
import { entityRepository, eventBus, eventStore } from 'ddd-es-node';
import { ChatService } from './core/chat_service';
import { LexChatBot } from './impl/integration/lex_chatbot';
import { TaskService } from './core/task_service';
import { ChatDestinationProvider, NullChatDestination, chatRouter } from './impl/chat_router';
import * as fulfillment_processor from './impl/fulfillment_processor';
import { IdentityService } from './core/identity_service';
import { InMemoryAuthenticator } from './impl/in_mem_authenticator';
import { identityAPI } from './core/api/identity_api';
import { eventAPI } from './core/api/event_api';
import { chatAPI } from './core/api/chat_api';
import { taskAPI } from './core/api/task_api';
import * as ccsip_integrator from './impl/integration/ccsip_integrator';
import { Projection } from './core/projection/projection';

// port to run the service on
const port : string = process.env.PORT || '9999';

// publicly accessible url of this service (for webhooks)
const publicUrl : string = process.env.PUBLIC_URL || `http://localhost:${port}`;

// aws config
awsSdk.config.update({
  region: process.env.AWS_DEFAULT_REGION
});

// lex runtime
const awsLexRuntime : awsSdk.LexRuntime = new awsSdk.LexRuntime({
  credentials: new awsSdk.Credentials(
    process.env.AWS_ACCESS_KEY_ID,
    process.env.AWS_SECRET_ACCESS_KEY),
  region: process.env.AWS_DEFAULT_REGION
});

awsSdk.config.update({
  region: process.env.AWS_DEFAULT_REGION
});

const JWT_SECRET : string = process.env.JWT_SECRET.toString();

const identityService : IdentityService = new IdentityService(
  entityRepository,
  new InMemoryAuthenticator(entityRepository, eventBus),
  JWT_SECRET);

const chatDesintationProvider : ChatDestinationProvider = {
  getChat(id : string) {
    if (id === 'CCaaSBot') {
      return new LexChatBot(id, 'prod', awsLexRuntime);
    }
    return new NullChatDestination();
  }
};

const chatService : ChatService = new ChatService(entityRepository);

const taskService : TaskService = new TaskService(entityRepository);

// start projection builders
Projection(eventBus);

// start chat router
chatRouter(eventBus, chatDesintationProvider, chatService, taskService);

// start fulfillment processor
fulfillment_processor(eventBus, chatService);

// start ccsip integrator
ccsip_integrator(chatService, taskService, eventBus);

/* tslint:disable */

const integrations : any = {
  identity_api: identityAPI(eventBus, identityService),
  event_api: eventAPI(publicUrl, eventBus),
  chat_api: chatAPI(eventBus, eventStore, chatService),
  task_api: taskAPI(eventBus, taskService)
};

process.on('unhandledRejection', (reason : {}, p : {}) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

server(port, {
  integrations: integrations
});

/* tslint:enable */
