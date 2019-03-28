import {connect} from "../flux-ux/utils.js";
import {AppStore, path, Status} from "./AppStore.js";

interface PropsDerived {
   isEditing: boolean;
   markdown: string;
   html: string;
   sidebarHtml: string;
   title: string;
}

const Sidebar: React.FC<{html: string, onEdit: Fn, onSave: Fn, onCancel: Fn, onTheme: Fn, editing: boolean}> = props => {
   return (
      <div className="sidebar">
         <div className="sidebar-content">
            <div className="markdown-body" dangerouslySetInnerHTML={{__html: props.html}}></div>
         </div>
         <div className="sidebar-footer">
            <img className="logo" src="/-/src/prod/misc.png" onClick={props.onTheme}/>
            <div>
               {props.editing ? <>
                  <button onClick={props.onSave} style={{marginRight: "10px"}}>Save</button>
                  <button onClick={props.onCancel}>Cancel</button>
               </> : <>
                  <button onClick={props.onEdit}>Edit</button>
               </>}
            </div>
         </div>
      </div>
   );
};

const Main: React.FC<{html: string, markdown: string, title:string, onText: Fn<string>, onClick: Fn, editing: boolean}> = props => {
   let title = props.title.replace(/_/g, " ");
   return (
      <div className="main">
         <div className="main-title">{title}</div>
         {props.editing ? <>
            <div className="main-edit">
               <textarea onChange={ev => props.onText(ev.target.value || "")} value={props.markdown} />
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
         title: path()
      }
   }

   render() {
      let {title, isEditing, markdown, html, sidebarHtml} = this.props;
      return (
         <div className={"overall " + (isDarkTheme() ? "dark" : "")}>
            <Sidebar html={sidebarHtml} onEdit={this.onStartEditing} onCancel={this.onCancel} onSave={this.onSave} onTheme={this.onToggleDark} editing={isEditing}/>
            <Main html={html} markdown={markdown} title={title} onText={this.onTextUpdate} onClick={this.onContentClick} editing={isEditing} />
         </div>
      );
   }

   onTextUpdate = (s: string) => {
      AppStore.actions.setMarkdown({markdown: s});
   };

   onSave = () => {
      asyncSave(AppStore.data.markdown);
   }

   onCancel = () => {
      asyncMarkdown(true);
      AppStore.actions.setEditing({editing: false});
   }

   onStartEditing = () => {
      AppStore.actions.setEditing({editing: true});
   }

   onContentClick = (e:any) => {
      let t:HTMLElement|null = e.target;
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

   toggleChecked(lineNum:number) {
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
         this.onTextUpdate(lines.join("\n"));
         this.onSave();
      }
   }
}

function log$(p: Promise<any>) {
   p.catch(e => console.warn("promise failed", e));
}

const inst = connect<PropsDerived>(App);
export {inst as App};

// services

function wait(tm: number) {
   return new Promise((resolve, reject) => {
      setTimeout(() => resolve(true), tm);
   });
}

async function asyncSave(s: string) {
   let resp = await fetch("/-/md/" + path(), {method: "POST", body: s});
   if (resp.ok) {
      await asyncHtml(true);
      if (path() == "Sidebar") {
         await asyncSidebarHtml(true);
      }
      AppStore.actions.setEditing({editing: false});
   }
}

async function asyncHtml(force?: boolean) {
   if (AppStore.data.htmlProgress == Status.UNLOADED || force) {
      await wait(0);
      if (AppStore.data.htmlProgress == Status.UNLOADED || force) {
         AppStore.actions.setHtmlProgress({progress: Status.WAITING});
         let resp = await fetch("/-/md-to-html/" + path());
         if (resp.ok) {
            let text = await resp.text();
            AppStore.actions.setHtml({html: text});
            AppStore.actions.setHtmlProgress({progress: Status.LOADED});
         }
      }
   }
}

async function asyncSidebarHtml(force?: boolean) {
   if (AppStore.data.htmlSidebarProgress == Status.UNLOADED || force) {
      await wait(0);
      if (AppStore.data.htmlSidebarProgress == Status.UNLOADED || force) {
         AppStore.actions.setHtmlSidebarProgress({progress: Status.WAITING});
         let resp = await fetch("/-/md-to-html/Sidebar");
         if (resp.ok) {
            let text = await resp.text();
            AppStore.actions.setSidebarHtml({html: text});
            AppStore.actions.setHtmlSidebarProgress({progress: Status.LOADED});
         }
      }
   }
}

async function asyncMarkdown(force?: boolean) {
   if (AppStore.data.markdownProgress == Status.UNLOADED || force) {
      await wait(0);
      if (AppStore.data.markdownProgress == Status.UNLOADED || force) {
         AppStore.actions.setMarkdownProgress({progress: Status.WAITING});
         let resp = await fetch("/-/md/" + path());
         if (resp.ok) {
            let text = await resp.text();
            AppStore.actions.setMarkdown({markdown: text});
            AppStore.actions.setMarkdownProgress({progress: Status.LOADED});
         }
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

