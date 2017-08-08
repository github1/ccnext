import { Component } from 'react';

export default class extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    //return <img src="/logo.svg" className={ `logo ${this.props.className || ''}` }/>;
    return <div className={ `logo ${this.props.className || ''}` }>DemoBank</div>;
  }
}
