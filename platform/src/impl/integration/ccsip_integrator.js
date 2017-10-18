import * as superagent from 'superagent';
import { IdentityRegisteredEvent } from '../../core/identity';
import {
  ChatMessagePostedEvent,
  ChatParticipantVO
} from '../../core/chat';
import {
  TaskSubmittedEvent
} from '../../core/task';
import {
  allUsers,
  chatById
} from '../../core/projection/projection';

const journal = {};

module.exports = (chatService, taskService, eventBus) => {

  eventBus.subscribe((event, isReplaying) => {
    if (!isReplaying) {
      if (event instanceof ChatMessagePostedEvent) {
        if(event.fromParticipant.role === 'bot' || event.fromParticipant.role === 'agent') {
          superagent
            .post(`http://ccsip-kamailio-0.open-cc.org/chat/${event.streamId}`)
            .send({
              from: event.fromParticipant.phoneNumber,
              message: event.text
            })
            .catch(err => {
              console.error(err);
            });
        }
      } else if (event instanceof TaskSubmittedEvent) {
        if(event.taskData.channel === 'chat') {
          if(event.taskData.queue === 'bot') {
            taskService.assignTask(event.streamId, 'CCaaSBot');
          } else {
            taskService.assignTask(event.streamId, 'demoagent');
          }
        }
      }
    }
  }, {replay: true});

  const startTime = new Date().getTime();

  setInterval(() => {

    superagent
      .get('http://ccsip-kamailio-0.open-cc.org/events').then((res) => {
      const events = JSON.parse(res.text);


      allUsers((users) => {

        events
          .filter((event) => {
            const keep = !journal[event.uuid];
            journal[event.uuid] = event;
            return keep;
          })
          .filter((event) => {
            if (false && event.interaction && event.interaction.channel === 'chat') {
              console.log('skipping chat event', event);
              return false;
            }
            return true;
          })
          .filter((event) => {
            return event.timestamp >= startTime;
          })
          .reduce((prev, cur) => {
            const process = (event) => {

              if (event.name === 'CallInitiatedEvent') {
                return taskService.submitTask('call-queue', {
                  channel: event.channel,
                  taskId: event.streamId,
                  from: event.fromPhoneNumber,
                  callStatus: 'Ringing',
                  duration: 0
                })
              } else if (event.name === 'ChatInitiatedEvent') {
                const participant = new ChatParticipantVO(event.from, 'visitor', `chat-incoming::${event.streamId}`, event.from);
                chatService.startChat(event.streamId, participant)
                  .then(() => {
                    chatService.postMessage(event.streamId, participant, event.initialMessage);
                  });
              } else if (event.name === 'ChatMessagePostedEvent') {
                if (event.to === 'inbound') {
                  const participant = new ChatParticipantVO(event.from, 'visitor', `chat-incoming::${event.streamId}`, event.from);
                  chatById(event.streamId, () => {
                    chatService.postMessage(event.streamId, participant, event.message);
                  }, () => {
                    console.log(`chat ${event.streamId} not found ... starting`);
                    chatService.startChat(event.streamId, participant)
                      .then(() => {
                        chatService.postMessage(event.streamId, participant, event.message);
                      });
                  });
                }
              } else if (event.name === 'InteractionRoutedEvent') {
                const worker = event.interaction.agentId === '1001' ? 'demoagent' : event.interaction.agentId;
                return taskService.assignTask(event.streamId, worker);
              } else if (event.name === 'InteractionAnsweredEvent') {
                return taskService.amendTask(event.streamId, {
                  callStatus: 'In-progress',
                  duration: 0
                });
              } else if (event.name === 'InteractionEndedEvent') {
                return taskService.amendTask(event.streamId, {
                  callStatus: 'Call ended',
                  duration: 0
                });
              } else {
                return Promise.resolve();
              }
            };
            return prev === null ? process(cur) : prev.then(() => process(cur));
          }, null);

      });

    });

  }, 1000);

}

/*-
 export default (chatService, taskService, eventBus) => {

 return {
 preConfigure(server) {

 },
 postConfigure() {

 setInterval(() => {

 superagent
 .get('http://ccsip-kamailio-0.open-cc.org/agents').then((res) => {

 });

 }, 1000);

 }
 }

 }*/
