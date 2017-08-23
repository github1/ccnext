import ajax from './ajax';

export const getChatLog = (chatId) => {
  return ajax({
    url: `/api/chat/${chatId}`,
    method: 'get'
  });
};

export const startChat = (chatId) => {
  return ajax({
    url: `/api/chat/${chatId}`,
    method: 'post'
  });
};

export const leaveChat = (chatId) => {
  return ajax({
    url: `/api/chat/${chatId}`,
    method: 'delete'
  });
};

export const postChatMessage = (chatId, text) => {
  return ajax({
    url: `/api/chat/${chatId}`,
    method: 'post',
    data: {
      text: text
    }
  });
};
