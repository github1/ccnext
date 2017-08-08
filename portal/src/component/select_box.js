import { Component } from 'react';

export default class extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: props.defaultValue
    }
  }

  handleChange(event) {
    const value = event.target.value;
    this.setState({value: value}, () => {
      if(this.props.onChange) {
        this.props.onChange(event, value);
      }
    });
  }

  render() {
    return <select className="form-control" value={this.state.value}
                   onChange={(e) => this.handleChange(e)}>
      {
        this.props.opts.map((opt, index) => {
          return <option key={index}
            value={ opt.value }>{ opt.label }</option>
        })
      }
    </select>
  }
}
