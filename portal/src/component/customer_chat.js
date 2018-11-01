import { Component } from 'react';
import { JOIN_CHAT, LEAVE_CHAT, POST_OUTGOING_CHAT_MESSAGE } from '../constants';
import ChatNowButton from './chat_now_button';
import ChatDialogBox from './chat_dialog_box';

export default class extends Component {
  constructor(props) {
    super(props);
    this.state = {
      componentInstanceId: 'customer-chat'
    }
  }

  getChatId() {
    let results = Object.keys(this.props.model.chatSessions)
      .map(key => this.props.model.chatSessions[key])
      .filter(chatSession => {
        return chatSession.componentInstanceIds && chatSession.componentInstanceIds.indexOf(this.state.componentInstanceId) > -1
      });
    if (results.length > 0) {
      return results[0].id;
    } else {
      results = Object.keys(this.props.model.chatSessions)
        .map(key => this.props.model.chatSessions[key]);
      return results.length > 0 ? results[0].id : '';
    }
  }

  startChat() {
    dispatch({
      type: JOIN_CHAT,
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
      type: LEAVE_CHAT,
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
      <div className="chat">
        { chatSession == null ?
          <ChatNowButton
            onClick={ () => this.startChat() }/> :
          <div className="panel panel-special chat-panel">
            <div className="panel-heading">
              <button type="button" className="close"
                      onClick={() => this.endChat()}>
                <span>&times;</span>
              </button>
              <h3 className="panel-title"><span
                className="glyphicon glyphicon-comment"/>&nbsp;Chat</h3>
            </div>
            <div className="panel-body">
              <ChatDialogBox
                messages={chatSession.messages}
                height={ this.props.model.device.screen.height - 84 }
                placeholder="How can we help you?"
                onChatInputBlur={() => this.onChatInputBlur()}
                onChatMessageSubmitted={(message) => this.postMessage(message)}/>
            </div>
          </div>
        }
      </div>
    </div>;
  }
}
