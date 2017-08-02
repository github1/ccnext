import { Component } from 'react';
import ChatAdapter from '../component/chat_adapter';

export default class extends Component {
  render() {
    return <div>
      <ChatAdapter model={this.props.model}/>
    </div>
  }
}
