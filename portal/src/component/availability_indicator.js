import { Component } from 'react';

class AvailabilityIndicator extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    const availability = this.props.user.availability || {
        voice: 'offline',
        chat: 'offline'
      };
    return <div className="availability-indicator">
      <span className={ ['glyphicon glyphicon-earphone', availability.voice ].join(' ') }/>
      <span className={ ['glyphicon glyphicon-comment', availability.chat ].join(' ') }/>
    </div>
  }
}

export default AvailabilityIndicator;

