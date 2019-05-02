import {Store} from "../flux-ux/store.js";
import {Action} from "../flux-ux/action.js";

export const enum Status {
   EMPTY,
   WAITING,
   OK,
   SAVING,
   THEN_HTML
}

interface AppData {
   isEditing: boolean;
   markdown: string;
   generatedHtml: string;
   generatedSidebarHtml: string;
   markdownStatus: Status;
   htmlStatus: Status;
   htmlSidebarStatus: Status;
   autosaveStatus: Status;
}

export function path() {
   let p = decodeURIComponent(window.location.pathname.substring(1)).replace(/[^a-zA-Z0-9]/g, "_") || "Misc";
   let title = p == "Misc" ? p : "Misc - " + p;
   if (window.document.title != title) window.document.title = title;
   return p;
}

class AppStoreClass extends Store<AppData> {
   constructor() {
      super({
         isEditing: false,
         markdown: "",
         generatedHtml: "",
         generatedSidebarHtml: "",
         markdownStatus: Status.EMPTY,
         htmlStatus: Status.EMPTY,
         htmlSidebarStatus: Status.EMPTY,
         autosaveStatus: Status.OK
      }, "appStore");
   }

   private onSetEditing = (d: {editing: boolean}) => {
      this.update(x => x.isEditing = d.editing);
   };

   private onSetMarkdown = (d: {markdown: string}) => {
      this.update(x => x.markdown = d.markdown);
   };

   private onSetHtml = (d: {html: string}) => {
      this.update(x => x.generatedHtml = d.html);
   };

   private onSetSidebarHtml = (d: {html: string}) => {
      this.update(x => x.generatedSidebarHtml = d.html);
   };

   private onSetHtmlStatus = (d: {status: Status}) => {
      this.update(x => x.htmlStatus = d.status);
   };

   private onSetHtmlSidebarStatus = (d: {status: Status}) => {
      this.update(x => x.htmlSidebarStatus = d.status);
   };

   private onSetMarkdownStatus = (d: {status: Status}) => {
      this.update(x => x.markdownStatus = d.status);
   };

   private onSetAutosaveStatus = (d: {status: Status}) => {
      this.update(x => x.autosaveStatus = d.status);
   };

   actions = {
      setEditing: Action("setEditing", this.onSetEditing),
      setMarkdown: Action("setMarkdown", this.onSetMarkdown),
      setHtml: Action("setHtml", this.onSetHtml),
      setSidebarHtml: Action("setSidebarHtml", this.onSetSidebarHtml),
      setHtmlStatus: Action("setHtmlStatus", this.onSetHtmlStatus),
      setHtmlSidebarStatus: Action("setHtmlSidebarStatus", this.onSetHtmlSidebarStatus),
      setMarkdownStatus: Action("setMarkdownStatus", this.onSetMarkdownStatus),
      setAutosaveStatus: Action("setAutosaveStatus", this.onSetAutosaveStatus),
   };
}

export const AppStore = new AppStoreClass(); 