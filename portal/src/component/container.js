import { Component, createElement } from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import views from '../view';
import { SIGN_OUT } from '../constants';

export default class extends Component {
  constructor(props) {
    super(props);
  }

  render() {

    const viewName = this.props.model.view || 'empty';
    const view = views[viewName];
    const title = viewName.substring(0,1).toUpperCase() + viewName.substring(1);

    return <div key="root-container">
      {
        this.props.model.user ?
          <div
            className="menu clearfix">
            <DropdownButton
              title={ this.props.model.user.username }
              id="user-dd"
              bsSize="small"
              onSelect={ eventKey => {
                                    switch(eventKey) {
                                        case "signOut":
                                            dispatch({
                                                type: SIGN_OUT
                                            });
                                        break;
                                    }
                                } }>
              <MenuItem eventKey="signOut">Sign out</MenuItem>
            </DropdownButton>
          </div> : null
      }
      <div className="container-fluid">
        <div className="row">
          <div className="col-xs-12">
            <div>
              <h3>{ title }</h3>
              <hr/>
            </div>
            {
              Object.keys(this.props.model.messages)
                .map(key => this.props.model.messages[key])
                .filter(alert => alert.global)
                .map((alert, index) => {
                  return <div key={index}
                              className={ `alert alert-${alert.type}` }>{alert.text}</div>;
                })
            }
            { createElement(view, {
              key: 'view',
              model: this.props.model
            }) }
          </div>
        </div>
      </div>
    </div>
  }
}
