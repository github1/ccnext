import { Component } from 'react';
import { INIT_CHAT, START_CHAT, END_CHAT, POST_OUTGOING_CHAT_MESSAGE } from '../constants';
import ChatWindow from './chat_window';
import uuid from 'uuid';

export default class extends Component {
  constructor(props) {
    super(props);
    this.state = {
      id: uuid.v4()
    }
  }

  componentDidMount() {
    dispatch({
      type: INIT_CHAT,
      id: this.state.id
    });
  }

  startChat() {
    dispatch({
      type: START_CHAT,
      id: this.state.id
    });
  }

  onChatInputBlur() {
    if(this.props.model.device.isMobile) {
      this.endChat();
      window.scrollTo(0,0);
    }
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
                  smsNumber="1-484-346-0557"
                  useSms={this.props.model.device.isMobile}
                  onChatInputBlur={() => this.onChatInputBlur()}
                  onStartChatPressed={() => this.startChat()}
                  onCancelChatPressed={() => this.endChat()}
                  onChatMessageSubmitted={(message) => this.postMessage(message)}/>
    </div>
  }
}
