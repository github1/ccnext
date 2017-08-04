import { Component } from 'react';
import { START_CHAT, END_CHAT, POST_OUTGOING_CHAT_MESSAGE } from '../constants';
import ChatWindow from './chat_window';
import uuid from 'uuid';

export default class extends Component {
  constructor(props) {
    super(props);
    this.state = {
      id: uuid.v4()
    }
  }

  startChat() {
    dispatch({
      type: START_CHAT,
      id: this.state.id
    });
  }

  endChat() {
    const currentId = this.state.id;
    this.setState({
      id: uuid.v4()
    }, () => {
      dispatch({
        type: END_CHAT,
        id: currentId
      });
    });
  }

  postMessage(message) {
    dispatch({
      type: POST_OUTGOING_CHAT_MESSAGE,
      id: this.state.id,
      text: message
    });
  }

  render() {
    const chatSessions = this.props.model.chatSessions || {};
    const chatSession = chatSessions[this.state.id];
    return <div>
      <ChatWindow session={chatSession}
                  onStartChatPressed={() => this.startChat()}
                  onCancelChatPressed={() => this.endChat()}
                  onChatMessageSubmitted={(message) => this.postMessage(message)}/>
    </div>
  }
}
