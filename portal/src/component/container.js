import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import { SIGN_OUT } from '../constants';
import views from '../view';

export default class extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {

    let title = '';
    let menuVisible = false;

    const viewName = this.props.model.view || 'empty';
    const view = views[viewName];

    return <div key="root-container">
      {
        menuVisible ?
          <div
            className={[this.props.model.theme.menu,'clearfix'].join(' ')}>
            {this.props.model.user.friendlyName}
          </div> : null
      }
      <div className="container-fluid">
        <div className="row">
          <div className="col-xs-12">
            <div className="panel">
              <h3>{ title }</h3>
            </div>
            {
              Object.keys(this.props.model.messages).map(key => {
                const msg = this.props.model.messages[key];
                return <div key={key}
                            className={ `alert alert-${msg.type}` }>{msg.text}</div>;
              })
            }
            { React.createElement(view, {
              key: 'view',
              model: this.props.model
            }) }
          </div>
        </div>
      </div>
    </div>
  }
}
