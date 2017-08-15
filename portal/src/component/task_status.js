import { Component } from 'react';
import PropTypes from 'prop-types';
import Dropdown from './dropdown';
import { MARK_TASK_COMPLETE } from '../constants';

class TaskStatus extends Component {
  constructor(props) {
    super(props);
  }

  markTaskComplete(task) {
    dispatch({
      type: MARK_TASK_COMPLETE,
      task: task
    });
  }

  render() {
    const menuLinks = [{
      text: 'Mark as complete', icon: 'ok', handler: () => {
        this.markTaskComplete(this.props.task);
      }
    }];
    return <div>
      { this.props.task.status === 'assigned' ? <Dropdown
        title={  <span className="task-status">{this.props.task.status}</span> }
        pullRight={ this.props.pullRight }
        id="task-status-menu"
        menuItems={menuLinks}
      /> : <span className="task-status readonly">{this.props.task.status}</span>}
    </div>
  }
}

TaskStatus.propTypes = {
  task: PropTypes.object.isRequired,
  pullRight: PropTypes.bool
};

export default TaskStatus;
