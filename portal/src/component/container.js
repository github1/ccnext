import { Component, createElement } from 'react';
import Dropdown  from './dropdown';
import Logo from './logo';
import NavMenu from './nav_menu';
import CustomerChat from './customer_chat';
import views from '../view';
import { SIGN_OUT, NAVIGATE } from '../constants';

export default class extends Component {
  constructor(props) {
    super(props);
  }

  render() {

    const viewName = this.props.model.identityVerificationRequired ? 'verification' : (this.props.model.view || 'empty');
    const view = views[viewName];

    if (!view) {
      return <div className="col-xs-12 root-column">
        <div className="row">
          <div className="col-xs-12 root-column">
            <Logo className="pull-left" small={true}/>
          </div>
          <div className="col-xs-12 root-column">
            <div className="alert alert-danger">Page not found</div>
          </div>
        </div>
      </div>;
    }

    const content = <div className="col-xs-12 root-column">
      <div className="divider"></div>
      {
        Object.keys(this.props.model.messages)
          .map(key => this.props.model.messages[key])
          .filter(alert => alert.global)
          .map((alert, index) => {
            return <div key={index}
                        className={ `alert global-alert alert-${alert.type}` }>{alert.text}</div>;
          })
      }
      { createElement(view, {
        key: 'view',
        model: this.props.model
      }) }
    </div>;

    const menuLinks = {
      agent: [
        {
          text: 'Tasks', icon: 'check', handler: () => {
          dispatch({
            type: NAVIGATE,
            redirect: '/agent'
          });
        }
        },
        'divider',
        {
          text: 'Sign Out', icon: 'log-out', handler: () => {
          dispatch({
            type: SIGN_OUT
          });
        }
        }
      ],
      customer: [
        {text: 'Accounts', icon: 'credit-card'},
        {text: 'Payments', icon: 'usd'},
        {text: 'Messages & Alerts', icon: 'alert'},
        {text: 'Benefits', icon: 'star'},
        {text: 'Profile', icon: 'user'},
        {text: 'Services', icon: 'cog'},
        'divider',
        {
          text: 'Sign Out', icon: 'log-out', handler: () => {
          dispatch({
            type: SIGN_OUT
          });
        }
        }
      ]
    };

    const notVisitor = this.props.model.user && this.props.model.user.role !== 'visitor';

    const actions = notVisitor ?
      <div
        className="user-menu">
        <Dropdown
          title={  <span className="glyphicon glyphicon-menu-hamburger"/> }
          id="user-menu"
          menuItems={menuLinks[this.props.model.user.role]}/>
      </div> : null;

    if (viewName === 'verification') {
      return content;
    } else if (notVisitor) {
      return <div key="root-container">
        <div className="pull-left">
          <NavMenu className="account-menu" logo={true}/>
        </div>
        { actions }
        { content }
        {
          this.props.model.user.role === 'customer' ?
            <CustomerChat model={this.props.model}/> : null
        }
      </div>;
    } else if (viewName === 'enroll') {
      return <div key="root-container">
        <NavMenu logo={true}/>
        <hr/>
        { content }
        <CustomerChat model={this.props.model}/>
      </div>;
    } else {
      return <div key="root-container">
        <div className="row">
          <div className="col-xs-12 root-column">
            <Logo className="pull-left"/>
            <div className="pull-right hidden-xs">
              <NavMenu links={ [
                { icon: 'search', text: 'Search'},
                { icon: 'globe', text: 'Locations'},
                { icon: 'user', text: 'Sign In'}
              ] }/>
            </div>
          </div>
        </div>
        <div className="hidden-xs">
          <NavMenu className="landing-menu" links={ [
                { text: 'Credit Cards'},
                { text: 'Bank'},
                { text: 'Borrow'},
                { text: 'Invest'},
                { text: 'Learn'},
                { text: 'Contact'}
              ] }/>
        </div>
        <hr/>
        { content }
        <CustomerChat model={this.props.model}/>
      </div>;
    }

  }
}
