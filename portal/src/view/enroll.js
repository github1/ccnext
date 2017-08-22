import { Component } from 'react';
import { findDOMNode } from 'react-dom';
import InternationalPhoneCodes  from './../component/intl_phone_codes';
import SelectBox from './../component/select_box';
import { REGISTER_USER, NAVIGATE } from '../constants';

export default class extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errors: {}
    }
  }

  componentDidMount() {
    if(!this.props.model.device.isMobile) {
      findDOMNode(this.refs['firstName']).focus();
    }
  }

  cancel() {
    dispatch({
      type: NAVIGATE,
      redirect: '/home'
    });
  }


  register() {
    const firstName = findDOMNode(this.refs['firstName']).value;
    const lastName = findDOMNode(this.refs['lastName']).value;
    const dialCode = this.refs['countryCode'].dialCode();
    const phoneNumber = findDOMNode(this.refs['phoneNumber']).value;
    const username = findDOMNode(this.refs['username']).value;
    const password = findDOMNode(this.refs['password']).value;
    const role = findDOMNode(this.refs['role']).value;
    const memorableWord = findDOMNode(this.refs['memorableWord']).value;

    const errors = {};
    if (firstName.trim().length === 0) {
      errors['firstName'] = 'Required';
    }
    if (lastName.trim().length === 0) {
      errors['lastName'] = 'Required';
    }
    if (phoneNumber.trim().length === 0) {
      errors['phoneNumber'] = 'Required';
    }
    if (username.trim().length === 0) {
      errors['username'] = 'Required';
    }
    if (password.trim().length === 0) {
      errors['password'] = 'Required';
    }
    if(memorableWord.trim().length === 0) {
      errors['memorableWord'] = 'Required';
    } else if (memorableWord.trim().length < 8) {
      errors['memorableWord'] = 'Minimum length 8 characters';
    }

    const fullPhoneNumber = dialCode + (phoneNumber.replace(/[^0-9]+/ig, ''));

    this.setState({
      errors: errors
    }, () => {
      if (Object.keys(errors).length === 0) {
        dispatch({
          type: REGISTER_USER,
          firstName: firstName,
          lastName: lastName,
          phoneNumber: fullPhoneNumber,
          username: username,
          password: password,
          role: role
        });
      }
    });
  }

  formGroupStyle(id) {
    return ['form-group', this.state.errors[id] ? 'has-error' : ''].join(' ');
  }

  render() {
    return <div className="panel panel-default registration-form form">
      <div className="panel-heading">
        <h3 className="panel-title">Enroll</h3>
      </div>
      <div className="panel-body">
        <form>
          <div className={ this.formGroupStyle('firstName') }>
            <input ref='firstName'
                   type="text"
                   placeholder="First name"
                   className="form-control"
                   name="firstName"
                   autoComplete="off"
                   onKeyPress={
                                    (event) => {
                                        if(event.key === 'Enter') {
                                            this.register();
                                        }
                                    }}
            />
          </div>
          <div className={ this.formGroupStyle('lastName') }>
            <input ref='lastName'
                   type="text"
                   placeholder="Last name"
                   className="form-control"
                   name="lastName"
                   autoComplete="off"
                   onKeyPress={
                                    (event) => {
                                        if(event.key === 'Enter') {
                                            this.register();
                                        }
                                    }}
            />
          </div>
          <div className={ this.formGroupStyle('country') }>
            <InternationalPhoneCodes ref='countryCode'/>
          </div>
          <div className={ this.formGroupStyle('phoneNumber') }>
            <input ref='phoneNumber'
                   type="tel"
                   placeholder="Phone number"
                   className="form-control"
                   name="phoneNumber"
                   autoComplete="off"
                   onKeyPress={
                                    (event) => {
                                        if(event.key === 'Enter') {
                                            this.register();
                                        }
                                    }}
            />
          </div>
          <div className={ this.formGroupStyle('username') }>
            <input ref='username'
                   type="text"
                   placeholder="Username"
                   className="form-control"
                   name="username"
                   autoComplete="off"
                   autoCorrect="off"
                   autoCapitalize="none"
                   onKeyPress={
                                    (event) => {
                                        if(event.key === 'Enter') {
                                            this.register();
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
                                            this.register();
                                        }
                                    }}
            />
          </div>
          <div className={ this.formGroupStyle('memorableWord') }>
            <input ref='memorableWord'
                   type="text"
                   placeholder="Memorable word (minimum 8 characters)"
                   className="form-control"
                   name="memorableWord"
                   autoComplete="off"
                   autoCorrect="off"
                   autoCapitalize="none"
                   onKeyPress={
                                    (event) => {
                                        if(event.key === 'Enter') {
                                            this.register();
                                        }
                                    }}
            />
          </div>
          <div className="form-group">
            <SelectBox ref='role' opts={
              [{ label: 'Customer', value: 'customer' },
               { label: 'Agent', value: 'agent'}]
            }/>
          </div>
          <section className="form-group">
            <a className="btn btn-secondary" href="javascript:void(0);"
               onClick={
                                () => {
                                    this.cancel();
                                }
                            }>Cancel
            </a>
            <button type="button" className="btn btn-primary"
                    onClick={
                                () => {
                                    this.register();
                                }
                            }>Submit
            </button>
          </section>
        </form>
      </div>
    </div>
  }
}
