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
  growl,
  queryParams
} from './browser_utils';
import {
  identity,
  authenticateAnonymous,
  authenticate,
  profile,
  signout,
  getIdentityVerificationRequest,
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
  LOAD_IDENTITY_VERIFICATION_REQUEST,
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
  TASK_SELECTED,
  WORKER_AVAILABILITY_UPDATED,
  RESIZED
} from './constants';

let element = document.getElementById('main');
if (!element) {
  element = document.createElement('div');
  document.body.className = 'layout';
  document.body.appendChild(element);
}

const pendingEvents = [];
const model = () => {
  return {
    messages: [],
    isPending: false,
    chatSessions: {},
    selectedTask: null,
    tasks: [],
    user: identity(),
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
              rawEvent: command
            });
          }, 500);
        } else {
          dispatch({
            type: OUTGOING_CHAT_MESSAGE_POSTED,
            rawEvent: command
          });
        }
      } else if (/^ChatParticipant(Joined|Left|Modified|Verification)Event$/.test(command.name)) {

        if (command.name == 'ChatParticipantLeftEvent' && command.participant.sessionId === id.sessionId) {
          unsubscribe(command.streamId).then(() => {
            dispatch({
              type: CHAT_STATUS_POSTED,
              rawEvent: command
            });
          });
        } else {
          dispatch({
            type: CHAT_STATUS_POSTED,
            rawEvent: command
          });
        }

        if (command.name === 'ChatParticipantVerificationEvent') {
          if (command.state === 'requested' && command.participantSessionId === id.sessionId) {
            dispatch({
              type: NAVIGATE,
              redirect: `/verify/${command.verificationRequestId}?r=${window.location.pathname}`
            });
          }
        }
      } else if (command.name === 'ChatStatusPostedEvent') {
        dispatch({
          type: CHAT_STATUS_POSTED,
          rawEvent: command
        });
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
      } else if (command.name === 'WorkerAvailabilityUpdated') {
        dispatch({
          type: WORKER_AVAILABILITY_UPDATED,
          voice: command.voice,
          chat: command.chat
        });
      }
      break;
    case LOAD_IDENTITY_VERIFICATION_REQUEST:
      getIdentityVerificationRequest(command.verificationRequestId)
        .then((result) => {
          dispatch({
            type: IDENTITY_VERIFICATION_REQUESTED,
            identitySessionId: result.identityId
          });
        })
        .catch(() => {
          dispatch({
            type: CANCEL_IDENTITY_VERIFICATION
          });
        });
      break;
    case CANCEL_IDENTITY_VERIFICATION:
      if (window.location.pathname.indexOf('/verify') > -1) {
        if (model.queryParams.r) {
          dispatch({
            type: NAVIGATE,
            redirect: model.queryParams.r
          });
        } else {
          dispatch({
            type: SIGN_OUT
          });
        }
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
      dispatch({
        type: AUTHENTICATION_STARTED
      });
      authenticate(command).then((user) => {
        profile().then((userProfile) => {
          return dispatch({
            type: AUTHENTICATION_SUCCESS,
            user: userProfile
          }).then(() => {
            if (command.isVerification) {
              dispatch({
                type: IDENTITY_VERIFICATION_SUCCESS
              }).then(() => {
                if (model.queryParams.r) {
                  dispatch({
                    type: NAVIGATE,
                    redirect: model.queryParams.r
                  });
                }
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
        if (!command.isVerification) {
          signout();
        }
        dispatch({
          type: AUTHENTICATION_FAILED
        });
      });
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
    case RESIZED:
      model.device.screen.height = event.height;
      break;
    case NAVIGATION_REQUESTED:
      delete model.identityVerificationRequired;
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
      delete model.messages['invalid_credentials'];
      model.identityVerificationRequired = {
        mode: 'full',
        identitySessionId: event.identitySessionId
      };
      break;
    case IDENTITY_VERIFICATION_CANCELLED:
    case IDENTITY_VERIFICATION_SUCCESS:
      delete model.identityVerificationRequired;
      break;
    case CHAT_LEFT:
      delete model.chatSessions[event.id];
      break;
    case OUTGOING_CHAT_MESSAGE_POSTED:
    case INCOMING_CHAT_MESSAGE_POSTED:
    case CHAT_STATUS_POSTED:
      loadChatLog(event.rawEvent.streamId, [event.rawEvent], model, true);
      break;
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
        model.tasks[index] = Object.assign({}, model.tasks[index], event.task);
      }
      if (model.selectedTask && model.selectedTask.taskId === event.task.taskId) {
        model.selectedTask = Object.assign({}, model.selectedTask, event.task);
      }
      loadChatLog(event.task.chatId, event.task.chatLog, model);
      break;
    case TASK_SELECTED:
      model.selectedTask = event.taskId;
      break;
    case WORKER_AVAILABILITY_UPDATED:
      if(model.user) {
        model.user.availability = event;
      }
      break;
  }
  return model;
};

const loadChatLog = (chatId, chatLog, model, append) => {
  if (!chatId || !chatLog) {
    return;
  }
  model.chatSessions[chatId] = model.chatSessions[chatId] || {};
  const session = model.chatSessions[chatId];
  const chatLogToMessage = (chatLog) => {
    if (chatLog.name === 'ChatStatusPostedEvent') {
      return {
        messageId: chatLog.messageId,
        messageType: 'status',
        text: chatLog.text
      }
    } else if (/^ChatParticipant(Joined|Left)Event$/.test(chatLog.name)) {
      const eventType = /^ChatParticipant(Joined|Left)Event$/.exec(chatLog.name)[1];
      return {
        messageId: `${chatLog.name}-${chatLog.timestamp}-${chatLog.participant.sessionId}`,
        messageType: 'update',
        eventType: eventType,
        participant: chatLog.participant
      }
    } else if (chatLog.name === 'ChatParticipantModifiedEvent') {
      return {
        messageId: `${chatLog.name}-${chatLog.timestamp}-${chatLog.fromParticipant.sessionId}`,
        messageType: 'update',
        eventType: chatLog.name,
        fromParticipant: chatLog.fromParticipant,
        toParticipant: chatLog.toParticipant
      }
    } else if (chatLog.name === 'ChatParticipantVerificationEvent') {
      return {
        messageId: `${chatLog.name}-${chatLog.timestamp}-${chatLog.participantSessionId}`,
        messageType: 'update',
        eventType: `${chatLog.name}-${chatLog.state}`,
        participantHandle: chatLog.participantHandle,
        participantSessionId: chatLog.participantSessionId
      }
    } else if (chatLog.name === 'ChatMessagePostedEvent' && chatLog.hidden === false) {
      let from = chatLog.fromParticipant.handle;
      if (session.customer && chatLog.fromParticipant.sessionId === session.customer.sessionId) {
        from = session.customer.handle;
      }
      return {
        messageId: chatLog.messageId,
        direction: ['customer', 'visitor'].indexOf(chatLog.fromParticipant.role) > -1 ? 'incoming' : 'outgoing',
        from: from,
        text: chatLog.text
      }
    }
  };
  const chatLogMessages = chatLog ? chatLog.map(chatLogToMessage).filter(msg => msg) : [];
  let messages = session.messages || [];
  if (append) {
    chatLogMessages.forEach(chatLogMessage => {
      if (messages.findIndex((msg) => {
          return msg.messageId === chatLogMessage.messageId;
        }) === -1) {
        messages.push(chatLogMessage);
      }
    });
  } else {
    messages = chatLogMessages;
    if (session && session.messages) {
      session.messages.forEach((msg) => {
        if (chatLogMessages.findIndex((logMsg) => {
            return logMsg.messageId === msg.messageId;
          }) === -1) {
          chatLogMessages.push(msg);
        }
      });
    }
  }
  messages.forEach(msg => {
    if (msg.messageType === 'update') {
      if (msg.eventType === 'Joined') {
        if (msg.participant && ['customer', 'visitor'].indexOf(msg.participant.role) > -1) {
          session.customer = msg.participant;
        } else {
          session.active = true;
        }
      }
      if (msg.eventType === 'ChatParticipantModifiedEvent') {
        if (session.customer && session.customer.sessionId === msg.fromParticipant.sessionId) {
          if (msg.toParticipant.handle.indexOf('+') < 0) {
            session.customer.handle = msg.toParticipant.handle;
            session.customer.role = msg.toParticipant.role;
          }
        }
      }
    }
  });
  messages.forEach(msg => {
    if (msg.eventType === 'ChatParticipantVerificationEvent-succeeded') {
      if (session.customer && session.customer.sessionId === msg.participantSessionId) {
        session.customer.handle = msg.participantHandle;
        session.customer.verified = true;
      }
    }
  });
  session.messages = messages.filter(msg => msg.text && msg.text !== '');
};

let rendering = false;
let latestModel = model();
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
      latestModel.queryParams = queryParams();
      const updateModel = (event) => {
        latestModel = update(event, JSON.parse(JSON.stringify(latestModel)));
      };
      while (pendingEvents.length > 0) {
        updateModel(pendingEvents.pop());
      }
      updateModel(event);
      render(<Container model={ latestModel }/>, element, () => {
        resolve(latestModel);
        if (latestModel.device.isMobile) {
          resetScrollVirtualKeyboard();
        }
        rendering = false;
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
      dispatch({
        type: RESIZED,
        height: window.innerHeight
      });
    }, true);

  preventZoom();

  page('/', () => {
    window.dispatch({
      type: NAVIGATE
    });
  });

  page('/verify/:verificationRequestId', (ctx) => {
    window.dispatch({
      type: LOAD_IDENTITY_VERIFICATION_REQUEST,
      verificationRequestId: ctx.params.verificationRequestId
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
