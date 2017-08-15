import { Component } from 'react';
import { LOAD_TASKS } from '../constants';
import TaskList from './../component/task_list';
import TaskDetail from './../component/task_detail';
import TaskStatus from './../component/task_status';

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

  render() {
    const tasks = this.props.model.tasks.sort((a, b) => {
      return b.assignedAtTime - a.assignedAtTime;
    }).map((task) => {
      task.datetime = new Date(task.assignedAtTime).toString();
      return task;
    });
    const selectedTask = tasks.filter((task) => {
      return task.taskId === this.props.model.selectedTask;
    })[0];
    if (selectedTask) {
      return <div className="agent-body">
        <div className="agent-sidebar">
          <div className="panel panel-default">
            <div className="panel-heading">
              <h3 className="panel-title">Task Details</h3>
            </div>
            <div className="panel-body small">
              <h4>Created on</h4>
              <span className="task-datetime">{ selectedTask.datetime }</span>
              <h4>Status</h4>
              <TaskStatus task={selectedTask} pullRight={true}/>
            </div>
          </div>
        </div>
        <div className="agent-content">
          <TaskDetail task={selectedTask}
                      chatSessions={this.props.model.chatSessions}
                      height={ this.props.model.device.screen.height - 210 }/>
        </div>
      </div>
    } else {
      if(this.props.model.selectedTask) {
        return <div className="alert alert-danger"><span>{ `Task ${this.props.model.selectedTask} not found` }</span>
          <hr/>
          <a className="btn btn-danger" href="/agent">Ok</a>
        </div>;
      }
      return <div>
        <div className="panel panel-default">
          <div className="panel-heading">
            <h3 className="panel-title">Tasks</h3>
          </div>
          <div className="panel-body">
            <TaskList tasks={ tasks }
                      height={ this.props.model.device.screen.height - 180 }/>
          </div>
        </div>
      </div>
    }
  }
}
