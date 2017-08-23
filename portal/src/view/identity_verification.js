import { Component } from 'react';
import LoginForm from './../component/login_form';
import Logo from './../component/logo';
import { SIGN_IN, CANCEL_IDENTITY_VERIFICATION} from './../constants';

export default class extends Component {

  render() {
    return <div className="identity-verification-modal">
      <Logo className="small"/>
      <div className="identity-verification-modal-body">
        { this.props.model.identityVerificationRequired ? <div>
          <p>Please sign in in order to verify your identity.</p>
          <LoginForm
            messages={ this.props.model.messages }
            onSignIn={(data)=>{
            dispatch({
              type: SIGN_IN,
              isVerification: true,
              username: data.username,
              password: data.password
            });
          }} onCancel={()=>{
            dispatch({
              type: CANCEL_IDENTITY_VERIFICATION
            });
          }}/>
        </div> : null }
      </div>
    </div>
  }
}

