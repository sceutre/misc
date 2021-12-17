import {Store,Action} from "../../utils/flux.js";
import {debounce, log$, path} from "../../utils/utils.js";

export enum Mode {
   UNLOADED,
   MARKDOWN,
   MARKDOWN_EDIT,
   MINDMAP,
   DRAWING,
   UPLOAD,
   CONTENT_CHOOSER,
   UNLOCK
}

export type Theme = "dark" | "light";
export type Content = "unknown" | "markdown" | "mindmap" | "drawing" | "encrypted" | "sidebar";
export type NetStatus = "net-waiting" | "net-clean" | "net-dirty";
type Downloaded = { data:any, type:Content };

interface AppData {
   downloaded: string|null;
   content: Content;
   payload: any;
   password: string;
   theme: Theme;
   netStatus: NetStatus;
}

export const AppStore = new Store("AppStore", {
   downloaded: null,
   content: "unknown",
   payload: {},
   password: "",
   theme: isDarkTheme() ? "dark" : "light",
   netStatus: "net-clean"
} as AppData);

export const actionToggleDark =  Action("toggleDark", () => {
   toggleDarkTheme();
   AppStore.set("theme", isDarkTheme() ? "dark" : "light");
});

export const actionUnhandledKey =  Action("unhandledKey", (arg: {ev:KeyboardEvent}) => {});

export const actionUpdateDownloaded = Action("setData", (arg: Downloaded) => {
   AppStore.update(x => {
      x.downloaded = arg.data;
      if (x.content == "encrypted") {
         let d = decrypt(x.downloaded!, x.password);
         x.payload = d.data;
         x.content = d.type;
      } else {
         x.payload = arg.data;
         x.content = arg.type;
      }
   });
});

// just for others to hook into
export const actionSetSidebar = Action("setSidebar", (arg:{sidebar:any}) => {});

export const actionSaved = Action("saveDone", () => {
   AppStore.set("netStatus", "net-clean")
});

export const actionDirty = Action("becomeDirty", () => {
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
      let resp = await fetch("/-/md/" + path());
      if (resp.ok) {
         let text = await resp.text();
         let obj = toObject(text);
         if (AppStore.data.downloaded != obj.data) actionUpdateDownloaded(obj);
      } else {
         actionUpdateDownloaded({data: "", type: "unknown"});
      }
      resp = await fetch("/-/md/sidebar");
      if (resp.ok) {
         let text = await resp.text();
         let obj = JSON.parse(text);
         actionSetSidebar({sidebar: obj});
      }
   }
}

export const [appSave, appSaveNow] = debounce(appSaveImpl, 3000);

function appSaveImpl(payload:any, type:Content) {
   log$(save());

   async function save() {
      let data = encode(payload, type);
      AppStore.set("netStatus", "net-waiting");
      let resp = await fetch("-/md/" + path(), { method: "POST", body: data });
      if (resp.ok) {
         actionUpdateDownloaded({data:payload, type});
         actionSaved();
      } else {
         appSave(payload, type);
      }
   }
}

function toObject(text:string):Downloaded {
   if (path() == "Sidebar") return { data: text, type: "sidebar" };
   if (text.startsWith("{")) return JSON.parse(text);
   return { data: text, type: "markdown"};
}

function decrypt(cipherText:string, password:string):Downloaded {
   return { data: "", type: "unknown" };   
}

function encode(payload:any, type:Content) {
   if (path() == "Sidebar" || type == "markdown" && !payload.startsWith("{") && !AppStore.data.password) {
      // sidebar is special case, and for plaintext markdown leave it as raw markdown so it's easier to view outside of wiki
      return payload;
   }
   let d:Downloaded = { data: payload, type };
   let encoded = JSON.stringify(d);
   if (AppStore.data.password) {
   }
   return encoded;
}

export const GLOBAL_KEY_HANDLERS:{(ev:KeyboardEvent):void}[] = [];