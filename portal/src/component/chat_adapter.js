import { Component } from 'react';
import { START_CHAT, END_CHAT, POST_OUTGOING_CHAT_MESSAGE } from '../constants';
import ChatWindow from './chat_window';
import uuid from 'uuid';

export default class extends Component {
  constructor(props) {
    super(props);
    this.state = {
      componentInstanceId: uuid.v4()
    }
  }

  getChatId() {
    const results = Object.keys(this.props.model.chatSessions)
      .map(key => this.props.model.chatSessions[key])
      .filter(chatSession => {
        return chatSession.componentInstanceIds.indexOf(this.state.componentInstanceId) > -1
      });
    return results.length > 0 ? results[0].id : '';
  }

  startChat() {
    dispatch({
      type: START_CHAT,
      componentInstanceId: this.state.componentInstanceId
    });
  }

  onChatInputBlur() {
    if (this.props.model.device.isMobile) {
      this.endChat();
      window.scrollTo(0, 0);
    }
  }

  endChat() {
    dispatch({
      type: END_CHAT,
      id: this.getChatId()
    });
  }

  postMessage(message) {
    dispatch({
      type: POST_OUTGOING_CHAT_MESSAGE,
      id: this.getChatId(),
      text: message
    });
  }

  render() {
    const chatSessions = this.props.model.chatSessions || {};
    const chatSession = chatSessions[this.getChatId()];
    return <div className="customer-chat">
      <ChatWindow session={chatSession}
                  onChatInputBlur={() => this.onChatInputBlur()}
                  onStartChatPressed={() => this.startChat()}
                  onCancelChatPressed={() => this.endChat()}
                  onChatMessageSubmitted={(message) => this.postMessage(message)}/>
    </div>
  }
}
