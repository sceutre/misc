import {useStore} from "../utils/flux";
import {AppStore, Mode, NetStatus, Theme} from "./backing/AppBacking";
import {Chooser} from "./Chooser";
import {Drawing} from "./Drawing";
import {Locked} from "./Locked";
import {Markdown} from "./Markdown";
import {MindMap} from "./MindMap";
import {Sidebar, SidebarEdit} from "./Sidebar";

interface PropsDerived {
   mode:Mode,
   theme:Theme,
   netStatus:NetStatus
}

export const App = () => {
   const {content,theme,netStatus} = useStore(AppStore, ["content", "theme", "netStatus"]);
   let ctx:React.ReactNode = null;
   switch (content) {
      case "unknown":    ctx = <Chooser />;        break;
      case "drawing":    ctx = <Drawing />;        break;
      case "markdown":   ctx = <Markdown />;       break;
      case "mindmap":    ctx = <MindMap />;        break;
      case "encrypted":  ctx = <Locked />;         break;
      case "sidebar":    ctx = <SidebarEdit />;    break;
   }
   return <div className={`app ${theme} ${netStatus}`}>
      <Sidebar />
      {ctx}
   </div>

}
