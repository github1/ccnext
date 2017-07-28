import { Component } from 'react';
import { Alert } from 'react-bootstrap';
import { findDOMNode } from 'react-dom';
import { SIGN_IN } from '../constants';

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
              {this.props.model.messages['invalid_credentials'].text}
            </Alert> : null
        }
        <div className={ this.formGroupStyle('username') }>
          <label htmlFor="username">Username</label>
          <input ref='username'
                 className="form-control"
                 name="username"
                 autoComplete="off"
                 onKeyPress={
                                    (event) => {
                                        if(event.key === 'Enter') {
                                            this.submitCredentials();
                                        }
                                    }}
          />
          <p
            className="help-block text-danger small">{ this.formGroupHelp('username') }</p>
        </div>
        <div className={ this.formGroupStyle('password') }>
          <label htmlFor="password">Password</label>
          <input ref='password' type="password"
                 className="form-control"
                 name="password"
                 onKeyPress={
                                    (event) => {
                                        if(event.key === 'Enter') {
                                            this.submitCredentials();
                                        }
                                    }}
          />
          <p
            className="help-block text-danger small">{ this.formGroupHelp('password') }</p>
        </div>
        <section className="form-group">
          <a className="btn btn-secondary" href="javascript:void(0);"
             onClick={
                                () => {
                                    this.register();
                                }
                            }>Register
          </a>
          <button type="button" className="btn btn-primary"
                  onClick={
                                () => {
                                    this.submitCredentials();
                                }
                            }>Sign in
          </button>
        </section>
      </form>
    </div>
  }
}
