import { Component } from 'react';
import Card from '../component/card';
import CardDetail from '../component/card_detail';

export default class extends Component {
  componentDidMount() {
    window.setTimeout(()=> {
      window.scrollTo(0, 0);
    }, 0);
  }

  render() {
    const name = this.props.model.user ? this.props.model.user.firstName : '';
    return <div>
      <h4 className="account-welcome">Welcome { name }</h4>
      <hr/>
      <div className="account-body">
        <div className="account-left hidden-xs">
          <Card/>
        </div>
        <div className="account-content">
          <CardDetail/>
        </div>
      </div>
    </div>;
  }
}
