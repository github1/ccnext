import { Component } from 'react';
import { Alert } from 'react-bootstrap';
import { findDOMNode } from 'react-dom';
import { SIGN_IN, NAVIGATE } from '../constants';

export default class extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errors: {}
    }
  }

  componentDidMount() {
    findDOMNode(this.refs['username']).focus();
  }

  register() {
    dispatch({
      type: NAVIGATE,
      view: 'register',
      redirect: '/enroll'
    });
  }

  submitCredentials() {

    const username = findDOMNode(this.refs['username']).value;
    const password = findDOMNode(this.refs['password']).value;

    const errors = {};
    if (username.trim().length === 0) {
      errors['username'] = 'Required';
    }
    if (password.trim().length === 0) {
      errors['password'] = 'Required';
    }

    this.setState({
      errors: errors
    }, () => {
      if (Object.keys(errors).length === 0) {
        dispatch({
          type: SIGN_IN,
          username: username,
          password: password
        });
      }
    });

  }

  formGroupStyle(id) {
    return ['form-group', this.state.errors[id] ? 'has-error' : ''].join(' ');
  }

  formGroupHelp(id) {
    return this.state.errors[id] ? this.state.errors[id] : '';
  }

  render() {
    return <div className="form">
      <form>
        {
          this.props.model.messages['invalid_credentials'] ?
            <Alert
              bsStyle={this.props.model.messages['invalid_credentials'].type}>
              <span className="glyphicon glyphicon-alert"/>&nbsp;
              {this.props.model.messages['invalid_credentials'].text}
            </Alert> : null
        }
        <div className={ this.formGroupStyle('username') }>
          <input ref='username'
                 type="text"
                 autoComplete="off"
                 autoCorrect="off"
                 autoCapitalize="none"
                 placeholder="Username"
                 className="form-control"
                 name="username"
                 onKeyPress={
                                    (event) => {
                                        if(event.key === 'Enter') {
                                            this.submitCredentials();
                                        }
                                    }}
          />
        </div>
        <div className={ this.formGroupStyle('password') }>
          <input ref='password' type="password"
                 placeholder="Password"
                 className="form-control"
                 name="password"
                 onKeyPress={
                                    (event) => {
                                        if(event.key === 'Enter') {
                                            this.submitCredentials();
                                        }
                                    }}
          />
        </div>
        <section className="form-group pull-right">
          <a className="btn btn-secondary" href="javascript:void(0);"
             onClick={
                                () => {
                                    this.register();
                                }
                            }>Enroll
          </a>
          <button type="button" className="btn btn-primary"
                  onClick={
                                () => {
                                    this.submitCredentials();
                                }
                            }><span className="glyphicon glyphicon-lock"></span>&nbsp;Sign In
          </button>
        </section>
      </form>
    </div>
  }
}
