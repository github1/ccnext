import { Component } from 'react';
import { findDOMNode } from 'react-dom';
import PropTypes from 'prop-types';

class ChatWindow extends Component {
  constructor(props) {
    super(props);
  }

  componentDidUpdate() {
    const input = this.getChatInputDOMNode();
    if (input) {
      input.focus();
    }
    const chatBox = this.getChatBoxDOMNode();
    if(chatBox) {
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }

  submitChatInput() {
    const input = this.getChatInputDOMNode();
    const value = input.value;
    if(value.trim().length > 0) {
      input.value = null;
      this.props.onChatMessageSubmitted(value);
    }
  }

  getChatBoxDOMNode() {
    return findDOMNode(this.refs['conversation-box']);
  }

  getChatInputDOMNode() {
    return findDOMNode(this.refs['chatInput']);
  }

  render() {

    const closedState = <div>
      <button type="button" className="btn btn-primary chat-now-btn"
              onClick={ this.props.onStartChatPressed }>
        <span className="glyphicon glyphicon-comment" aria-hidden="true"></span>
        &nbsp;Chat now
      </button>
    </div>;

    const conversationState = (session) => {
      const messages = session.messages;
      const hasMessages = typeof messages !== 'undefined';
      const placeholder = hasMessages ? "" : "How we can help you?";
      const bubble = (message, index) => {
        return <div key={index}>
          <div className="bubble-wrapper clearfix">
            <div className={`bubble ${message.source}`}>
              <strong>{ message.from }:</strong>
              <p>{ message.text }</p>
            </div>
          </div>
        </div>
      };
      return <div className="conversation-state">
        {
          hasMessages ? <div className="form-group">
            <div ref="conversation-box" className="conversation-box form-control clearfix">
              {
                messages.map((message, index) => bubble(message, index))
              }
              {
                session.holdMessage ? <div className="alert alert-info">{ session.holdMessage }</div> : null
              }
            </div>
          </div> : null
        }
        <div className="form-group">
              <textarea ref="chatInput" className="form-control chat-input"
                        placeholder={placeholder}
                        onKeyPress={(evt) => {
                          if(evt.key === 'Enter') {
                            this.submitChatInput();
                            evt.preventDefault();
                          }
                        }} disabled={ session.hold }/>
        </div>
        <div className="form-group">
          <a href="javascript:void(0);" className="btn btn-secondary pull-right"
             onClick={this.props.onCancelChatPressed}>
            Close
          </a>
          <button type="button" className="btn btn-primary pull-right"
                  onClick={() => this.submitChatInput()}>
            Send
          </button>
        </div>
      </div>;
    };


    let stateView = closedState;
    if (this.props.session != null) {
      stateView = conversationState(this.props.session);
      stateView = <div className="panel panel-default">
        <div className="panel-heading">Chat</div>
        <div className="panel-body">
          { stateView }
        </div>
      </div>;
    }
    return <div className="chat">
      { stateView }
    </div>
  }
}

ChatWindow.propTypes = {
  session: PropTypes.object,
  onCancelChatPressed: PropTypes.func.isRequired,
  onStartChatPressed: PropTypes.func.isRequired,
  onChatMessageSubmitted: PropTypes.func.isRequired
};

export default ChatWindow;
