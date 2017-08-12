import * as normalizeUrl from 'normalize-url';
import * as uuid from 'uuid';
import {
  create,
  createTask,
  updateTask,
  configureIncomingNumber,
  configureTaskRouter
} from './twilio_helpers';
const cookieParser = require('cookie-parser');
const twilio = require('twilio');

/**
 * Builds a service integration for twilio
 *
 * @param {string} baseUrl
 * @param {string} contextPath
 * @param {string} phoneNumberSid
 * @param {string} accountSid
 * @param {string} authToken
 * @param {ChatService} chatService
 * @param {TaskService} taskService
 * @param {EventBus} eventBus
 * @returns {object} server configurator
 */
export default (baseUrl, contextPath, phoneNumberSid, accountSid, authToken, chatService, taskService, eventBus) => {

  const twilioClient = twilio(accountSid, authToken);

  const twilioContext = {
    chats: {}
  };

  const subscribeEvents = () => {

    const refreshChatContext = (event) => {
      twilioContext.chats[event.stream] = twilioContext.chats[event.stream] || {};
      twilioContext.chats[event.stream].isIncoming = false;
      if ((event.payload.source || '').indexOf('sms-incoming::') === 0) {
        twilioContext.chats[event.stream].isIncoming = true;
        twilioContext.chats[event.stream].incoming = event.payload.source;
        twilioContext.chats[event.stream].incomingNumber = (twilioContext.chats[event.stream].incoming + '').split(/::/)[1];
      }
      return twilioContext.chats[event.stream];
    };

    eventBus.subscribe((event, isReplaying) => {

      if (event.name === 'IdentityRegisteredEvent') {
        // create workers from registered agents
        if (event.payload.role === 'agent') {
          create(twilioContext.taskqueueConfig.workspaces['ccaas'].workers(), {friendlyName: event.streamId}, {
            friendlyName: event.streamId,
            multiTaskEnabled: true,
            attributes: JSON.stringify(event.payload, null, 2)
          }).then((worker) => {
            console.log('added worker', worker.friendlyName);
            twilioContext.taskqueueConfig.workers[worker.friendlyName] = worker;
          }).catch((err) => {
            console.error('failed to create worker', event.streamId, err);
          });
        }
      }

      if (!isReplaying) {
        if (event.name === 'ChatMessagePostedEvent') {
          // Reply to chat messages with sms
          const chatContext = refreshChatContext(event);
          if (!chatContext.isIncoming && chatContext.incomingNumber) {
            twilioClient.messages.create({
              to: chatContext.incomingNumber,
              from: twilioContext.phoneNumber,
              body: event.payload.text
            });
          }
        } else if (event.name === 'ChatEndedEvent') {
          delete twilioContext.chats[event.stream];
        } else if (event.name === 'TaskSubmittedEvent') {
          createTask(twilioClient,
            twilioContext.taskqueueConfig.workspaces['ccaas'].sid,
            twilioContext.taskqueueConfig.workflows['ccaas-workflow'].sid,
            event.payload.taskData
          ).then((task) => {
            taskService.amendTask(event.stream, {
              twilioTaskSid: task.sid
            });
          }).catch((err) => {
            console.error('failed to create task in twilio', err);
          });
        } else if (event.name === 'TaskCompletedEvent') {
          if (event.payload.taskData.twilioTaskSid) {
            updateTask(twilioClient,
              twilioContext.taskqueueConfig.workspaces['ccaas'].sid,
              event.payload.taskData.twilioTaskSid, {
                assignmentStatus: 'completed'
              })
              .catch((err) => {
                console.error('failed to update task in twilio', err);
              });
          }
        }
      }
    }, {replay: true});

  };

  return {

    // Define twilio webhook endpoints
    preConfigure(server) {

      server.use(cookieParser());

      server.use(function (req, res, next) {
        if (req.path.indexOf(contextPath) === 0) {
          // validate the x-twilio-signature header
          if (twilio.validateExpressRequest(req, authToken, {protocol: req.headers['x-forwarded-proto']})) {
            next();
          } else {
            res
              .status(403)
              .type('text/plain')
              .send('Invalid signature!');
          }
        } else {
          next();
        }
      });

      server.post(`${contextPath}/:channel`, (req, res) => {
        res
          .type('text/xml');
        switch (req.params.channel) {
          case 'sms':
          {
            const source = `sms-incoming::${req.body.From}`;
            const text = req.body.Body;
            let chatId = req.cookies['x-conversation-id'];
            if (!req.cookies['x-conversation-id']) {
              res.cookie('x-conversation-id', chatId = uuid.v4());
            }
            chatService
              .postMessage(chatId, source, text);
            res.send('<Response></Response>');
            break;
          }
          case 'voice':
          {
            const vr = new twilio.twiml.VoiceResponse();
            vr.enqueue({
              method: 'GET',
              workflowSid: twilioContext.taskqueueConfig.workflows['ccaas-workflow'].sid
            });
            res.set({
              'Content-Type': 'text/xml'
            });
            res.send(vr.toString());

            /*-
             res.send(new twilio.twiml.VoiceResponse()
             .say({}, 'Not configured')
             .toString());
             */
            break;
          }
          default:
            res.status(404);
            break;
        }
      });

      server.post(`${contextPath}/tasks/assignment`, (req, res) => {
        const taskAttributes = JSON.parse(req.body.TaskAttributes);
        const workerAttributes = JSON.parse(req.body.WorkerAttributes);
        if (taskAttributes.channel === 'chat') {
          res.json({
            instruction: 'accept'
          });
        } else {
          twilioContext.taskqueueConfig.workspaces['ccaas']
            .workers().get(req.body.WorkerSid)
            .reservations(req.body.ReservationSid)
            .update({
              instruction: 'dequeue',
              dequeueTo: workerAttributes.phoneNumber,
              dequeueFrom: twilioContext.phoneNumber,
              dequeuePostWorkActivitySid: twilioContext.taskqueueConfig.activities['Idle'].sid
            });
          res.json({});
        }
      });

      server.post(`${contextPath}/tasks/callback`, (req, res) => {
        const eventType = req.body.EventType;
        if (/^(reservation|task)\./.test(eventType)) {
          const taskAttributes = JSON.parse(req.body.TaskAttributes);
          if (eventType === 'reservation.accepted') {
            const worker = req.body.WorkerName;
            taskService
              .submitTask(taskAttributes.queue, taskAttributes)
              .then(() => {
                return taskService.assignTask(taskAttributes.taskId, worker);
              })
              .catch((err) => {
                console.error(err);
              });
          } else if (eventType === 'task.completed') {
            taskService
              .markTaskComplete(taskAttributes.taskId, 'twilio-event')
              .catch((err) => {
                console.error(err);
              });
          }
        }
        res.json({});
      });

    },
    // Update the voiceURLs on the provided phoneNumberSid
    // after the service has started.
    postConfigure() {
      return configureIncomingNumber(twilioClient,
        phoneNumberSid,
        normalizeUrl(`${baseUrl}/${contextPath}/voice`),
        normalizeUrl(`${baseUrl}/${contextPath}/sms`))
        .then(incomingNumber => {
          return configureTaskRouter(twilioClient, 'ccaas', normalizeUrl(`${baseUrl}/${contextPath}`))
            .then((taskqueueConfig) => {
              twilioContext.phoneNumber = incomingNumber.phoneNumber;
              twilioContext.taskqueueConfig = taskqueueConfig;

              console.log('Using twilio phoneNumber:', twilioContext.phoneNumber);

              // subscribe to events after task router has been configured
              subscribeEvents();
            });
        });
    }

  };
};
