import { Component } from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'react-bootstrap';
import { findDOMNode } from 'react-dom';

class LoginForm extends Component {
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
    if(this.props.onEnroll) {
      this.props.onEnroll();
    }
  }

  cancel() {
    if(this.props.onCancel) {
      this.props.onCancel();
    }
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
        this.props.onSignIn({
          username: username,
          password: password
        });
      }
    });

  }

  formGroupStyle(id) {
    return ['form-group', this.state.errors[id] ? 'has-error' : ''].join(' ');
  }

  render() {
    const messages = this.props.messages || [];
    return <div className="form">
      <form>
        {
          messages['invalid_credentials'] ?
            <Alert
              bsStyle={messages['invalid_credentials'].type}>
              <span className="glyphicon glyphicon-alert"/>&nbsp;
              {messages['invalid_credentials'].text}
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
          { this.props.onEnroll ? <a className="btn btn-secondary" href="javascript:void(0);"
             onClick={
                                () => {
                                    this.register();
                                }
                            }>Enroll
          </a> : null }
          { this.props.onCancel ? <a className="btn btn-secondary" href="javascript:void(0);"
                                     onClick={
                                () => {
                                    this.cancel();
                                }
                            }>Cancel
          </a> : null }
          <button type="button" className="btn btn-primary"
                  onClick={
                                () => {
                                    this.submitCredentials();
                                }
                            }><span className="glyphicon glyphicon-lock"/>&nbsp;Sign In
          </button>
        </section>
      </form>
    </div>
  }
}

LoginForm.propTypes = {
  onSignIn: PropTypes.func.isRequired,
  onEnroll: PropTypes.func,
  onCancel: PropTypes.func,
  messages: PropTypes.array
};

export default LoginForm;
