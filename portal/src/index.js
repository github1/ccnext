import { render } from 'react-dom';
import page from 'page';
import Container from './component/container';
import './style/theme.scss';
import uuid from 'uuid';
import {
  isMobile,
  resetScrollVirtualKeyboard,
  resetScroll,
  preventZoom,
  growl
} from './browser_utils';
import {
  identity,
  authenticateAnonymous,
  authenticate,
  profile,
  signout,
  requestIdentityVerification,
  register
} from './api/identity.js';
import { startChat, leaveChat, postChatMessage } from './api/chat.js';
import { getTasks, markTaskComplete, populateTasks } from './api/tasks.js';
import { openEventStream, subscribeTo, unsubscribe } from './api/events';

import {
  REALTIME_CONNECTION_ESTABLISHED,
  RECEIVE_ENTITY_EVENT,
  NAVIGATE,
  NAVIGATION_REQUESTED,
  CLEAR_USER,
  SIGN_IN,
  SIGN_OUT,
  REGISTER_USER,
  USER_REGISTERED,
  AUTHENTICATION_STARTED,
  AUTHENTICATION_FAILED,
  AUTHENTICATION_SUCCESS,
  VERIFY_IDENTITY,
  CANCEL_IDENTITY_VERIFICATION,
  IDENTITY_VERIFICATION_REQUESTED,
  IDENTITY_VERIFICATION_SUCCESS,
  IDENTITY_VERIFICATION_CANCELLED,
  JOIN_CHAT,
  CHAT_JOINED,
  LEAVE_CHAT,
  CHAT_LEFT,
  POST_OUTGOING_CHAT_MESSAGE,
  OUTGOING_CHAT_MESSAGE_POSTED,
  INCOMING_CHAT_MESSAGE_POSTED,
  CHAT_STATUS_POSTED,
  LOAD_TASKS,
  TASKS_LOADED,
  TASK_RECEIVED,
  MARK_TASK_COMPLETE,
  SELECT_TASK,
  TASK_SELECTED
} from './constants';

let element = document.getElementById('main');
if (!element) {
  element = document.createElement('div');
  document.body.className = 'layout';
  document.body.appendChild(element);
}

const pendingEvents = [];
const events = [];
const model = () => {
  return {
    messages: [],
    isPending: false,
    chatSessions: {},
    selectedTask: null,
    tasks: [],
    device: {
      isMobile: isMobile(),
      screen: {
        height: window.innerHeight
      }
    }
  }
};

const sideEffect = (command, model) => {
  const id = identity();
  if (!id.sessionId) {
    authenticateAnonymous().then(() => {
      dispatch(command);
    });
    return;
  }
  switch (command.type) {
    case NAVIGATE:
      openEventStream({
        open: () => {
          dispatch({
            type: REALTIME_CONNECTION_ESTABLISHED
          });
        },
        message: (msg) => {
          const message = JSON.parse(msg.data);
          dispatch(Object.assign({}, message, {
            type: RECEIVE_ENTITY_EVENT
          }));
        }
      });

      if (!command.redirect && !command.view) {
        command.redirect = id.role === 'agent' ? '/agent' : '/account';
      }

      if (id.role !== 'visitor' && command.view === 'home') {
        command.redirect = id.role === 'agent' ? '/agent' : '/account';
        delete command.view;
      }
      const redirectOnly = command.redirect && !command.view;
      const perform = () => {
        if (redirectOnly) {
          if (window.location.pathname !== command.redirect) {
            page.redirect(command.redirect);
          }
        } else {
          dispatch({
            type: NAVIGATION_REQUESTED,
            view: command.view
          });
        }
      };

      if (redirectOnly || command.insecure) {
        perform();
      } else {
        if (id.role !== 'visitor') {
          profile().then((user) => {
            dispatch({
              type: AUTHENTICATION_SUCCESS,
              user: user
            }).then(() => {
              subscribeTo(id.username).then(() => perform());
            });
          });
        } else {
          dispatch({
            type: NAVIGATE,
            redirect: '/home'
          });
        }
      }
      break;
    case RECEIVE_ENTITY_EVENT:
      if (command.name === 'ChatMessagePostedEvent') {
        if (command.fromParticipant.sessionId !== id.sessionId) {
          setTimeout(() => {
            dispatch({
              type: INCOMING_CHAT_MESSAGE_POSTED,
              messageId: command.messageId,
              id: command.streamId,
              from: command.fromParticipant.handle,
              text: command.text
            });
          }, 500);
        } else {
          dispatch({
            type: OUTGOING_CHAT_MESSAGE_POSTED,
            messageId: command.messageId,
            id: command.streamId,
            from: command.fromParticipant.handle,
            text: command.text
          });
        }
      } else if (/^ChatParticipant(Joined|Left)Event$/.test(command.name)) {
        const eventType = /^ChatParticipant(Joined|Left)Event$/.exec(command.name)[1].toLowerCase();
        dispatch({
          type: CHAT_STATUS_POSTED,
          messageId: `${command.name}-${command.timestamp}-${command.participant.handle}`,
          messageType: 'status',
          eventType: eventType,
          participant: command.participant,
          id: command.streamId,
          text: `${command.participant.handle} has ${eventType} the chat`
        });
      } else if (command.name === 'ChatParticipantModifiedEvent') {
        dispatch({
          type: CHAT_STATUS_POSTED,
          messageId: `${command.name}-${command.timestamp}-${command.fromParticipant.handle}-${command.toParticipant.handle}`,
          messageType: 'status',
          eventType: command.name,
          fromParticipant: command.fromParticipant,
          toParticipant: command.toParticipant,
          id: command.streamId,
          text: ''
        });
      } else if (command.name === 'ChatParticipantVerificationEvent') {
        dispatch({
          type: CHAT_STATUS_POSTED,
          messageId: `${command.name}-${command.timestamp}-${command.participantSessionId}`,
          messageType: 'status',
          eventType: `${command.name}-${command.state}`,
          participantSessionId: command.participantSessionId,
          id: command.streamId,
          text: `identity verification ${command.state}`
        });
        if (command.state === 'requested' && command.participantSessionId === id.sessionId) {
          dispatch({
            type: NAVIGATE,
            redirect: `/verify/${command.participantSessionId}`
          });
          //dispatch({
          //  type: IDENTITY_VERIFICATION_REQUESTED
          //});
        }
      } else if (command.name === 'WorkerTaskStatusUpdatedEvent') {
        populateTasks(command.task).then((tasks) => {
          const url = `/agent/task/${tasks[0].taskId}`;
          growl({
            title: `Task ${tasks[0].status}`,
            message: `<a href='${url}'>${tasks[0].taskId}</a>`
          });
          dispatch({
            type: TASK_RECEIVED,
            task: tasks[0]
          })
            .then(() => {
              if (tasks[0].status === 'assigned' && tasks[0].channel === 'voice') {
                page.redirect('/agent/task/' + tasks[0].taskId);
              }
            });
        });
      } else if (command.name === 'WorkerTaskDataUpdatedEvent') {
        dispatch({
          type: TASK_RECEIVED,
          task: command.task
        });
      }
      break;
    case CANCEL_IDENTITY_VERIFICATION:
      if (window.location.pathname.indexOf('/verify') > -1) {
        dispatch({
          type: SIGN_OUT
        });
      } else {
        dispatch({
          type: IDENTITY_VERIFICATION_CANCELLED
        });
      }
      break;
    case REGISTER_USER:
      register(command).then(() => {
        dispatch({
          type: USER_REGISTERED
        }).then(() => {
          page.redirect('/home');
        });
      });
      break;
    case SIGN_IN:
      if (command.username.trim().length === 0 ||
        command.password.trim().length === 0) {
        dispatch({
          type: AUTHENTICATION_FAILED
        });
      } else {
        dispatch({
          type: AUTHENTICATION_STARTED
        });
        authenticate(command.username, command.password).then((user) => {
          profile().then((userProfile) => {
            return dispatch({
              type: AUTHENTICATION_SUCCESS,
              user: userProfile
            }).then(() => {
              if (command.isVerification) {
                dispatch({
                  type: IDENTITY_VERIFICATION_SUCCESS
                });
              } else {
                // subscribe to events addressed to this user
                return subscribeTo(user.username).then(() => {
                  page.redirect('/');
                });
              }
            });
          });
        }).catch(() => {
          signout();
          dispatch({
            type: AUTHENTICATION_FAILED
          });
        });
      }
      break;
    case SIGN_OUT:
      unsubscribe();
      signout();
      dispatch({
        type: CLEAR_USER
      }).then(() => {
        dispatch({
          type: NAVIGATE,
          redirect: '/home'
        });
      });
      break;
    case VERIFY_IDENTITY:
      requestIdentityVerification(command.identityId);
      break;
    case JOIN_CHAT:
    {
      const chatId = uuid.v4();
      subscribeTo(chatId).then(() => {
        return startChat(chatId)
      }).then(() => {
        dispatch({
          type: CHAT_JOINED,
          id: chatId,
          componentInstanceId: command.componentInstanceId
        });
      });
      break;
    }
    case LEAVE_CHAT:
      Object.keys(model.chatSessions).forEach((chatId) => {
        if (chatId === command.id || typeof command.id === 'undefined') {
          leaveChat(chatId).then(() => {
            dispatch({
              type: CHAT_LEFT,
              id: chatId
            });
          });
        }
      });
      break;
    case POST_OUTGOING_CHAT_MESSAGE:
      postChatMessage(command.id, command.text);
      break;
    case LOAD_TASKS:
      getTasks()
        .then((tasks) => {
          dispatch({
            type: TASKS_LOADED,
            tasks: tasks
          });
        });
      break;
    case MARK_TASK_COMPLETE:
      markTaskComplete(command.task);
      break;
    case SELECT_TASK:
      dispatch({
        type: TASK_SELECTED,
        taskId: command.taskId
      });
      break;
  }
};

const update = (event, model) => {
  model.invalid_credentials = false;
  switch (event.type) {
    case NAVIGATION_REQUESTED:
      delete model.messages['invalid_credentials'];
      model.view = event.view;
      break;
    case CLEAR_USER:
      delete model.user;
      delete model.identityVerificationRequired;
      break;
    case USER_REGISTERED:
      model.messages['user_registered'] = {
        type: 'success',
        text: 'Enrollment complete',
        global: true
      };
      break;
    case AUTHENTICATION_STARTED:
      delete model.messages['user_registered'];
      delete model.messages['invalid_credentials'];
      model.isPending = true;
      break;
    case AUTHENTICATION_FAILED:
      model.isPending = false;
      model.messages['invalid_credentials'] = {
        type: 'danger',
        text: 'Wrong username or password'
      };
      break;
    case AUTHENTICATION_SUCCESS:
      model.isPending = false;
      model.user = event.user;
      break;
    case CHAT_JOINED:
      model.chatSessions[event.id] = {
        id: event.id,
        componentInstanceIds: [event.componentInstanceId]
      };
      break;
    case IDENTITY_VERIFICATION_REQUESTED:
      model.identityVerificationRequired = identity().role === 'visitor' ? 'full' : 'partial';
      break;
    case IDENTITY_VERIFICATION_CANCELLED:
    case IDENTITY_VERIFICATION_SUCCESS:
      delete model.identityVerificationRequired;
      break;
    case CHAT_LEFT:
      delete model.chatSessions[event.id];
      break;
    case OUTGOING_CHAT_MESSAGE_POSTED:
    {
      model.chatSessions[event.id] = model.chatSessions[event.id] || {};
      const chatSession = model.chatSessions[event.id];
      chatSession.messages = chatSession.messages || [];
      const index = chatSession.messages.findIndex((message) => message.messageId === event.messageId);
      if (index === -1) {
        chatSession.messages.push({
          messageId: event.messageId,
          from: event.from,
          direction: 'outgoing',
          text: event.text
        });
      }
      break;
    }
    case CHAT_STATUS_POSTED:
    case INCOMING_CHAT_MESSAGE_POSTED:
    {
      model.chatSessions[event.id] = model.chatSessions[event.id] || {};
      const chatSession = model.chatSessions[event.id];
      chatSession.messages = chatSession.messages || [];
      const index = chatSession.messages.findIndex((message) => message.messageId === event.messageId);
      if (index === -1 && event.text !== '') {
        chatSession.messages.push({
          messageType: event.messageType,
          messageId: event.messageId,
          from: event.from,
          direction: 'incoming',
          text: event.text
        });
      }
      if (event.messageType === 'status') {
        if (event.eventType === 'Joined' && ['visitor', 'customer'].indexOf(event.participant.role) > -1) {
          chatSession.customer = event.participant;
        }
        if (event.eventType === 'ChatParticipantModifiedEvent') {
          if (chatSession.customer && chatSession.customer.sessionId === event.toParticipant.sessionId) {
            chatSession.customer = event.toParticipant;
          }
        }
        if (event.eventType === 'ChatParticipantVerificationEvent-succeeded') {
          if (chatSession.customer.sessionId === event.participantSessionId) {
            chatSession.customer.verified = true;
          }
        }
      }
      break;
    }
    case TASKS_LOADED:
      model.tasks = event.tasks;
      event.tasks.forEach(task => {
        loadChatLog(task.chatId, task.chatLog, model);
      });
      break;
    case TASK_RECEIVED:
      const index = model.tasks.findIndex((task) => {
        return task.taskId === event.task.taskId;
      });
      if (index === -1) {
        model.tasks.push(event.task);
      } else {
        model.tasks[index] = event.task;
      }
      if (model.selectedTask && model.selectedTask.taskId === event.task.taskId) {
        model.selectedTask = event.task;
      }
      loadChatLog(event.task.chatId, event.task.chatLog, model);
      break;
    case TASK_SELECTED:
      model.selectedTask = event.taskId;
      break;
  }
  return model;
};

const loadChatLog = (chatId, chatLog, model) => {
  if (!chatId || !chatLog) {
    return;
  }
  const chatLogToMessage = (chatLog) => {
    if (/^ChatParticipant(Joined|Left)Event$/.test(chatLog.name)) {
      const eventType = /^ChatParticipant(Joined|Left)Event$/.exec(chatLog.name)[1];
      return {
        messageId: `${chatLog.name}-${chatLog.timestamp}-${chatLog.participant.handle}`,
        messageType: 'status',
        eventType: eventType,
        participant: chatLog.participant,
        text: `${chatLog.participant.handle} has ${eventType.toLowerCase()} the chat`
      }
    } else if (chatLog.name === 'ChatParticipantModifiedEvent') {
      return {
        messageId: `${chatLog.name}-${chatLog.timestamp}-${chatLog.fromParticipant.handle}-${chatLog.toParticipant.handle}`,
        messageType: 'status',
        eventType: chatLog.name,
        fromParticipant: chatLog.fromParticipant,
        toParticipant: chatLog.toParticipant,
        text: ''
      }
    } else if (chatLog.name === 'ChatParticipantVerificationEvent') {
      return {
        messageId: `${chatLog.name}-${chatLog.timestamp}-${chatLog.participantSessionId}`,
        messageType: 'status',
        eventType: `${chatLog.name}-${chatLog.state}`,
        participantSessionId: chatLog.participantSessionId,
        text: `identity verification ${chatLog.state}`
      }
    } else if (chatLog.name === 'ChatMessagePostedEvent') {
      return {
        messageId: chatLog.messageId,
        direction: ['customer', 'visitor'].indexOf(chatLog.fromParticipant.role) > -1 ? 'incoming' : 'outgoing',
        from: chatLog.fromParticipant.handle,
        text: chatLog.text
      }
    }
  };
  model.chatSessions[chatId] = model.chatSessions[chatId] || {};
  const session = model.chatSessions[chatId];
  let messages = chatLog ? chatLog.map(chatLogToMessage).filter(msg => msg) : [];
  if (session && session.messages) {
    session.messages.forEach((msg) => {
      if (messages.findIndex((logMsg) => {
          return logMsg.messageId === msg.messageId;
        }) === -1) {
        messages.push(msg);
      }
    });
  }
  messages.forEach(msg => {
    if (msg.messageType === 'status') {
      if(msg.eventType === 'Joined' && ['customer', 'visitor'].indexOf(msg.participant.role) > -1) {
        session.customer = msg.participant;
      }
      if (msg.eventType === 'ChatParticipantModifiedEvent') {
        if (session.customer && session.customer.sessionId === msg.fromParticipant.sessionId) {
          session.customer.handle = msg.toParticipant.handle;
          session.customer.role = msg.toParticipant.role;
        }
      }
    }
  });
  messages.forEach(msg => {
    if (msg.eventType === 'ChatParticipantVerificationEvent-succeeded') {
      if (session.customer.sessionId === msg.participantSessionId) {
        session.customer.verified = true;
      }
    }
  });
  session.messages = messages.filter(msg => msg.text !== '');
};

let rendering = false;
let latestModel = {};
window.dispatch = (event) => {
  return new Promise((resolve) => {
    sideEffect(event, latestModel);
    const isTransientEvent = (event.type || '').indexOf(':') === 0;
    if (isTransientEvent) {
      resolve(latestModel);
      return;
    }
    if (!rendering) {
      rendering = true;
      while (pendingEvents.length > 0) {
        events.push(pendingEvents.pop());
      }
      events.push(event);
      latestModel = events.reduce((updated, event) => {
        return update(event, updated);
      }, JSON.parse(JSON.stringify(model())));
      render(<Container model={ latestModel }/>, element, () => {
        rendering = false;
        resolve(latestModel);

        if (latestModel.device.isMobile) {
          resetScrollVirtualKeyboard();
        }

      });
    } else {
      pendingEvents.push(event);
    }
  });
};

window.onload = function () {

  document.addEventListener('keyup',
    function (e) {
      if (e.key === 'Escape') {
        dispatch({
          type: LEAVE_CHAT
        });
      }
    }, true);

  window.addEventListener('resize',
    function (e) {
      dispatch({});
    }, true);

  preventZoom();

  page('/', () => {
    window.dispatch({
      type: NAVIGATE
    });
  });

  page('/verify/:sessionId', (ctx) => {
    window.dispatch({
      type: IDENTITY_VERIFICATION_REQUESTED,
      identitySessionId: ctx.params.sessionId
    });
  });

  page('/agent', () => {
    dispatch({
      type: SELECT_TASK
    }).then(() => {
      dispatch({
        type: NAVIGATE,
        view: 'agent',
        insecure: false
      });
    });
  });

  page('/agent/task/:taskId', (ctx) => {
    dispatch({
      type: SELECT_TASK,
      taskId: ctx.params.taskId
    }).then(() => {
      dispatch({
        type: NAVIGATE,
        view: 'agent',
        insecure: false
      });
    });
  });

  page('/:view', (ctx) => {
    dispatch({
      type: NAVIGATE,
      view: ctx.params.view,
      insecure: ['home', 'enroll', 'dev'].indexOf(ctx.params.view) > -1
    });
  });

  page.start();

};
