import { Component } from 'react';
import PropTypes from 'prop-types';
import ChatDialogBox from './../component/chat_dialog_box';
import { POST_OUTGOING_CHAT_MESSAGE } from '../constants';

export class TaskDetail extends Component {
  constructor(props) {
    super(props);
  }

  postMessage(chatId, message) {
    dispatch({
      type: POST_OUTGOING_CHAT_MESSAGE,
      id: chatId,
      text: message
    });
  }

  render() {
    const selectedTask = this.props.task;
    const notAssigned = selectedTask.status !== 'assigned';
    const prepareChatMessages = (task) => {
      return this.props.chatSessions[task.chatId].messages;
    };
    return <div className="panel panel-default">
      <div className="panel-heading">
        <a href="/agent" className="close">
          <span>&times;</span>
        </a>
        <h3 className="panel-title">{ selectedTask.channel || 'Unknown' }</h3>
      </div>
      <div className="panel-body">
        { selectedTask.channel === 'chat' ?
          <ChatDialogBox readonly={notAssigned}
                         height={ this.props.height }
                         messages={ prepareChatMessages(selectedTask) }
                         onChatMessageSubmitted={(message) => this.postMessage(selectedTask.chatId, message)}/>
          : null }
        { selectedTask.channel === 'voice' ?
          <div>
            <div>Call from { selectedTask.from }&nbsp;({ selectedTask.callStatus })</div>
          </div>
          : null }
      </div>
    </div>;
  }
}

TaskDetail.propTypes = {
  task: PropTypes.object.isRequired,
  chatSessions: PropTypes.object.isRequired,
  height: PropTypes.number
};

export default TaskDetail;
