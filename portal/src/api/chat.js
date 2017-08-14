import ajax from './ajax';
import { unsubscribe } from './events';

export const getChatLog = (chatId) => {
  return ajax({
    url: `/api/chat/${chatId}`,
    method: 'get'
  });
};

export const startChat = (chatId, fromParticipant) => {
  return ajax({
    url: `/api/chat/${chatId}`,
    method: 'post',
    data: {
      fromParticipant: fromParticipant
    }
  });
};

export const leaveChat = (chatId, participant) => {
  return ajax({
    url: `/api/chat/${chatId}/participant/${participant}`,
    method: 'delete'
  }).then(() => {
    return unsubscribe(chatId);
  });
};

export const postChatMessage = (chatId, fromParticipant, text) => {
  return ajax({
    url: `/api/chat/${chatId}`,
    method: 'post',
    data: {
      fromParticipant: fromParticipant,
      text: text
    }
  });
};
