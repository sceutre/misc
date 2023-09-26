import {useStore} from "../utils/flux.js";
import {path} from "../utils/utils.js";
import {actionToggleDark, appSaveImg, AppStore, toDrawing, toMarkdown} from "./backing/AppBacking.js";
import {actionTextEditingDone, actionTextEditingStart, MarkdownStore} from "./backing/MarkdownBacking.js";
import {actionSetCompactMode, actionSidebarTextChanged, Icon, isHtmlChunk, SidebarStore} from "./backing/SidebarBacking.js";
import {TextArea} from "./TextArea.js";


export function Sidebar() {
   let {sidebar, compactMode} = useStore(SidebarStore, ["sidebar", "compactMode"]);
   let {theme, content, netStatus} = useStore(AppStore, ["theme", "content", "netStatus"]);
   let {isEditing, text} = useStore(MarkdownStore, ["isEditing", "text"]);
   let whens:string[] = [];
   whens.push(theme);
   whens.push(content.type);
   whens.push(compactMode ? "compact" : "normal");
   if (netStatus != "net-clean") whens.push("dirty");
   if (content.type == "markdown") {
      whens.push((isEditing ? "" : "not-") + "editing");
      if (!text || !text.trim()) whens.push("blank");
   }
   return <div className={compactMode ? "sidebar compact" : "sidebar"}>
      {sidebar?.items.map((x,i) => {
         if (!isWhen(whens, x.when)) 
            return null;
         if (isHtmlChunk(x))
            return <div style={x.wrapperStyle} key={i} dangerouslySetInnerHTML={{__html: x.html}}></div>
         return <IconLabel key={i} icon={x} compact={compactMode} />
      })}
      <IconArrow/>
   </div>;
}

export function SidebarEdit() {
   let {text} = useStore(SidebarStore, ["text"])
   return (<div className="main edit">
      <div className="main-title">{path().title}</div>
      <TextArea onChange={actionSidebarTextChanged} value={text}/>
   </div>);
}

function IconLabel(props:{icon:Icon, compact:boolean}) {
   const {opacity = 1, label, action, image} = props.icon;

   if (action == "$upload") {
      return (
         <label className="iconlabel" style={{opacity: opacity}}>
            <input type="file" style={{display:"none"}} onChange={onChange}/>
            <img src={image}/>{!props.compact && <span>{label}</span>}
         </label>
      );
   }
   return <div className={action =="$none" ? "iconlabelnoaction" : "iconlabel"} onClick={onClick} style={{opacity: opacity}}>
      <img src={image}/>{!props.compact && <span>{label}</span>}
   </div>;

   function onClick() {
      if (action) {
         switch (action) {
            case "$edit": 
               actionTextEditingStart();
               break;
            case "$editDone":
               actionTextEditingDone();
               break;
            case "$toDark":
            case "$toLight":
               actionToggleDark();
               break;
            case "$toMarkdown":
               toMarkdown();
               break;
            case "$toDrawing":
               toDrawing();
               break;
            case "$none":
               break;
            case "$upload":
                  break;
            default: 
               window.location.href = action; 
               break;
         }

      }
   }
   function onChange(arg:any) {
      let file = arg.target.files[0] as File;
      file.arrayBuffer().then(b => {
         appSaveImg(b, file.name);
      });
   }
}

const FULL_WIDTH = 200;
const COMPACT_WIDTH = 80;

function IconArrow() {
   const {compactMode} = useStore(SidebarStore, ["compactMode"]);
   return <svg onClick={toggleCompactMode} className="iconarrow" width="24px" height="24px" viewBox="0 0 256 256" id="Flat" xmlns="http://www.w3.org/2000/svg">
      <g>
         <circle cx="128" cy="128" r="96" style={{fill: "var(--sidebar-bg)"}} />
      </g>
      <g style={{fill: "var(--main-bg)"}}>
         <path d="M128,24A104,104,0,1,0,232,128,104.11791,104.11791,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.09957,88.09957,0,0,1,128,216Z" />
         <path d="M139.71582,88.40186a8,8,0,1,0-11.31348,11.314L148.68652,120H88a8,8,0,0,0,0,16h60.68652l-20.28418,20.28418a8,8,0,1,0,11.31348,11.314l33.94092-33.94091a8.00034,8.00034,0,0,0,0-11.31446Z" />
      </g>
   </svg>
}


function toggleCompactMode() {
   actionSetCompactMode({compact: !SidebarStore.data.compactMode})
}

function isWhen(whens: string[], when: string[] | undefined) {
   if (when) {
      for (let x of when) {
         if (!whens.includes(x)) return false;
      }
   }
   return true;
}
