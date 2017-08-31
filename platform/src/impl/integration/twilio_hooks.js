import * as normalizeUrl from 'normalize-url';
import * as uuid from 'uuid';
import {
  upsert,
  createTaskIfNotExists,
  updateTask,
  configureIncomingNumber,
  configureTaskRouter
} from './twilio_helpers';
const cookieParser = require('cookie-parser');
const twilio = require('twilio');
import { IdentityRegisteredEvent } from '../../core/identity';
import {
  ChatParticipantVO,
  ChatMessagePostedEvent,
  ChatParticipantVerificationEvent
} from '../../core/chat';
import { TaskSubmittedEvent, TaskCompletedEvent } from '../../core/task';
import {
  chatById
} from '../../core/projection/projection';

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
 * @param {string} identityVerificationBaseUrl
 * @returns {object} server configurator
 */
export default (baseUrl, contextPath, phoneNumberSid, accountSid, authToken, chatService, taskService, eventBus, identityVerificationBaseUrl) => {

  const twilioClient = twilio(accountSid, authToken);

  const twilioContext = {
  };

  const subscribeEvents = () => {

    eventBus.subscribe((event, isReplaying) => {

      if (event instanceof IdentityRegisteredEvent) {
        // create workers from registered agents
        if (event.role === 'agent' || event.role === 'bot') {
          upsert(twilioContext.taskqueueConfig.workspaces['ccaas'].workers(), {friendlyName: event.streamId}, {
            friendlyName: event.streamId,
            multiTaskEnabled: true,
            activitySid: twilioContext.taskqueueConfig.activities['Idle'].sid,
            attributes: JSON.stringify(event, null, 2)
          }).then((worker) => {
            console.log(`added worker ${worker.friendlyName} (${event.role})`);
            twilioContext.taskqueueConfig.workers[worker.friendlyName] = worker;
          }).catch((err) => {
            console.error('failed to create worker', event.streamId, err);
          });
        }
      }

      if (!isReplaying) {
        if (event instanceof ChatMessagePostedEvent) {
          chatById(event.streamId, (chat) => {
            if(chat.isCustomerOnSms() && (event.fromParticipant.role === 'agent' || event.fromParticipant.role === 'bot')) {
              twilioClient.messages.create({
                to: chat.customerPhoneNumber,
                from: twilioContext.phoneNumber,
                body: event.text
              });
            }
          });
        } else if (event instanceof ChatParticipantVerificationEvent) {
          chatById(event.streamId, (chat) => {
            if(chat.isCustomerOnSms()) {
              if (event.state === 'requested') {
                twilioClient.messages.create({
                  to: chat.customerPhoneNumber,
                  from: twilioContext.phoneNumber,
                  body: `Please follow this link to verify your identity: ${identityVerificationBaseUrl}/verify/${event.verificationRequestId}?r=/home`
                });
              } else if (event.state === 'succeeded') {
                twilioClient.messages.create({
                  to: chat.customerPhoneNumber,
                  from: twilioContext.phoneNumber,
                  body: `Thank you, your identity has been verified.`
                });
              }
            }
          });
        } else if (event instanceof TaskSubmittedEvent) {
          if (!event.taskData.twilioTaskSid) {
            createTaskIfNotExists(twilioClient,
              twilioContext.taskqueueConfig.workspaces['ccaas'].sid,
              twilioContext.taskqueueConfig.workflows['ccaas-workflow'].sid,
              event.taskData
            ).then((task) => {
              taskService.amendTask(event.streamId, {
                twilioTaskSid: task.sid
              });
            }).catch((err) => {
              console.error('failed to create task in twilio', err);
            });
          }
        } else if (event instanceof TaskCompletedEvent) {
          if (event.taskData.twilioTaskSid) {
            updateTask(twilioClient,
              twilioContext.taskqueueConfig.workspaces['ccaas'].sid,
              event.taskData.twilioTaskSid, {
                assignmentStatus: 'completed'
              })
              .catch((err) => {
                console.error('failed to update task in twilio', err);
              });
          }
        } else if (event.name === 'ChatParticipantAuthenticationVerificationRequestedEvent') {
          // TODO
        }
      }
    }, {replay: true});

  };

  return {

    // Define twilio webhook endpoints
    preConfigure(server) {

      server.use(cookieParser());

      server.use(function (req, res, next) {
        if (req.path.indexOf(contextPath) === 0 && req.path.indexOf('nosig') === -1) {
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
            let chatId = req.cookies['x-conversation-id'];
            if (!req.cookies['x-conversation-id']) {
              res.cookie('x-conversation-id', chatId = uuid.v4());
            }
            const incomingPhoneNumber = req.body.From;
            const fromParticipantId = `sms-incoming::${chatId}`;
            const text = req.body.Body;
            const participant = new ChatParticipantVO(incomingPhoneNumber, 'visitor', fromParticipantId, incomingPhoneNumber);
            chatService.startChat(chatId, participant).then(() => {
              chatService
                .postMessage(chatId, participant, text);
            });
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
            break;
          }
          default:
            res.status(404);
            break;
        }
      });

      const processedTasks = [];

      server.post(`${contextPath}/tasks/assignment`, (req, res) => {
        const taskAttributes = JSON.parse(req.body.TaskAttributes);
        if (taskAttributes.channel === 'chat') {
          res.json({
            instruction: 'accept'
          });
        } else if (taskAttributes.caller && processedTasks.indexOf(req.body.TaskSid) < 0) {
          processedTasks.push(req.body.TaskSid);
          twilioContext.taskqueueConfig.workspaces['ccaas']
            .tasks()
            .get(req.body.TaskSid)
            .fetch((err, twilioTask) => {
              if (twilioTask.taskChannelUniqueName === 'voice') {
                const workerAttributes = JSON.parse(req.body.WorkerAttributes);
                taskAttributes.channel = 'voice';
                taskAttributes.twilioTaskSid = req.body.TaskSid;
                taskService
                  .submitTask(taskAttributes.queue, taskAttributes)
                  .then((task) => {
                    taskAttributes.taskId = task.id;
                    return twilioTask.update({
                      attributes: JSON.stringify(taskAttributes)
                    }).then(() => {
                      return taskService.assignTask(task.id, workerAttributes.username);
                    });
                  })
                  .then(() => {
                    res.json({
                      instruction: 'dequeue',
                      to: workerAttributes.phoneNumber,
                      from: twilioContext.phoneNumber,
                      post_work_activity_sid: twilioContext.taskqueueConfig.activities['Idle'].sid, // eslint-disable-line camelcase
                      status_callback_url: normalizeUrl(`${baseUrl}/${contextPath}/nosig/taskcallstatus/${taskAttributes.taskId}`), // eslint-disable-line camelcase
                      status_callback_events: 'initiated,ringing,answered,completed' // eslint-disable-line camelcase
                    });
                  })
                  .catch((err) => {
                    console.error(err);
                    res.json({});
                  });
              }
            });
        } else {
          res.status(400).json({});
        }
      });

      server.post(`${contextPath}/callstatus`, (req, res) => {
        console.log('callstatus', req.body);
        res.send({});
      });

      server.all(`${contextPath}/nosig/taskcallstatus/:taskId`, (req, res) => {
        console.log('taskcallstatus', req.method, req.headers, req.body, req.params);
        taskService.amendTask(req.params.taskId, {
          callStatus: req.body.CallStatus,
          duration: req.body.Duration
        });
        res.send({});
      });

      server.post(`${contextPath}/tasks/callback`, (req, res) => {
        const eventType = req.body.EventType;
        if (/^(reservation|task)\./.test(eventType)) {
          const taskAttributes = JSON.parse(req.body.TaskAttributes);
          if (eventType === 'reservation.accepted') {
            const worker = req.body.WorkerName;
            taskService
              .submitTask(taskAttributes.queue, taskAttributes)
              .then((task) => {
                return taskService.assignTask(task.id, worker);
              })
              .catch((err) => {
                console.error(err);
              });
          } else if (eventType === 'task.completed') {
            taskService
              .markTaskComplete(taskAttributes.taskId, JSON.stringify(req.body))
              .catch((err) => {
                console.error(err);
              });
          } else if (eventType === 'task.canceled') {
            taskService
              .cancelTask(taskAttributes.taskId, JSON.stringify(req.body))
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
        normalizeUrl(`${baseUrl}/${contextPath}/sms`),
        normalizeUrl(`${baseUrl}/${contextPath}/callstatus`))
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
