import { Component } from 'react';
import PropTypes from 'prop-types';

class ChatNowButton extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return <button type="button" className="btn btn-info chat-now-btn"
                   onClick={ this.props.onClick }>
      <span className="glyphicon glyphicon-comment" aria-hidden="true"/>
      &nbsp;Chat now
    </button>;
  }
}

ChatNowButton.propTypes = {
  onClick: PropTypes.func.isRequired
};

export default ChatNowButton;

