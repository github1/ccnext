import { Component } from 'react';

export default class extends Component {
  componentDidMount() {
    window.setTimeout(()=> {
      window.scrollTo(0, 0);
    }, 0);
  }

  render() {
    return <div>agent</div>
  }
}
