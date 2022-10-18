import * as React from "react";
import {useStore} from "../utils/flux.js";
import {path} from "../utils/utils.js";
import {actionTextChanged, actionTextEditingDone, actionToggleContentCheckbox, MarkdownStore} from "./backing/MarkdownBacking.js";
import {TextArea} from "./TextArea.js";

export const Markdown = () => {
   let {isEditing, html, text} = useStore(MarkdownStore, ["isEditing", "html", "text"]);
   return isEditing ? <MarkdownEdit text={text} /> : <MarkdownDisplay html={html}/>;
};

const MarkdownDisplay = (props:{html:string}) => {
   let {html} = props;
   return (<div className="main markdown-display">
      <div className="main-title">{path().replace(/[_]/g, " ")}</div>
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

const MarkdownEdit = (props:{text:string}) => {
   let {text} = props;
   return (<div className="main edit markdown-edit">
      <div className="main-title">{path()}</div>
      <TextArea onChange={actionTextChanged} value={text} onSave={actionTextEditingDone}/>
   </div>);
};
