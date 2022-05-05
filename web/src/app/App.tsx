import {useStore} from "../utils/flux.js";
import {AppStore} from "./backing/AppBacking.js";
import {Drawing} from "./Drawing.js";
import {Markdown} from "./Markdown.js";
import {MindMap} from "./MindMap.js";
import {Sidebar, SidebarEdit} from "./Sidebar.js";

export function App() {
   const {content,theme,netStatus} = useStore(AppStore, ["content", "theme", "netStatus"]);
   let ctx:React.ReactNode = null;
   switch (content.type) {
      case "drawing":    ctx = <Drawing />;        break;
      case "markdown":   ctx = <Markdown />;       break;
      case "mindmap":    ctx = <MindMap />;        break;
      case "sidebar":    ctx = <SidebarEdit />;    break;
      case "empty": return null; 
   }
   return <div className={`app ${theme} ${netStatus}`}>
      <Sidebar />
      {ctx}
   </div>
}
