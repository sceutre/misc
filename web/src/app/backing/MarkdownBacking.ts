import {Action,Store} from "../../utils/flux.js";
import {log$, path, wait} from "../../utils/utils.js";
import {actionSaved, actionUpdateDownloaded, appSave, appSaveNow, AppStore} from "./AppBacking.js";

export const MarkdownStore = new Store("MarkdownStore", { 
   text: "", 
   html: "",
   donePending: false, 
   isEditing: false 
});

export const actionTextChanged = Action("setEditingText", (arg:{text:string}) => {
   MarkdownStore.set("text", arg.text);
   AppStore.set("netStatus", "net-dirty");
   appSave(arg.text, "markdown");
});

export const actionTextEditingDone = Action<void>("textEditingDone", () => {
   if (AppStore.data.netStatus == "net-clean") {
      log$(transformMarkdownToHTML());
   } else if (AppStore.data.netStatus == "net-waiting") {
      MarkdownStore.set("donePending", true);
   } else {
      MarkdownStore.set("donePending", true);
      appSaveNow(MarkdownStore.data.text, "markdown");
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
   let index = arg.index;
   let lines = MarkdownStore.data.text.split("\n");
   let i = 0;
   while (true) {
      if (lines[i].length > index || i == lines.length - 1) break;
      index -= lines[i].length+1;
      i++;
   }
   let matches = /^([^[]+) \[([xX ])\] (.*)$/.exec(lines[i]);
   if (matches) {
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
      appSave(newText, "markdown");
   }
});

actionSaved.add(() => {
   if (MarkdownStore.data.donePending) {
      MarkdownStore.set("donePending", false);
      log$(transformMarkdownToHTML());
   }
})

actionUpdateDownloaded.add((arg) => {
   if (AppStore.data.content == "markdown" && AppStore.data.payload != MarkdownStore.data.text) {
      MarkdownStore.set("text", AppStore.data.payload);
      if (!MarkdownStore.data.isEditing) {
         transformMarkdownToHTML();
      }
   }
});

async function transformMarkdownToHTML() {
   let resp = await fetch("/-/md-to-html/", { method: "POST", body: AppStore.data.payload });
   if (resp.ok) {
      let html = await resp.text();
      actionShowMarkdown({html})
   } else {
      throw "retrieving MD failed";
   }
}