import {Action, Store} from "../../utils/flux.js";
import {log$, wait} from "../../utils/utils.js";
import {actionSaved, actionUpdateDownloaded, appSave, AppStore} from "./AppBacking.js";
import {markedExtToHtml} from "../../utils/markedExt.js";

export const MarkdownStore = new Store("MarkdownStore", { 
   text: "", 
   html: "",
   donePending: false, 
   isEditing: false 
});

export const actionTextChanged = Action("setEditingText", (arg:{text:string}) => {
   MarkdownStore.set("text", arg.text);
   appSave({type: "markdown", text: arg.text });
});

export const actionTextEditingDone = Action<void>("textEditingDone", () => {
   if (AppStore.data.netStatus == "net-clean") {
      log$(transformMarkdownToHTML());
   } else if (AppStore.data.netStatus == "net-waiting") {
      MarkdownStore.set("donePending", true);
   } else {
      MarkdownStore.set("donePending", true);
      appSave({type: "markdown", text: MarkdownStore.data.text}, true);
   }
});

export const actionTextEditingStart = Action<void>("textEditingStart", () => {
   MarkdownStore.set("isEditing", true);
})

export const actionShowMarkdown = Action("showMarkdown", (arg: {html:string}) => {
   MarkdownStore.update(x => {
      x.isEditing = false;
      x.html = arg.html;
   });
})

export const actionToggleContentCheckbox = Action("toggleChecked", (arg:{index:number}) => {
   let ix = arg.index;
   let lines = MarkdownStore.data.text.split("\n");
   for (let i=0; i < lines.length; i++) {
      let matches = /^([^[]+) \[([xX ])\] (.*)$/.exec(lines[i]);
      if (matches) {
         if (--ix < 0) {
            let prefix = matches[1];
            let mid = matches[2];
            let suffix = matches[3].trim();
            mid = (mid == " ") ? "x" : " ";
            suffix = suffix.replace(/^~(.*)~$/, "$1");
            if (mid == "x") suffix = "~" + suffix + "~";
            lines[i] = prefix + " [" + mid + "] " + suffix;
            let newText = lines.join("\n");
            MarkdownStore.set("text", newText);
            AppStore.set("netStatus", "net-dirty");
            appSave({type: "markdown", text: newText});
            log$(transformMarkdownToHTML(newText));
            return;
         }
      }
   }
});

actionSaved.add(() => {
   if (MarkdownStore.data.donePending) {
      MarkdownStore.set("donePending", false);
      log$(transformMarkdownToHTML());
   }
})

actionUpdateDownloaded.add((arg) => {
   if (AppStore.data.content.type == "markdown" && !arg.viaSave) {
      MarkdownStore.set("text", AppStore.data.content.text);
      if (!MarkdownStore.data.isEditing) {
         transformMarkdownToHTML();
      }
   }
});

async function transformMarkdownToHTML(text?:string) {
   await wait(0);
   if (typeof text == "undefined" && AppStore.data.content.type == "markdown") { text = AppStore.data.content.text; }
   if (text) {
      actionShowMarkdown({html: markedExtToHtml(text)})
   }
}