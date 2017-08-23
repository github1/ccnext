import { Component } from 'react';
import LoginForm from '../component/login_form';
import { SIGN_IN, NAVIGATE } from '../constants';

export default class extends Component {

  register() {
    dispatch({
      type: NAVIGATE,
      redirect: '/enroll'
    });
  }

  submitCredentials(data) {

    dispatch({
      type: SIGN_IN,
      username: data.username,
      password: data.password
    });

  }

  render() {
    return <LoginForm onSignIn={ (data) => { this.submitCredentials(data);} }
                      onEnroll={ () => { this.register(); } }
                      messages={ this.props.model.messages }/>
  }
}
