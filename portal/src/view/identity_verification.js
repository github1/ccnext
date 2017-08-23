import { Component } from 'react';
import LoginForm from './../component/login_form';
import Logo from './../component/logo';
import { SIGN_IN, CANCEL_IDENTITY_VERIFICATION} from './../constants';

export default class extends Component {

  render() {
    return <div className="container-fluid">
      <div className="row">
        <Logo className="small"/>
        <br/>
        <hr/>
        <div className="col-sm-3 hidden-xs"></div>
        <div className="col-sm-6 col-xs-12">
          <div>
            <p>Please sign in in order to verify your identity.</p>
            <LoginForm
              messages={ this.props.model.messages }
              onSignIn={(data)=>{
            dispatch({
              type: SIGN_IN,
              isVerification: true,
              sessionId: this.props.model.identityVerificationRequired.identitySessionId,
              username: data.username,
              password: data.password
            });
          }} onCancel={()=>{
            dispatch({
              type: CANCEL_IDENTITY_VERIFICATION
            });
          }}/>
          </div>
        </div>
        <div className="col-sm-3 hidden-xs"></div>
      </div>
    </div>
  }
}

