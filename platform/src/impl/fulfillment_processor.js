module.exports = (eventBus, chatService) => {

  eventBus.subscribe((event) => {
    if (event.name === 'ChatReadyForFulfillmentEvent') {
      // implement real fulfillment logic here
      if(event.payload.payload.intentName === 'Welcome') {
        // example of escalating to agent
        chatService.postMessage(
          event.stream,
          event.payload.queue,
          'I\'m sorry, something went wrong, let me pass you over to a human agent');
        setTimeout(function() {
          // give it time to catch up
          chatService.leaveChat(event.stream, event.payload.queue);
          chatService.transferTo(event.stream, 'agentChatQueue');
        }, 500);
      } else {
        chatService.postMessage(
          event.stream,
          event.payload.queue,
          `${event.payload.payload.intentName} fulfilled!`);
        chatService.endChat(event.stream);
      }

    }
  });

};
