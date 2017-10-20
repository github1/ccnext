import { Component } from 'react';

class AvailabilityIndicator extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    const availability = this.props.user.availability || {
        voice: false,
        chat: false
      };
    return <div className="availability-indicator">
      <span className={ ['glyphicon glyphicon-earphone', availability.voice ? 'available' : 'offline'].join(' ') }/>
      <span className={ ['glyphicon glyphicon-comment', availability.chat ? 'available' : 'offline'].join(' ') }/>
    </div>
  }
}

export default AvailabilityIndicator;

