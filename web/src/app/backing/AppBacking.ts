import {Store,Action} from "../../utils/flux.js";
import {log$, path} from "../../utils/utils.js";

export type Theme = "dark" | "light";
export type ContentType = "markdown" | "drawing"  | "sidebar" | "empty";
export type NetStatus = "net-waiting" | "net-clean" | "net-dirty";

type Content = ContentMarkdown | ContentDrawing | ContentSidebar | ContentEmpty;

interface ContentMarkdown {
   type: "markdown";
   text: string;
}

interface ContentDrawing {
   type: "drawing";
   [k:string]:any;
}

interface ContentSidebar {
   type: "sidebar";
   [k:string]:any;
}

interface ContentEmpty {
   type: "empty";
}

interface AppData {
   content: Content;
   theme: Theme;
   netStatus: NetStatus;
   raw:string|null;
}

export const AppStore = new Store("AppStore", {
   content: {type:"empty"},
   theme: isDarkTheme() ? "dark" : "light",
   netStatus: "net-clean",
   raw: null
} as AppData);

export const actionToggleDark =  Action("actionToggleDark", () => {
   toggleDarkTheme();
   AppStore.set("theme", isDarkTheme() ? "dark" : "light");
});

export const actionUnhandledKey =  Action("actionUnhandledKey", (arg: {ev:KeyboardEvent}) => {});

export const actionUpdateDownloaded = Action("actionUpdateDownloaded", (arg: {downloaded:Content, viaSave:boolean, raw:string}) => {
   AppStore.update(x => {
      x.content = arg.downloaded;
      x.raw = arg.raw;
   });
});

// just for others to hook into
export const actionSetSidebar = Action("actionSetSidebar", (arg:{sidebar:any}) => {});

export const actionSaved = Action("actionSaved", () => {
   AppStore.set("netStatus", "net-clean")
});

export const actionDirty = Action("actionDirty", () => {
   AppStore.set("netStatus", "net-dirty")
});


function isDarkTheme() {
   let theme = localStorage.getItem("theme");
   if (theme == null) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
   }
   return theme === "dark";
}

function toggleDarkTheme() {
   localStorage.setItem("theme", isDarkTheme() ? "light" : "dark");
}

export function appBeginDownloader() {
   log$(download());
   setInterval(() => log$(download()), 60000);  

   async function download() {
      if ((Date.now() - appSaveTime) < 10000) return;
      let resp = await fetch("/-/md/" + path().filename);
      let text:string = "";
      if (resp.ok) {
         text = await resp.text();
      }
      if (text != AppStore.data.raw) actionUpdateDownloaded({downloaded: toObject(text), viaSave: false, raw: text});
      resp = await fetch("/-/md/sidebar.json");
      if (resp.ok) {
         let text = await resp.text();
         let obj = JSON.parse(text);
         actionSetSidebar({sidebar: obj});
      }
   }
}

let appSaveTimeout:number = 0;
let appSaveTime:number = 0;

export function appSave(content:Content, rightNow?:boolean) {
   AppStore.set("netStatus", "net-dirty");
   appSaveTime = Date.now();
   if (appSaveTimeout) {
      clearTimeout(appSaveTimeout);
      appSaveTimeout = 0;
   }
   if (rightNow) {
      appSaveImpl(content);
   } else {
      appSaveTimeout = window.setTimeout(() => appSaveImpl(content), 700);
   }
}

function appSaveImpl(content:Content) {
   log$(save());

   async function save() {
      let data = encode(content);
      AppStore.set("netStatus", "net-waiting");
      let p = path().filename;
      let resp = await fetch("-/md/" + p, { method: "POST", body: data});
      if (resp.ok) {
         actionUpdateDownloaded({downloaded: content, viaSave: true, raw: data});
         actionSaved();
      }
   }
}

export function appSaveImg(img:ArrayBuffer, filename:string) {
   log$(save());

   async function save() {
      AppStore.set("netStatus", "net-waiting");
      let resp = await fetch("-/img/" + filename, { method: "POST", body: img });
      if (resp.ok) {
         actionSaved();
      }
   }
}

function toObject(text:string):Content {
   let t = text.trim();
   if (t.startsWith("{") && t.endsWith("}")) return JSON.parse(text);
   return { type: "markdown", text };
}

function encode(content:Content) {
   if (content.type == "markdown") {
      // save markdown as raw text so it can be viewed on disk easily
      return content.text;
   }
   return JSON.stringify(content);
}

export const GLOBAL_KEY_HANDLERS:{(ev:KeyboardEvent):void}[] = [];

export function toMarkdown() {
   let content:Content = { type: "markdown", text: "" };
   let text = encode(content);
   actionUpdateDownloaded({downloaded: content, viaSave: false, raw: text});
   appSave(content, true);
}

export function toDrawing() {
   let content:ContentDrawing = { type: "drawing", exportData: "" };
   let text = encode(content);
   actionUpdateDownloaded({downloaded: content, viaSave: false, raw: text});
   appSave(content, true);
}