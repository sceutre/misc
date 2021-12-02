import {Action, Store} from "../../utils/flux";
import {stableStringify} from "../../utils/stringify";
import {actionSetSidebar, actionUpdateDownloaded, appSave, AppStore} from "./AppBacking";

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

export const actionSidebarTextChanged = Action("setSidebarEditingText", (arg:{text:string}) => {
   SidebarStore.set("text", arg.text);
   try {
      let obj = JSON.parse(arg.text);
      AppStore.set("netStatus", "net-dirty");
      appSave(obj, "sidebar");
   } catch (e) {
      console.warn(e);
   }
});

actionSetSidebar.add((arg:{sidebar:SidebarData}) => {
   SidebarStore.set("sidebar", arg.sidebar);
})

actionUpdateDownloaded.add((arg) => {
   if (AppStore.data.content == "sidebar") {
      SidebarStore.set("sidebar", AppStore.data.payload);
      if (stableStringify(JSON.parse(SidebarStore.data.text) != stableStringify(AppStore.data.payload)))
         SidebarStore.set("text", JSON.stringify(AppStore.data.payload, null, 3));
   }
});

export const actionSetCompactMode = Action("setSidebarCompactMode", (arg:{compact:boolean}) => {
   SidebarStore.set("compactMode", arg.compact);
   localStorage.setItem("compactMode", arg.compact ? "true" : "false");
});

export function isHtmlChunk(chunk:HtmlChunk|Icon): chunk is HtmlChunk {
   return (chunk as any).hasOwnProperty("html");
}