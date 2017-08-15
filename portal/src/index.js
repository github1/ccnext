import { render } from 'react-dom';
import jwts from 'jwt-simple';
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
import { identity, authenticate, signout, register } from './api/identity.js';
import { startChat, leaveChat, postChatMessage } from './api/chat.js';
import { getTasks, markTaskComplete, populateTasks } from './api/tasks.js';
import { openEventStream, subscribeTo, unsubscribe } from './api/events';

import {
  INIT,
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
  switch (command.type) {
    case NAVIGATE:
    case INIT:
      const id = identity();

      openEventStream({
        open: () => {
          dispatch({
            type: REALTIME_CONNECTION_ESTABLISHED
          });
        },
        message: (msg) => {
          const message = JSON.parse(msg.data);
          dispatch({
            type: RECEIVE_ENTITY_EVENT,
            stream: message.stream,
            name: message.name,
            event: message.payload
          });
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
          dispatch({
            type: AUTHENTICATION_SUCCESS,
            user: id
          }).then(() => {
            subscribeTo(id.username).then(() => perform());
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
        if (command.event.fromParticipant !== identity().username) {
          setTimeout(() => {
            dispatch({
              type: INCOMING_CHAT_MESSAGE_POSTED,
              messageId: command.event.messageId,
              id: command.stream,
              from: command.event.fromParticipant,
              text: command.event.text
            });
          }, 500);
        } else {
          dispatch({
            type: OUTGOING_CHAT_MESSAGE_POSTED,
            messageId: command.event.messageId,
            id: command.stream,
            from: command.event.fromParticipant,
            text: command.event.text
          });
        }
      } else if (/^ChatParticipant(Joined|Left)Event$/.test(command.name)) {
        const eventType = /^ChatParticipant(Joined|Left)Event$/.exec(command.name)[1];
        dispatch({
          type: CHAT_STATUS_POSTED,
          messageId: `${JSON.stringify(command.event)}`,
          messageType: 'status',
          id: command.stream,
          text: `${command.event.participant} has ${eventType.toLowerCase()} the chat`
        });
      } else if (command.name === 'WorkerTaskStatusUpdatedEvent') {
        populateTasks(command.event.task).then((tasks) => {
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
            if(tasks[0].status === 'assigned' && tasks[0].channel === 'voice') {
              page.redirect('/agent/task/' + tasks[0].taskId);
            }
          });
        });
      } else if (command.name === 'WorkerTaskDataUpdatedEvent') {
        dispatch({
          type: TASK_RECEIVED,
          task: command.event.task
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
        authenticate(command.username, command.password).then((id) => {
          return dispatch({
            type: AUTHENTICATION_SUCCESS,
            user: id
          }).then(() => {
            // subscribe to events addressed to this user
            return subscribeTo(command.username).then(() => {
              page.redirect('/');
            });
          });
        }).catch((err) => {
          console.log(err);
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
          type: INIT,
          redirect: '/landing'
        });
      });
      break;
    case JOIN_CHAT:
    {
      const chatId = uuid.v4();
      subscribeTo(chatId).then(() => {
        return startChat(chatId, identity().username)
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
          leaveChat(chatId, identity().username).then(() => {
            dispatch({
              type: CHAT_LEFT,
              id: chatId
            });
          });
        }
      });
      break;
    case POST_OUTGOING_CHAT_MESSAGE:
    {
      const fromParticipant = identity().username;
      postChatMessage(command.id, fromParticipant, command.text);
      break;
    }
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
      if (index === -1) {
        chatSession.messages.push({
          messageType: event.messageType,
          messageId: event.messageId,
          from: event.from,
          direction: 'incoming',
          text: event.text
        });
      }
      break;
    }
    case TASKS_LOADED:
      model.tasks = event.tasks;
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
      break;
    case TASK_SELECTED:
      model.selectedTask = event.taskId;
      break;
  }
  return model;
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
          type: END_CHAT
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
      type: INIT
    });
  });

  page('/agent', (ctx) => {
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
