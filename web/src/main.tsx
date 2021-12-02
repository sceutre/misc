import {App} from "./app/App.js";
import {appBeginDownloader, GLOBAL_KEY_HANDLERS} from "./app/backing/AppBacking.js";
import {dispatcher} from "./utils/flux.js";
import {path} from "./utils/utils.js";

if ((window as any).MDEV) 
   dispatcher.installActionLogging((action,data) => {
      console.log(action + " " + JSON.stringify(data));
   });
ReactDOM.render(<App />, document.getElementById('react'));
appBeginDownloader();
let p = path();
let title = p == "Misc" ? p : "Misc - " + p;
if (window.document.title != title) window.document.title = title;
document.addEventListener("keydown", (ev)=>{
   for (let h of GLOBAL_KEY_HANDLERS) h(ev);
});