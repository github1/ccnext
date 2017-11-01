import { Component } from 'react';
import { ACCEPT_INCOMING_CONTACT, HANGUP_INCOMING_CONTACT } from '../constants';

class Softphone extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  acceptCall(callId) {
    dispatch({
      type: ACCEPT_INCOMING_CONTACT,
      callId: callId
    });
  }

  hangupCall() {
    dispatch({
      type: HANGUP_INCOMING_CONTACT
    });
  }

  render() {
    return <div className="softphone">
      {
      (this.props.contacts || []).map(call => {
        if(call.state === 'accepted') {
          return <button className="btn btn-primary" key={call.id} onClick={() => {
            this.hangupCall();
          }}>Hang up</button>;
        } else {
          return <button className="btn btn-primary" key={call.id} onClick={() => {
            this.acceptCall(call.id);
          }}>Answer</button>;
        }
      })
    }</div>;
  }
}

export default Softphone;

