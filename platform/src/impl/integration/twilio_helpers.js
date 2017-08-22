/**
 * Creates a twilio resource if it does not exist.
 *
 * @param objectType
 * @param search
 * @param resource
 * @returns {any}
 */
export const createIfNotExists = (objectType, search, resource) => {
  if(!search || search === null) {
    return objectType.create.bind(objectType)(resource);
  }
  return objectType.list(search).then((objects) => {
    if (objects.length === 0) {
      return objectType.create.bind(objectType)(resource);
    } else {
      //console.log('object already exists in twilio', search, objects[0]);
      return Promise.resolve(objects[0]);
    }
  });
};

/**
 * Creates or updates a twilio resource.
 *
 * @param objectType
 * @param search
 * @param resource
 * @returns {any}
 */
export const upsert = (objectType, search, resource) => {
  return objectType.list(search).then((objects) => {
    if (objects.length === 0) {
      return objectType.create.bind(objectType)(resource);
    } else {
      return objects[0].update.bind(objects[0])(resource);
    }
  });
};

/**
 * Deletes and creates a twilio resource.
 *
 * @param objectType
 * @param search
 * @param resource
 * @returns {any}
 */
export const deletesert = (objectType, search, resource) => {
  return objectType.list(search).then((objects) => {
    if (objects.length === 0) {
      return objectType.create.bind(objectType)(resource);
    } else {
      return objects[0].remove.bind(objects[0])().then(() => {
        return upsert(objectType, search, resource);
      });
    }
  });
};

export const createTaskIfNotExists = (twilioClient, workspaceSid, workflowSid, data) => {
  const search = data['twilioTaskSid'] ? {sid: data['twilioTaskSid']} : null;
  return createIfNotExists(twilioClient.taskrouter.v1.workspaces(workspaceSid).tasks, search, {
    workflowSid: workflowSid,
    taskChannel: data.channel === 'chat' ? 'chat' : 'default',
    attributes: JSON.stringify(data)
  });
};

export const updateTask = (twilioClient, workspaceSid, taskSid, data) => {
  return twilioClient.taskrouter.v1.workspaces(workspaceSid).tasks(taskSid).update(data);
};

export const configureIncomingNumber = (twilioClient, phoneNumberSid, voiceUrl, smsUrl, callStatusUrl) => {
  return twilioClient
    .incomingPhoneNumbers(phoneNumberSid)
    .update({
      voiceUrl: voiceUrl,
      voiceMethod: 'POST',
      smsUrl: smsUrl,
      smsMethod: 'POST',
      statusCallback: callStatusUrl,
      statusCallbackMethod: 'POST'
    });
};

export const configureTaskRouter = (twilioClient, workspaceName, baseUrl) => {
  const taskEventCallbackUrl = `${baseUrl}/tasks/callback`;
  const taskAssignmentCallbackUrl = `${baseUrl}/tasks/assignment`;
  const workflowName = `${workspaceName}-workflow`;
  const taskQueueConfigs = {
    bot: {
      targetWorkers: 'role="bot"'
    },
    human: {
      targetWorkers: 'role="agent"'
    }
  };
  const config = {
    workspaces: {},
    workflows: {},
    activities: {},
    taskqueues: {},
    workers: {},
    taskchannels: {}
  };
  return upsert(
    twilioClient.taskrouter.workspaces,
    {friendlyName: workspaceName}, {
      friendlyName: workspaceName,
      eventCallbackUrl: taskEventCallbackUrl,
      multiTaskEnabled: true
    })
    .then((workspace) => {
      return workspace.activities().list().then((activities) => {
        activities.forEach(activity => {
          config.activities[activity.friendlyName] = activity;
        });
        return workspace;
      });
    })
    .then((workspace) => {
      return workspace.taskChannels().list().then((taskChannels) => {
        taskChannels.forEach(taskChannel => {
          config.taskchannels[taskChannel.friendlyName] = taskChannel;
        });
        return workspace;
      });
    })
    .then((workspace) => {
      return Promise.all(Object.keys(taskQueueConfigs).map((taskQueueName) => {
        return upsert(workspace.taskQueues(), {friendlyName: taskQueueName}, {
          friendlyName: taskQueueName,
          targetWorkers: taskQueueConfigs[taskQueueName].targetWorkers,
          reservationActivitySid: config.activities['Reserved'].sid,
          assignmentActivitySid: config.activities['Busy'].sid
        }).then((taskqueue) => {
          config.taskqueues[taskqueue.friendlyName] = taskqueue;
          return workspace;
        });
      })).then(() => workspace);
    })
    .then((workspace) => {
      if(process.env.DELETE_TWILIO_TASKS) {
        console.log('deleting tasks');
        workspace.tasks().list().then((tasks) => {
          console.log('deleting', tasks);
          tasks.forEach(task => task.remove());
        });
      }
      return workspace;
    })
    .then((workspace) => {
      return upsert(workspace.workflows(), {friendlyName: workflowName}, {
        friendlyName: workflowName,
        assignmentCallbackUrl: taskAssignmentCallbackUrl,
        taskReservationTimeout: 300,
        configuration: JSON.stringify({
          "task_routing": {
            "filters": [{
              "friendly_name": "bot filter",
              "expression": "queue=\"bot\"",
              "targets": [{
                "queue": config.taskqueues['bot'].sid
              }]
            }],
            "default_filter": {
              "queue": config.taskqueues['human'].sid
            }
          }
        }, null, 2)
      }).then((workflow) => {
        config.workflows[workflow.friendlyName] = workflow;
        return workspace;
      });
    })
    .then((workspace) => {
      config.workspaces[workspace.friendlyName] = workspace;
      return config;
    })
    .catch((error) => {
      console.error(error);
    });
};
