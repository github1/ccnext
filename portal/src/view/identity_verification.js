import { Component } from 'react';
import LoginForm from './../component/login_form';
import MemorableWordForm from './../component/memorable_word_form';
import Logo from './../component/logo';
import { SIGN_IN, CANCEL_IDENTITY_VERIFICATION} from './../constants';

export default class extends Component {

  render() {
    let content = <div>
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
    </div>;
    if (this.props.model.user && this.props.model.user.role === 'customer') {
      const memorableWordPositionsRequested = [0,1];
      content = <div>
        <MemorableWordForm requestedPositions={memorableWordPositionsRequested}
                           messages={ this.props.model.messages }
                           onSignIn={(data)=>{
            dispatch({
              type: SIGN_IN,
              isVerification: true,
              sessionId: this.props.model.identityVerificationRequired.identitySessionId,
              username: this.props.model.user.username,
              memorableWordPositionsRequested: memorableWordPositionsRequested.join(','),
              memorableWordChars: data.memorableWordChars.join(',')
            });
          }} onCancel={()=>{
            dispatch({
              type: CANCEL_IDENTITY_VERIFICATION
            });
          }}/>
      </div>
    }
    return <div className="container-fluid">
      <div className="row">
        <Logo className="small"/>
        <br/>
        <hr/>
        <div className="col-sm-3 hidden-xs"></div>
        <div className="col-sm-6 col-xs-12">
          { content }
        </div>
        <div className="col-sm-3 hidden-xs"></div>
      </div>
    </div>
  }
}

