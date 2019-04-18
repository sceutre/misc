import {Store} from "../flux-ux/store.js";
import {Action} from "../flux-ux/action.js";

export const enum Status {
   UNLOADED,
   WAITING,
   LOADED,
   SAVING,
   THEN_HTML
}

interface AppData {
   isEditing: boolean;
   markdown: string;
   generatedHtml: string;
   generatedSidebarHtml: string;
   markdownProgress: Status;
   htmlProgress: Status;
   htmlSidebarProgress: Status;
   autosaveProgress: Status;
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
         markdownProgress: Status.UNLOADED,
         htmlProgress: Status.UNLOADED,
         htmlSidebarProgress: Status.UNLOADED,
         autosaveProgress: Status.LOADED
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

   private onSetHtmlProgress = (d: {progress: Status}) => {
      this.update(x => x.htmlProgress = d.progress);
   };

   private onSetHtmlSidebarProgress = (d: {progress: Status}) => {
      this.update(x => x.htmlSidebarProgress = d.progress);
   };

   private onSetMarkdownProgress = (d: {progress: Status}) => {
      this.update(x => x.markdownProgress = d.progress);
   };

   private onSetAutosaveProgress = (d: {progress: Status}) => {
      this.update(x => x.autosaveProgress = d.progress);
   };

   actions = {
      setEditing: Action("setEditing", this.onSetEditing),
      setMarkdown: Action("setMarkdown", this.onSetMarkdown),
      setHtml: Action("setHtml", this.onSetHtml),
      setSidebarHtml: Action("setSidebarHtml", this.onSetSidebarHtml),
      setHtmlProgress: Action("setHtmlProgress", this.onSetHtmlProgress),
      setHtmlSidebarProgress: Action("setHtmlSidebarProgress", this.onSetHtmlSidebarProgress),
      setMarkdownProgress: Action("setMarkdownProgress", this.onSetMarkdownProgress),
      setAutosaveProgress: Action("setAutosaveProgress", this.onSetAutosaveProgress),
   };
}

export const AppStore = new AppStoreClass(); 