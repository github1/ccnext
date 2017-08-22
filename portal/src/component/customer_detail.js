import { Component } from 'react';
import PropTypes from 'prop-types';

class CustomerDetail extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const values = [{
      label: "User ID",
      value: this.props.username
    }, {
      label: 'Given name',
      value: this.props.firstName
    }, {
      label: "Surname",
      value: this.props.lastName
    }, {
      label: "Phone number",
      value: this.props.phoneNumber
    }].filter((value) => value.value);
    return <div className="tabular-info">
      <table className="table">
        <tbody>
        {
          values.map((value, idx) => {
            return <tr key={idx}>
              <th>{ value.label }</th>
              <td><span>
                  { value.value }</span></td>
            </tr>
          })
        }
        <tr>
          <th>Status</th>
          <td>{
            this.props.isVerified ? <span className="success">Verified
                </span> : <span className="failed">
                    Not verified</span>
          }</td>
        </tr>
        </tbody>
      </table>
      { !this.props.verificationEnabled || this.props.isVerified ? null :
      <a className="btn btn-secondary"
         onClick={
                    () => {
                      if(!this.props.verificationEnabled || this.props.isVerified) {
                        return;
                      }
                      if(this.props.onVerificationClick) {
                        this.props.onVerificationClick();
                      }
                    }
                    }><span className="glyphicon glyphicon-share-alt"/>&nbsp;Request verification</a> }
    </div>
  }
}

CustomerDetail.propTypes = {
  username: PropTypes.string,
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  phoneNumber: PropTypes.string,
  isVerified: PropTypes.bool,
  verificationEnabled: PropTypes.bool,
  onVerificationClick: PropTypes.func
};

export default CustomerDetail;

