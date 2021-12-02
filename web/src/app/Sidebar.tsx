import {useStore} from "../utils/flux";
import {actionToggleDark, AppStore, Content, Theme} from "./backing/AppBacking";
import {actionTextEditingDone, actionTextEditingStart, MarkdownStore} from "./backing/MarkdownBacking";
import {actionSetCompactMode, actionSidebarTextChanged, Icon, isHtmlChunk, SidebarStore} from "./backing/SidebarBacking";
import {TextArea} from "./TextArea";


export function Sidebar() {
   let {sidebar, compactMode} = useStore(SidebarStore, ["sidebar", "compactMode"]);
   let {theme, content} = useStore(AppStore, ["theme", "content"]);
   let {isEditing} = useStore(MarkdownStore, ["isEditing"]);
   let whens:string[] = [];
   if (isEditing) whens.push("editing");
   if (!isEditing && content == "markdown") whens.push("editable");
   whens.push(theme);
   whens.push(compactMode ? "compact" : "normal");
   return <div className={compactMode ? "sidebar compact" : "sidebar"}>
      {sidebar?.items.map(x => {
         if (!isWhen(whens, x.when)) return null;
         if (isHtmlChunk(x)) {
            return <div style={x.wrapperStyle} dangerouslySetInnerHTML={{__html: x.html}}></div>
         } else if (shouldShow(theme, content, isEditing,x)) {
            return <IconLabel icon={x} compact={compactMode} />
         } else {
            return null;
         }
      })}
      <IconArrow/>
   </div>;
}

export function SidebarEdit() {
   let {text} = useStore(SidebarStore, ["text"])
   return (<div className="mardown-edit">
      <TextArea onChange={actionSidebarTextChanged} value={text}/>
   </div>);
}

function IconLabel(props:{icon:Icon, compact:boolean}) {
   const {opacity = 1, label, action, image} = props.icon;

   return <div className="iconlabel" onClick={onClick} style={{opacity: opacity}}>
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
            default: 
               window.location.href = action; 
               break;
         }
      }
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

function shouldShow(theme: Theme, content: Content, isEditing:boolean, icon: Icon) {
   if (icon.action) {
      switch (icon.action) {
         case "$edit":
            return content == "markdown" && !isEditing;
         case "$editDone":
            return content == "markdown" && isEditing;
         case "$toDark":
            return theme == "light";
         case "$toLight":
            return theme == "dark";
      }
   }
   return true;
}

function isWhen(whens: string[], when: string[] | undefined) {
   if (when) {
      for (let x of when) {
         if (!whens.includes(x)) return false;
      }
   }
   return true;
}

