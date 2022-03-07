import {useStore} from "../utils/flux.js";
import {path} from "../utils/utils.js";
import {actionTextChanged, actionTextEditingDone, actionToggleContentCheckbox, MarkdownStore} from "./backing/MarkdownBacking.js";
import {TextArea} from "./TextArea.js";

export const Markdown = () => {
   let {isEditing} = useStore(MarkdownStore, ["isEditing"]);
   return isEditing ? <MarkdownEdit/> : <MarkdownDisplay/>;
};

const MarkdownDisplay = () => {
   let {html} = useStore(MarkdownStore, ["html"])
   return (<div className="main markdown-display">
      <div className="main-title">{path().replace("_", " ")}</div>
      <div className="markdown-body" dangerouslySetInnerHTML={{__html: html}} onClick={onClick}></div>
   </div>);

   function onClick(e:any) {
      let t: HTMLElement | null = e.target;
      while (t) {
         let n = t.getAttribute("data-ix");
         if (n != null) {
            actionToggleContentCheckbox({index: +n})
         }
         t = t.parentElement;
      }
   }
};

const MarkdownEdit = () => {
   let {text} = useStore(MarkdownStore, ["text"])
   return (<div className="main edit markdown-edit">
      <div className="main-title">{path()}</div>
      <TextArea onChange={actionTextChanged} value={text} onSave={actionTextEditingDone}/>
   </div>);
};
