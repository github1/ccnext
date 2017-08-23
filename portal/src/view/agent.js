import { Component } from 'react';
import { LOAD_TASKS, VERIFY_IDENTITY } from '../constants';
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
      let customerHandle = 'Unknown';
      let customerSessionId = '';
      let customerIsVerified = false;
      if (selectedTask.channel === 'chat') {
        if (this.props.model.chatSessions[selectedTask.chatId] && this.props.model.chatSessions[selectedTask.chatId].customer) {
          customerHandle = this.props.model.chatSessions[selectedTask.chatId].customer.handle;
          customerSessionId = this.props.model.chatSessions[selectedTask.chatId].customer.sessionId;
          customerIsVerified = this.props.model.chatSessions[selectedTask.chatId].customer.verified;
        }
      }
      return <div className="agent-body">
        <div className="agent-sidebar">
          <div className="panel panel-default">
            <div className="panel-heading">
              <h3 className="panel-title">Task Details</h3>
            </div>
            <div className="panel-body small tabular-info">
              <table className="table">
                <tbody>
                <tr><th>Created on</th><td><span>
                  { selectedTask.datetime }</span></td></tr>
                <tr><th>Status</th><td><TaskStatus task={selectedTask} pullRight={true}/></td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel panel-default">
            <div className="panel-heading">
              <h3 className="panel-title">Customer Details</h3>
            </div>
            <div className="panel-body small tabular-info">
              <table className="table">
                <tbody>
                <tr><th>Username</th><td><span>
                  { customerHandle }</span></td></tr>
                <tr><th>Status</th><td>{
                  customerIsVerified ? <span className="success">Verified
                </span> : <span className="failed">
                    Unverified</span>
                }</td></tr>
                </tbody>
              </table>
              <a href="#" className="btn btn-primary" disabled={customerIsVerified} onClick={
                    () => {
                      dispatch({
                        type: VERIFY_IDENTITY,
                        identityId: customerSessionId
                      });
                    }
                    }>Request verification</a>
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
      if (this.props.model.selectedTask) {
        return <div className="alert alert-danger">
          <span>{ `Task ${this.props.model.selectedTask} not found` }</span>
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
