import { Component } from 'react';
import Logo from './logo';

export default class extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <div
      className={ ['nav-menu', this.props.className || ''].join(' ') }>
      <ul className="nav nav-pills">
        {
          this.props.logo ? <li role="presentation"><Logo
            className="small"/>
          </li> : null
        }
        {
          (this.props.links || []).map((link, index) => {
            if (link.icon) {
              return <li role="presentation" className="hidden-xs" key={index}>
                <a
                  href="#">
                <span
                  className={`glyphicon glyphicon-${link.icon}`}/>&nbsp;{ link.text }
                </a>
              </li>;
            }
            return <li role="presentation" className="hidden-xs" key={index}><a
              href="#">{ link.text }</a>
            </li>
          })
        }
      </ul>
    </div>
  }
}
