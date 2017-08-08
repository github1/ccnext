module.exports = (eventBus, chatService) => {

  eventBus.subscribe((event) => {
    if (event.name === 'ChatReadyForFulfillmentEvent') {
      // implement real fulfillment logic here
      chatService.postMessage(
        event.stream,
        event.payload.queue,
        `${event.payload.payload.intentName} fulfilled!`);
      chatService.endChat(event.stream);
    }
  });

};
