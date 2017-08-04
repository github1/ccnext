module.exports = (eventBus, chatService) => {

  const fulfilled = [];

  eventBus.subscribe((event) => {
    if (event.name === 'ChatReadyForFulfillmentEvent') {
      // implement fulfillment logic here
      chatService.postMessage(
        event.stream,
        event.payload.queue,
        `${event.payload.payload.intentName} fulfilled!`);
      chatService.endChat(event.stream);
    }
  });

};
