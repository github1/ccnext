import { Component } from 'react';

export default class extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <div className="selected-card">
      <img src="card.png" width={ this.props.small ? "50" : "160"}/>
    </div>
  }
}
