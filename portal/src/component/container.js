import { Component, createElement } from 'react';
import views from '../view';

export default class extends Component {
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
            className="menu clearfix">
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
