import { Component } from 'react';
import Login from './login';

export default class extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <div>
      <div className="home-body">
        <div className="home-content">
          <div className="ad">
            <h3>Make your everyday experiences more rewarding.</h3>
            <h5>Earn unlimited cash back on every purchase, everywhere.</h5>
            <button type="button" className="btn btn-primary">See Cash Back
              Cards
            </button>
          </div>
        </div>
        <div className="home-mid">
          <div className="login panel panel-special">
            <div className="panel-heading">
              <h3 className="panel-title">Sign In</h3>
            </div>
            <div className="panel-body">
              <Login model={this.props.model}/>
            </div>
          </div>
        </div>
      </div>
    </div>;
  }
}
