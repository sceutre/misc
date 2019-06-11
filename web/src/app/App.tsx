import {connect} from "../flux-ux/utils.js";
import {AppStore, path, Status} from "./AppStore.js";

interface PropsDerived {
   isEditing: boolean;
   isDirty: boolean;
   markdown: string;
   html: string;
   sidebarHtml: string;
   title: string;
}

interface SidebarProps {
   html: string;
   onEdit: Fn;
   onDone: Fn;
   onTheme: Fn;
   editing: boolean
}

interface MainProps {
   html: string;
   markdown: string;
   title: string; 
   onText: Fn<string>; 
   onClick: Fn;
   editing: boolean;
}

function Sidebar(props: SidebarProps) {
   return (
      <div className="sidebar">
         <div className="sidebar-content">
            <div className="markdown-body" dangerouslySetInnerHTML={{__html: props.html}}></div>
         </div>
         <div className="sidebar-footer">
            <img className="logo" src="/-/src/prod/misc.png" onClick={props.onTheme} />
            <div>
               {props.editing ? <button onClick={props.onDone}>Done</button> : <button onClick={props.onEdit}>Edit</button>}
            </div>
         </div>
      </div>
   );
}

interface TextAreaProps {
   onChange: Fn;
   value: string;
} 

const SPACES = [ "", " ", "  ", "   "];

function TextArea(props:TextAreaProps) {
   const textArea = React.useRef<HTMLTextAreaElement>(null!);
   
   function onKeyDown(e:React.KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === "Tab") {
         e.preventDefault();
         const { selectionStart, selectionEnd } = e.currentTarget;
         let s = props.value;
         let ix = s.lastIndexOf("\n", selectionStart) + 1;
         let spaces = ix > selectionStart ? 3 : (3 - ((selectionStart - ix) % 3));
         const newValue = s.substring(0, selectionStart) + SPACES[spaces] + s.substring(selectionEnd);
         props.onChange(newValue);
         if (textArea.current) {
           textArea.current.value = newValue;
           textArea.current.selectionStart = textArea.current.selectionEnd = selectionStart + spaces;
         }
       }
   }

   return <textarea ref={textArea} onKeyDown={onKeyDown} onChange={e => props.onChange(e.target.value)} value={props.value} />;
 }


function Main(props: MainProps) {
   let title = props.title.replace(/_/g, " ");
   return (
      <div className="main">
         <div className="main-title">{title}</div>
         {props.editing ? <>
            <div className="main-edit">
               <TextArea onChange={props.onText} value={props.markdown} />
            </div>
         </> : <>
               <div className="main-content">
                  <div className="markdown-body" dangerouslySetInnerHTML={{__html: props.html}} onClick={props.onClick}></div>
               </div>
            </>}
      </div>
   );
};


class App extends React.PureComponent<PropsDerived> {

   static stores = [AppStore];

   static getDerivedProps() {
      asyncMarkdown();
      asyncHtml();
      asyncSidebarHtml();
      return {
         isEditing: AppStore.data.isEditing,
         markdown: AppStore.data.markdown,
         html: AppStore.data.generatedHtml,
         sidebarHtml: AppStore.data.generatedSidebarHtml,
         isDirty: AppStore.data.autosaveStatus == Status.WAITING,
         title: path()
      }
   }

   render() {
      let {title, isEditing, markdown, html, sidebarHtml, isDirty} = this.props;
      return (
         <div className={"overall " + (isDarkTheme() ? "dark" : "") + (isDirty ? " dirty" : "")}>
            <Sidebar html={sidebarHtml} onEdit={this.onStartEditing} onDone={onDone} onTheme={this.onToggleDark} editing={isEditing} />
            <Main html={html} markdown={markdown} title={title} onText={onText} onClick={this.onContentClick} editing={isEditing} />
         </div>
      );
   }

   onStartEditing = () => {
      AppStore.actions.setEditing({editing: true});
   }

   onContentClick = (e: any) => {
      let t: HTMLElement | null = e.target;
      while (t) {
         let n = t.getAttribute("data-line");
         if (n !== null && typeof n != undefined) {
            this.toggleChecked(+n);
         }
         t = t.parentElement;
      }
   }

   onToggleDark = () => {
      toggleDarkTheme();
      this.forceUpdate();
   }

   toggleChecked(lineNum: number) {
      let lines = this.props.markdown.split("\n");
      let matches = /^([^[]+) \[([xX ])\] (.*)$/.exec(lines[lineNum]);
      if (matches) {
         let prefix = matches[1];
         let mid = matches[2];
         let suffix = matches[3].trim();
         mid = (mid == " ") ? "x" : " ";
         suffix = suffix.replace(/^~(.*)~$/, "$1");
         if (mid == "x") suffix = "~" + suffix + "~";
         lines[lineNum] = prefix + " [" + mid + "] " + suffix;
         onText(lines.join("\n"));
      }
   }
}

function log$(p: Promise<any>) {
   p.catch(e => console.warn("promise failed", e));
}

const inst = connect<PropsDerived>(App);
export {inst as App};

// services

setInterval(async () => {
   if (AppStore.data.markdownStatus == Status.EMPTY) return;
   if (AppStore.data.autosaveStatus != Status.OK) return;
   if (Date.now() - lastLoadTime < 60000) return;
   let resp = await fetch("/-/md/" + path());
   if (resp.ok) {
      lastLoadTime = Date.now();
      let text = await resp.text();
      if (text != lastLoad) {
         lastLoad = text;
         AppStore.actions.setMarkdown({markdown: text});
         if (!AppStore.data.isEditing) {
            await asyncHtml(true);
            if (path() == "Sidebar") await asyncSidebarHtml(true);
         }
      }
   }
}, 10000);

function wait(tm: number) {
   return new Promise((resolve, reject) => {
      setTimeout(() => resolve(true), tm);
   });
}

let autosaveTimeout: number = 0;
let lastLoad = "";
let lastLoadTime = 0;

async function onText(s: string) {
   if (autosaveTimeout) {clearTimeout(autosaveTimeout); autosaveTimeout = 0;}
   AppStore.actions.setMarkdown({markdown: s});
   if (!AppStore.data.isEditing) {
      await save();
      await asyncHtml(true);
      if (path() == "Sidebar") await asyncSidebarHtml(true);
   } else {
      autosaveTimeout = window.setTimeout(autosave, 1000 * 5);
      AppStore.actions.setAutosaveStatus({status: Status.WAITING});
   }
}

async function autosave() {
   autosaveTimeout = 0;
   await save();
}

async function save() {
   AppStore.actions.setAutosaveStatus({status: Status.SAVING});
   let resp = await fetch("/-/md/" + path(), {method: "POST", body: AppStore.data.markdown});
   if (!resp.ok) throw "save failed";
   lastLoad = AppStore.data.markdown;
   lastLoadTime = Date.now();
   if (AppStore.data.autosaveStatus == Status.THEN_HTML) {
      await asyncHtml(true);
      if (path() == "Sidebar") await asyncSidebarHtml(true);
      AppStore.actions.setEditing({editing: false});
   }
   AppStore.actions.setAutosaveStatus({status: Status.OK});

}

async function onDone() {
   if (autosaveTimeout) {clearTimeout(autosaveTimeout); autosaveTimeout = 0;}
   switch (AppStore.data.autosaveStatus) {
      case Status.OK:
         await asyncHtml(true);
         if (path() == "Sidebar") await asyncSidebarHtml(true);
         AppStore.actions.setEditing({editing: false});
         return;
      case Status.WAITING:
         save();
         AppStore.actions.setAutosaveStatus({status: Status.THEN_HTML});
         return;
      case Status.SAVING:
         AppStore.actions.setAutosaveStatus({status: Status.THEN_HTML});
         return;
   }
}

async function asyncHtml(force?: boolean) {
   if (AppStore.data.htmlStatus == Status.EMPTY || force) {
      await wait(0);
      if (AppStore.data.htmlStatus == Status.EMPTY || force) {
         AppStore.actions.setHtmlStatus({status: Status.WAITING});
         let resp = await fetch("/-/md-to-html/" + path());
         if (resp.ok) {
            let text = await resp.text();
            AppStore.actions.setHtml({html: text});
            AppStore.actions.setHtmlStatus({status: Status.OK});
         }
      }
   }
}

async function asyncSidebarHtml(force?: boolean) {
   await wait(0);
   if (AppStore.data.htmlSidebarStatus == Status.EMPTY || force) {
      AppStore.actions.setHtmlSidebarStatus({status: Status.WAITING});
      let resp = await fetch("/-/md-to-html/Sidebar");
      if (resp.ok) {
         let text = await resp.text();
         AppStore.actions.setSidebarHtml({html: text});
         AppStore.actions.setHtmlSidebarStatus({status: Status.OK});
      }
   }
}

async function asyncMarkdown(force?: boolean) {
   await wait(0);
   if (AppStore.data.markdownStatus == Status.EMPTY || force) {
      AppStore.actions.setMarkdownStatus({status: Status.WAITING});
      let resp = await fetch("/-/md/" + path());
      if (resp.ok) {
         let text = await resp.text();
         let lastLoad = text;
         let lastLoadTime = Date.now();
         AppStore.actions.setMarkdown({markdown: text});
         AppStore.actions.setMarkdownStatus({status: Status.OK});
      }
   }
}


function isDarkTheme() {
   let theme = localStorage.getItem("theme");
   return theme === "dark";
}

function toggleDarkTheme() {
   localStorage.setItem("theme", isDarkTheme() ? "light" : "dark");
}





