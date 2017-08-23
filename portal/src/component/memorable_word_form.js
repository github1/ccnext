import { Component } from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'react-bootstrap';
import { findDOMNode } from 'react-dom';

class MemorableWord extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errors: {}
    }
  }

  cancel() {
    if (this.props.onCancel) {
      this.props.onCancel();
    }
  }

  submitCredentials() {

    const errors = {};

    const memorableWordChars = this.props.requestedPositions.map((num) => {
      const inputId = `char${num}`;
      const inputValue = findDOMNode(this.refs[inputId]).value;
      if(inputValue.trim().length === 0) {
        errors[inputId] = 'Required';
      }
      return inputValue;
    });

    this.setState({
      errors: errors
    }, () => {
      if (Object.keys(errors).length === 0) {
        this.props.onSignIn({
          memorableWordChars: memorableWordChars
        });
      }
    });

  }

  ordinalNumberSuffixed(num) {
    const suffixes = ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'];
    return (num % 100) >= 11 && (num % 100) <= 13 ? `${num}th` : `${num}${suffixes[num % 10]}`;
  }

  formGroupStyle(id) {
    return ['form-group', this.state.errors[id] ? 'has-error' : ''].join(' ');
  }

  render() {
    const messages = this.props.messages || [];
    return <div className="form-inline">
      <p>{ `Please enter the ${ this.props.requestedPositions.map((num) => this.ordinalNumberSuffixed(num + 1)).join(' and ') } characters of your memorable word.` }</p>
      <form>
        {
          messages['invalid_credentials'] ?
            <Alert
              bsStyle={messages['invalid_credentials'].type}>
              <span className="glyphicon glyphicon-alert"/>&nbsp;
              {messages['invalid_credentials'].text}
            </Alert> : null
        }
        {
          this.props.requestedPositions.map((num) => {
            return <div key={`char${num}`} className={ this.formGroupStyle(`char${num}`) }>
              <input key={`char${num}`} ref={`char${num}`}
                     type="password"
                     maxLength="1"
                     autoComplete="off"
                     autoCorrect="off"
                     autoCapitalize="none"
                     placeholder={ this.ordinalNumberSuffixed(num + 1) }
                     className="form-control"
                     style={
                      {
                      width: '50px',
                      marginRight: '5px'
                      }
                     }
                     name={`char${num}`}
                     onKeyPress={
                                    (event) => {
                                        if(event.key === 'Enter') {
                                            this.submitCredentials();
                                        }
                                    }}
              />
            </div>
          })
        }
        <br/>
        <section className="form-group pull-right">
          { this.props.onCancel ?
            <a className="btn btn-secondary" href="javascript:void(0);"
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
                            }><span className="glyphicon glyphicon-lock"/>&nbsp;
            Verify
          </button>
        </section>
      </form>
    </div>
  }
}

MemorableWord.propTypes = {
  requestedPositions: PropTypes.array.isRequired,
  onSignIn: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  messages: PropTypes.array
};

export default MemorableWord;
