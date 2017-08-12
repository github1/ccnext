/**
 * Creates or updates a twilio resource.
 *
 * @param objectType
 * @param search
 * @param resource
 * @returns {any}
 */
export const create = (objectType, search, resource) => {
  return objectType.list(search).then((objects) => {
    if (objects.length === 0) {
      return objectType.create.bind(objectType)(resource);
    } else {
      return objects[0].update.bind(objects[0])(resource);
    }
  });
};

export const createTask = (twilioClient, workspaceSid, workflowSid, data) => {
  return twilioClient.taskrouter.v1.workspaces(workspaceSid).tasks.create({
    workflowSid: workflowSid,
    taskChannel: data.channel === 'chat' ? 'chat' : 'default',
    attributes: JSON.stringify(data)
  });
};

export const updateTask = (twilioClient, workspaceSid, taskSid, data) => {
  return twilioClient.taskrouter.v1.workspaces(workspaceSid).tasks(taskSid).update(data);
};

export const configureIncomingNumber = (twilioClient, phoneNumberSid, voiceUrl, smsUrl) => {
  return twilioClient
    .incomingPhoneNumbers(phoneNumberSid)
    .update({
      voiceUrl: voiceUrl,
      voiceMethod: 'POST',
      smsUrl: smsUrl,
      smsMethod: 'POST'
    });
};

export const configureTaskRouter = (twilioClient, workspaceName, baseUrl) => {
  const taskEventCallbackUrl = `${baseUrl}/tasks/callback`;
  const taskAssignmentCallbackUrl = `${baseUrl}/tasks/assignment`;
  const taskQueueName = `${workspaceName}-taskqueue`;
  const workflowName = `${workspaceName}-workflow`;
  const config = {
    workspaces: {},
    workflows: {},
    activities: {},
    taskqueues: {},
    workers: {},
    taskchannels: {}
  };
  return create(
    twilioClient.taskrouter.workspaces,
    {friendlyName: workspaceName}, {
      friendlyName: workspaceName,
      eventCallbackUrl: taskEventCallbackUrl
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
      return create(workspace.taskQueues(), {friendlyName: taskQueueName}, {
        friendlyName: taskQueueName,
        targetWorkers: '1==1',
        reservationActivitySid: config.activities['Reserved'].sid,
        assignmentActivitySid: config.activities['Busy'].sid
      }).then((taskqueue) => {
        config.taskqueues[taskqueue.friendlyName] = taskqueue;
        return workspace;
      });
    })
    .then((workspace) => {
      return create(workspace.workflows(), {friendlyName: workflowName}, {
        friendlyName: workflowName,
        assignmentCallbackUrl: taskAssignmentCallbackUrl,
        taskReservationTimeout: 300,
        configuration: JSON.stringify({
          "task_routing": {
            "filters": [],
            "default_filter": {
              "queue": config.taskqueues[taskQueueName].sid
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
