import { Component } from 'react';

export default class extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <div className={ `logo ${this.props.className || ''}` }>DemoBank</div>;
  }
}
