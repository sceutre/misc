import {App} from "./app/App.js";
import {dispatcher} from "./flux-ux/dispatcher.js";

dispatcher.installActionLogging((action,text) => console.log(action + " " + text));
ReactDOM.render(<App />, document.getElementById('react'));
