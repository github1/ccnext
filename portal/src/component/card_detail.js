import { Component } from 'react';
import Card from './card';

export default class extends Component {
  constructor(props) {
    super(props);
  }

  render() {

    const sections = [{
      label: 'Current Balance'
    }, {
      label: 'Payment Status'
    }, {
      label: 'Rewards Points'
    }];

    return <div>
      <div className="visible-xs-inline pull-left">
        <Card small={true}/>
      </div>
      <h4 className="card-product">
        Platinum Rewards</h4>
      <div className="card-detail">
        {
          sections.map((section, index) => {
            return <DetailPanel key={index} title={ section.label }/>
          })
        }
      </div>
      <DetailPanel title="Recent Activity"/>
    </div>;

  }
}

class DetailPanel extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <div className="panel panel-default card-detail-item">
      <div className="panel-heading">
        <span className="panel-title">{ this.props.title }</span>
      </div>
      <div className="panel-body">
        <div>

        </div>
      </div>
    </div>
  }
}
