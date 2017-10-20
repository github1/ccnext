import * as superagent from 'superagent';
import {
  ChatMessagePostedEvent,
  ChatParticipantJoinedEvent,
  ChatStatusPostedEvent,
  ChatTransferredEvent,
  ChatEndedEvent,
  ChatParticipantVO
} from '../../core/chat';
import {
  TaskSubmittedEvent
} from '../../core/task';
import {
  chatById
} from '../../core/projection/projection';

const journal = {};
const interactionTasks = {};

module.exports = (ccsipBaseUrl, chatService, taskService, eventBus) => {

  eventBus.subscribe((event, isReplaying) => {
    if (!isReplaying) {
      if (event instanceof ChatParticipantJoinedEvent) {

        if (event.participant.sourceSystem === 'web'
          && event.participant.role !== 'agent'
          && event.participant.role !== 'bot') {
          superagent
            .post(`${ccsipBaseUrl}/interaction/${event.streamId}`)
            .send({
              command: 'InitiateChat',
              from: `web:${event.participant.sessionId}`,
              initialMessage: ''
            })
            .catch(err => {
              console.error(err);
            });
        }

      } else if (event instanceof ChatMessagePostedEvent) {
        if (event.fromParticipant.role === 'bot' || event.fromParticipant.role === 'agent') {
          superagent
            .post(`${ccsipBaseUrl}/chat/${event.streamId}`)
            .send({
              from: event.fromParticipant.handle,
              message: event.text
            })
            .catch(err => {
              console.error(err);
            });
        }
      } else if (event instanceof ChatStatusPostedEvent) {
        superagent
          .post(`${ccsipBaseUrl}/chat/${event.streamId}`)
          .send({
            from: 'system',
            message: `[${event.text}]`
          })
          .catch(err => {
            console.error(err);
          });
      } else if (event instanceof ChatTransferredEvent) {
        superagent
          .post(`${ccsipBaseUrl}/route/${event.streamId}`)
          .send({
            channel: 'chat',
            queue: event.toQueue || 'bot'
          })
          .then(() => {
            console.log('transfer submitted');
          })
          .catch(err => {
            console.error(err);
          });
      } else if (event instanceof ChatEndedEvent) {
        superagent
          .post(`${ccsipBaseUrl}/interaction/${event.streamId}`)
          .send({
            command: 'EndInteraction',
          })
          .then(() => {
            console.log('end chat interaction success');
          })
          .catch(err => {
            console.error(err);
          });
      } else if (event instanceof TaskSubmittedEvent) {
        if (event.taskData.interactionId) {
          interactionTasks[event.taskData.interactionId] = event.streamId;
        }
      }
    }
  }, {replay: true});

  const startTime = new Date().getTime();

  setInterval(() => {

    superagent
      .get(`${ccsipBaseUrl}/events`).then((res) => {
      const events = JSON.parse(res.text);

      events
        .filter((event) => {
          const keep = !journal[event.uuid];
          journal[event.uuid] = event;
          return keep;
        })
        .filter((event) => {
          return event.timestamp >= startTime;
        })
        .reduce((prev, cur) => {
          const process = (event) => {
            console.log(event.name);
            if (event.name === 'CallInitiatedEvent') {
              // ...
            } else if (event.name === 'ChatInitiatedEvent') {
              if (!/^web:/.test(event.from)) {
                const participant = new ChatParticipantVO(event.from, 'visitor', `chat-incoming::${event.streamId}`, event.from);
                return chatService.startChat(event.streamId, participant)
                  .then(() => {
                    return chatService.postMessage(event.streamId, participant, event.initialMessage);
                  });
              }
            } else if (event.name === 'ChatMessagePostedEvent') {
              if (event.to === 'inbound') {
                const participant = new ChatParticipantVO(event.from, 'visitor', `chat-incoming::${event.streamId}`, event.from);
                chatById(event.streamId, () => {
                  chatService.postMessage(event.streamId, participant, event.message);
                }, () => {
                  return chatService.startChat(event.streamId, participant).then(() => {
                    return chatService.transferTo(event.streamId, 'bot');
                  }).then(() => {
                    return chatService.postMessage(event.streamId, participant, event.message);
                  });
                });
              }
            } else if (event.name === 'InteractionRoutedEvent') {
              const channel = (event.interaction || {}).channel;
              const workers = {
                '1001': 'demoagent',
                'chat-bot': 'CCaaSBot'
              };
              if (channel === 'chat') {
                const matches = /^(dest:([^:]+):)?queue:([^:]+)$/.exec(event.endpoint);
                if (matches === null) {
                  return chatService.transferTo(event.streamId, 'bot');
                } else {
                  const dest = matches[2];
                  const queue = matches[3];
                  console.log('submitting chat task to queue', event.endpoint, queue, dest);
                  if (dest && queue) {
                    return taskService.submitTask(queue, {
                      channel: channel,
                      from: event.interaction.originator,
                      interactionId: event.streamId,
                      chatId: event.streamId
                    }).then((task) => {
                      if (dest) {
                        const worker = workers[dest];
                        if (worker) {
                          return taskService.assignTask(task.id, worker);
                        } else {
                          console.error(`worker ${dest} not found`);
                        }
                      }
                    });
                  }
                }
              } else if (channel === 'voice') {
                return taskService.submitTask('call-queue', {
                  channel: channel,
                  from: event.interaction.fromPhoneNumber,
                  callStatus: 'Ringing',
                  interactionId: event.streamId,
                  duration: 0
                }).then((task) => {
                  const endpoint = event.interaction.agentId || event.endpoint;
                  const worker = workers[endpoint];
                  if (worker) {
                    return taskService.assignTask(task.id, worker);
                  } else {
                    console.error(`worker ${endpoint} not found`);
                  }
                });
              }
            } else if (event.name === 'InteractionAnsweredEvent') {
              if(interactionTasks[event.streamId]) {
                return taskService.amendTask(interactionTasks[event.streamId], {
                  callStatus: 'In-progress',
                  answeredTime: new Date().getTime(),
                  duration: 0
                });
              }
            } else if (event.name === 'InteractionEndedEvent') {
              if(interactionTasks[event.streamId]) {
                return taskService.amendTask(interactionTasks[event.streamId], {
                  callStatus: 'Call ended',
                  endedTime: new Date().getTime(),
                  duration: 0
                });
              }
            }
            return Promise.resolve();
          };
          return prev === null ? process(cur) : prev
            .then(() => process(cur)
              .catch((err)=> {
                console.error(err);
                return process(cur);
              }));
        }, null);

    });

  }, 1000);

};
