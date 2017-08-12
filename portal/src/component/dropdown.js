import { Component } from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';

const toEventKey = (link) => {
  return (link.text||'').toLowerCase().replace(/[^a-z]+/i, '_');
};

export default class extends Component {
  render() {
    const handlers = (this.props.menuItems||[]).reduce((res, cur) => {
      res[toEventKey(cur)] = cur.handler;
      return res;
    }, {});
    return <DropdownButton
      title={  this.props.title }
      id={ this.props.id }
      pullRight={true}
      bsSize="small"
      onSelect={ eventKey => {
if(handlers[eventKey]) {
 handlers[eventKey]();
}
} }>
      {
        this.props.menuItems.map((link, index) => {
          if (link === 'divider') {
            return <MenuItem key={index} divider/>;
          }
          return <MenuItem key={index}
                           eventKey={ toEventKey(link) }>
                <span
                  className={`glyphicon glyphicon-${link.icon}`}/>&nbsp;&nbsp;{ link.text }
          </MenuItem>;
        })
      }
    </DropdownButton>;
  }
}
