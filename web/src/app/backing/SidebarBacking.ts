import {Action, Store} from "../../utils/flux.js";
import {AppStore, AppStoreActions, appSave} from "./AppBacking.js";

export interface Icon {
   label:string;
   image:string;
   when?:string[];
   opacity?:number;
   action?:string;
}

export interface HtmlChunk {
   html:string;
   wrapperStyle?:any;
   when?:string[];
}

export interface SidebarData {
   items: (Icon|HtmlChunk)[]
}

export const SidebarStore = new Store("SidebarStore", { 
   text: "",
   sidebar: null as SidebarData|null,
   compactMode: localStorage.getItem("compactMode") == "true"
});

export class SidebarStoreActions {
   static setCompactMode = Action("actionSetCompactMode", (arg:{compact:boolean}) => {
      SidebarStore.set("compactMode", arg.compact);
      localStorage.setItem("compactMode", arg.compact ? "true" : "false");
   });

   static sidebarTextChanged = Action("actionSidebarTextChanged", (arg:{text:string}) => {
      SidebarStore.set("text", arg.text);
      try {
         AppStore.set("netStatus", "net-dirty");
         appSave(JSON.parse(arg.text));
      } catch (e) {
         console.warn(e);
      }
   });
}


AppStoreActions.setSidebar.add((arg:{sidebar:SidebarData}) => {
   SidebarStore.set("sidebar", arg.sidebar);
})

AppStoreActions.updateDownloaded.add((arg) => {
   if (AppStore.data.content.type == "sidebar" && !arg.viaSave) {
      SidebarStore.set("text", JSON.stringify(AppStore.data.content, null, 3));
   }
});

export function isHtmlChunk(chunk:HtmlChunk|Icon): chunk is HtmlChunk {
   return (chunk as any).hasOwnProperty("html");
}