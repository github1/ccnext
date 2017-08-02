import { Component } from 'react';
import ChatWindow from '../component/chat_window';

export default class extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  postMessage(source, text) {
    const messages = (this.state.chatSession.messages || []).concat({
      from: source,
      source: source,
      text: text
    });
    const chatSession = Object.assign({}, this.state.chatSession, {
      messages: messages
    });
    this.setState({
      chatSession: chatSession
    }, () => {
      if(this.state.chatSession.messages && this.state.chatSession.messages.length > 3) {
        this.setState({
          chatSession: Object.assign({}, this.state.chatSession, {
            hold: true,
            holdMessage: 'Transferring to live agent'
          })
        });
      }
    });
  };

  render() {
    return <div>
      <ChatWindow session={this.state.chatSession}
                  onStartChatPressed={
                     () => {
                      this.setState({
                        chatSession: {
                          to: 'a'
                        }
                      });
                     }
                  }
                  onCancelChatPressed={
                    () => {
                      this.setState({
                        chatSession: null
                      });
                    }
                  }
                  onChatMessageSubmitted={
                    (message) => {
                      this.postMessage('you', message);
                      setTimeout(function() {
                        this.postMessage('me', 'Sorry, I don\'t understand');
                      }.bind(this), 1000);
                    }
                  }
      />
    </div>;
  }
}
