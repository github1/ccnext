import { Component } from 'react';
import PropTypes from 'prop-types';
import TaskStatus from './task_status';
import { getScrollBarWidth } from './../browser_utils';

class TaskList extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const taskListStyle = this.props.height ? {
      height: this.props.height
    } : {};
    if (this.props.tasks.length === 0) {
      return <div className="small">None active</div>;
    }
    return <div>
      <table style={taskListStyle} className="table task-list task-list-header">
        <colgroup>
          <col/>
          <col width="100"/>
          <col width="100"/>
          <col width="115"/>
          <col width={getScrollBarWidth()}/>
        </colgroup>
        <thead>
        <tr>
          <th>Task Id</th>
          <th>Channel</th>
          <th>Created on</th>
          <th>Status</th>
          <th></th>
        </tr>
        </thead>
      </table>
      <div className="task-list-scroll" style={taskListStyle}>
        <table className="table task-list">
          <colgroup>
            <col/>
            <col width="100"/>
            <col width="100"/>
            <col width="115"/>
          </colgroup>
          <tbody>
          {
            this.props.tasks.map((task) => {
              return <tr key={task.taskId}>
                <td ><a href={ `/agent/task/${task.taskId}` }>{task.taskId}</a>
                </td>
                <td className="task-channel">{task.channel}</td>
                <td className="task-datetime">{task.datetime}</td>
                <td className="task-status"><TaskStatus task={ task }/></td>
              </tr>
            })
          }
          </tbody>
        </table>
      </div>
    </div>;
  }
}

TaskList.propTypes = {
  tasks: PropTypes.array.isRequired,
  height: PropTypes.number
};

export default TaskList;
