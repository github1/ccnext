import { Component } from 'react';
import Dropdown from './../component/dropdown';
import { LOAD_TASKS, MARK_TASK_COMPLETE } from '../constants';

export default class extends Component {

  componentWillMount() {
    dispatch({
      type: LOAD_TASKS
    });
  }

  componentDidMount() {
    window.setTimeout(()=> {
      window.scrollTo(0, 0);
    }, 0);
  }

  markTaskComplete(taskId) {
    dispatch({
      type: MARK_TASK_COMPLETE,
      taskId: taskId
    });
  }

  render() {
    const tasks = this.props.model.tasks.sort((a, b) => {
      return b.assignedAtTime - a.assignedAtTime;
    });
    return <div>
      <h5>Tasks</h5>
      { tasks.length === 0 ? <div>0 tasks</div> :
        <ul className="list-group task-list">
          {
            tasks.map((task) => {
              const taskIdLast4 = task.taskId.substring(task.taskId.length - 4);
              const menuLinks = [{text: 'Complete', icon: 'ok', handler: () => {
                this.markTaskComplete(task.taskId);
              }}];
              return <li key={task.taskId} className="list-group-item clearfix">
                <div className="task-id">{ taskIdLast4 }</div>
                <span className="task-channel">{ task.channel }</span>
              <span className="pull-right">
                { task.status === 'assigned' ?
                  <Dropdown
                    title={  task.status }
                    id="task-status-menu"
                    menuItems={menuLinks}
                  /> :
                  <span>{task.status}</span>
                }
              </span>
              </li>
            })
          }
        </ul>
      }
    </div>
  }
}
