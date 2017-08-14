import { Component } from 'react';
import { findDOMNode } from 'react-dom';
import PropTypes from 'prop-types';
import $ from 'jquery';

class ChatDialogBox extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.focusInput();
    if (this.props.messages && this.props.messages.length > 0) {
      this.scrollBottom();
    }
  }

  componentDidUpdate() {
    this.focusInput();
  }

  focusInput() {
    const input = this.getChatInputDOMNode();
    if(input) {
      if (this.props.readonly) {
        input.disabled = true;
      } else {
        input.focus();
      }
    }
  }

  componentWillReceiveProps(newProps) {
    if (this.props.messages
      && newProps.messages) {
      if (newProps.messages.length !== this.props.messages.length) {
        this.scrollBottom();
      }
    }
  }

  scrollBottom() {
    const chatBox = this.getChatBoxDOMNode();
    if (chatBox) {
      $(chatBox)
        .animate({scrollTop: ($(chatBox).prop("scrollHeight"))}, 500);
    }
  }

  submitChatInput() {
    if (this.props.onChatMessageSubmitted) {
      const input = this.getChatInputDOMNode();
      if (input) {
        const value = input.value;
        if (value.trim().length > 0) {
          input.value = null;
          this.props.onChatMessageSubmitted(value);
        }
      }
    }
  }

  getChatBoxDOMNode() {
    return findDOMNode(this.refs['conversation-box']);
  }

  getChatInputDOMNode() {
    return findDOMNode(this.refs['chat-input']);
  }

  render() {
    const messages = this.props.messages || [];
    const hasMessages = messages.filter((message) => message.messageType !== 'status').length > 0;
    const placeholder = hasMessages ? "" : this.props.placeholder;
    const style = this.props.height ? {
      height: this.props.height
    } : {};
    const bubble = (message, index) => {
      if (message.messageType === 'status') {
        return <div key={index} className="alert status"><span
          className="glyphicon glyphicon-info-sign"></span>&nbsp;{ message.text }
        </div>
      }
      const from = (message.from + '').replace(/^[^:]+::/, '');
      return <div key={index}>
        <div className="bubble-wrapper clearfix">
          <div className={`bubble ${message.direction}`}>
            <strong>{ from }</strong>
            <p>{ message.text }</p>
          </div>
        </div>
      </div>
    };
    return <div>
      <div className="form-group">
        <div ref="conversation-box"
             className={`conversation-box form-control clearfix ${!hasMessages ? 'hidden' : ''}`}
             style={style}>
          {
            messages.map((message, index) => bubble(message, index))
          }
        </div>
      </div>
      <div className="form-group">
        <input ref="chat-input" className="form-control chat-input"
               placeholder={placeholder}
               onBlur={() => {
                    if(this.props.onChatInputBlur && !this.props.readonly) {
                      this.props.onChatInputBlur();
                    }
                 }}
               onKeyPress={(evt) => {
                          if(evt.key === 'Enter' && !this.props.readonly) {
                            this.submitChatInput();
                            evt.preventDefault();
                          }
                        }} disabled={ this.props.disabled }/>
      </div>
    </div>;
  }
}

ChatDialogBox.propTypes = {
  readonly: PropTypes.bool,
  height: PropTypes.any,
  placeholder: PropTypes.string,
  messages: PropTypes.array,
  disabled: PropTypes.bool,
  onChatInputBlur: PropTypes.func,
  onChatMessageSubmitted: PropTypes.func
};

export default ChatDialogBox;
