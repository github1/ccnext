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
  render() {
    const chatSessions = this.props.model.chatSessions || {};
    const chatSession = chatSessions[this.state.id];
    return <div>
      <ChatWindow session={chatSession}
                  onStartChatPressed={() => {
        dispatch({
          type: START_CHAT,
          id: this.state.id
        });
      }}
                  onCancelChatPressed={() => {
        dispatch({
          type: END_CHAT,
          id: this.state.id
        });
      }}
                  onChatMessageSubmitted={(message) => {
        dispatch({
          type: POST_OUTGOING_CHAT_MESSAGE,
          id: this.state.id,
          text: message
        });
      }}/>
    </div>
  }
}
