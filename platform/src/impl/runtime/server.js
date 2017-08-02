const express = require('express');
const bodyParser = require('body-parser');

export default (port, opts) => {
  opts = opts || {};
  opts.integrations = opts.integrations || {};
  const app = express();
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());
  Object
    .keys(opts.integrations)
    .forEach(id => {
      console.log(`Pre-configuring ${id}`);
      opts.integrations[id].preConfigure(app);
    });
  app.listen(port, () => {
    Promise.all(Object
      .keys(opts.integrations)
      .filter(id => opts.integrations[id].postConfigure)
      .map(id => {
        console.log(`Post-configuring ${id}`);
        return opts.integrations[id].postConfigure();
      })
      .filter(onStart => typeof onStart !== 'undefined')
      .map(onStart => typeof onStart.then === 'function'
        ? onStart
        : Promise.resolve(onStart())))
      .then(() => {
        console.log(`Listening on port ${port}`);
      });
  });
}



