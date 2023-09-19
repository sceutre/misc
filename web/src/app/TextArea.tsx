import {useRef} from "preact/hooks";
import {Action} from "../utils/flux.js";

interface TextAreaProps {
   onChange: Action<{text:string}>;
   onSave?: Action<void>;
   value: string;
} 

const SPACES = [ "", " ", "  ", "   "];
const KEYCODE_ENTER = 13;
const KEYCODE_TAB = 9;
const KEYCODE_Y = 89;
const KEYCODE_Z = 90;
const KEYCODE_D = 68;
const KEYCODE_S = 83;
const KEYCODE_LEFTBRACKET = 219;
const KEYCODE_ESCAPE = 27;
const spacesRegex = /[ ]+(?:[*-] )?|[*-] /g;
const isWindows = /Win/i.test(window.navigator.platform);
const isMacLike = /(Mac|iPhone|iPod|iPad)/i.test(window.navigator.platform);

function lineStarts(s:string, start:number, end:number):number[] {
   let arr:number[] = [];
   let ix = s.lastIndexOf('\n', start-1) + 1;
   arr.push(ix);
   while (true) {
      ix = s.indexOf('\n', ix);
      ix++;
      if (ix <= 0 || ix >= end) break;
      arr.push(ix);
   }
   return arr;
}

function hasSpaces(s:string, ixs:number[], num:number): boolean {
   let sp = SPACES[num];
   for (let ix of ixs) {
      if (!s.startsWith(sp, ix)) return false;
   }
   return true;
}

function trimSpaces(s:string, ixs:number[], num: number):string {
   for (let i = ixs.length - 1; i >= 0; i--) {
      let ix = ixs[i];
      s = s.substring(0, ix) + s.substring(ix + num); 
   }
   return s;
}

function addSpaces(s:string, ixs:number[], num: number):string {
   for (let i = ixs.length - 1; i >= 0; i--) {
      let ix = ixs[i];
      s = s.substring(0, ix) + SPACES[num] + s.substring(ix); 
   }
   return s;
}

interface History {
   states: {
      text:string;
      beforeStart:number;
      beforeEnd:number;
      afterStart:number;
      afterEnd:number;
   }[];
   ix:number;
   sel1:number;
   sel2:number;
}

type ApplyType = "override" | "default" | "undo" | "redo";

let prevScrollPos = 0;
let scrollCorrection = false;

export function TextArea(props:TextAreaProps) {
   const textArea = useRef<HTMLTextAreaElement>(null);
   const history = useRef<History>({ states: [{text: props.value, beforeStart:0, beforeEnd: 0, afterStart: 0, afterEnd: 0}], ix: 0, sel1:0, sel2:0});

   function applyEdits(text:string, selectionStart:number, selectionEnd:number, type:ApplyType) {
      props.onChange({text});
      if (type != "default" && textArea.current) {
        textArea.current.value = text;
        textArea.current.selectionStart = selectionStart;
        textArea.current.selectionEnd = selectionEnd;
      }
      if (type != "undo" && type != "redo") {
         const { ix, states } = history.current;
         states.splice(ix + 1, states.length - ix - 1, {text, beforeStart: history.current.sel1, beforeEnd: history.current.sel2, afterStart: selectionStart, afterEnd: selectionEnd});
         history.current.ix++;
      }
   }

   function onKeyDown(e:KeyboardEvent) {
      let target = e.currentTarget as HTMLTextAreaElement;
      if (e.keyCode === KEYCODE_ESCAPE) {
         target.blur();
      }
      history.current.sel1 = target.selectionStart;
      history.current.sel2 = target.selectionEnd;
      if (isWindows) {
         if (e.keyCode === KEYCODE_TAB) doTab(e);
         else if (e.keyCode === KEYCODE_Z && e.ctrlKey && !e.altKey && !e.shiftKey) doUndo(e);
         else if (e.keyCode === KEYCODE_Y && e.ctrlKey && !e.altKey && !e.shiftKey) doRedo(e);
         else if (e.keyCode === KEYCODE_D && e.ctrlKey && !e.altKey && !e.shiftKey) doDeleteLine(e);
         else if (e.keyCode === KEYCODE_S && e.ctrlKey && !e.altKey && !e.shiftKey) doSave(e);
      } else if (isMacLike) {
         if (e.keyCode === KEYCODE_TAB) doTab(e);
         else if (e.keyCode === KEYCODE_Z && e.metaKey && !e.shiftKey && !e.altKey) doUndo(e);
         else if (e.keyCode === KEYCODE_Z && e.metaKey && e.shiftKey && !e.altKey) doRedo(e);
         else if (e.keyCode === KEYCODE_D && e.metaKey && !e.altKey && !e.shiftKey) doDeleteLine(e);
         else if (e.keyCode === KEYCODE_S && e.metaKey && !e.altKey && !e.shiftKey) doSave(e);
      } else {
         if (e.keyCode === KEYCODE_TAB) doTab(e);
         else if (e.keyCode === KEYCODE_Z && e.ctrlKey && !e.altKey && !e.shiftKey) doUndo(e);
         else if (e.keyCode === KEYCODE_Z && e.ctrlKey && !e.altKey && e.shiftKey) doRedo(e);
         else if (e.keyCode === KEYCODE_D && e.ctrlKey && !e.altKey && !e.shiftKey) doDeleteLine(e);
         else if (e.keyCode === KEYCODE_S && e.ctrlKey && !e.altKey && !e.shiftKey) doSave(e);
      }
   }

   function doUndo(e:KeyboardEvent) {
      e.preventDefault();
      const { ix, states } = history.current;
      if (ix > 0) {
         history.current.ix--;
         let o = states[ix];
         let r = states[ix - 1];
         applyEdits(r.text, o.beforeStart, o.beforeEnd, "undo");
      }
   }

   function doRedo(e:KeyboardEvent) {
      e.preventDefault();
      const { ix, states } = history.current;
      if (ix < states.length - 1) {
         history.current.ix++;
         let r = states[ix + 1];
         applyEdits(r.text, r.afterStart, r.afterEnd, "redo");
      }
   }

   function doDeleteLine(e:KeyboardEvent) {
      const { selectionStart, selectionEnd } = e.currentTarget as HTMLTextAreaElement;
      if (selectionStart == selectionEnd) {
         e.preventDefault();
         let s = props.value;
         let ix1 = s.lastIndexOf('\n', selectionStart-1) + 1;
         let ix2 = s.indexOf('\n', selectionStart);
         let lineIx = selectionStart - ix1;
         let newText = (ix1 == 0 ? "" : s.substring(0, ix1)) + (ix2 < 0 ? "" : s.substring(ix2+1));
         let ix3 = newText.indexOf('\n', ix1);
         console.log({ix1, ix2, ix3, lineIx, selectionStart})
         applyEdits(newText, Math.min(ix1+lineIx, ix3), Math.min(ix1+lineIx, ix3), "override");
      }
   }

   function doTab(e:KeyboardEvent) {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.currentTarget as HTMLTextAreaElement;
      let s = props.value;
      let lines = lineStarts(s, selectionStart, selectionEnd);
      let lineIx = selectionStart - lines[0];
      let count = 3;
      if (e.shiftKey) {
         // backward
         if (lines.length == 1) {
            // special case, untab at selection start to previous tab stop
            count = lineIx % 3 == 0 ? 3 : lineIx % 3;
            lines = [selectionStart - count];
         } 
         if (hasSpaces(s, lines, count)) {
            s = trimSpaces(s, lines, count);
            let fromStart = Math.min(count,lineIx);
            applyEdits(s, selectionStart - fromStart, selectionEnd - (count * lines.length), "override")
         }
      } else {
         // forward
         if (lines.length == 1) {
            // special case, tab at selection start to next tab stop
            count = 3 - (lineIx % 3);
            lines = [selectionStart];
         }
         s = addSpaces(s, lines, count);
         applyEdits(s, selectionStart + count, selectionEnd + (count * lines.length), "override");
      }
   }

   function doSave(e:KeyboardEvent) {
      e.preventDefault();
      props.onSave?.();
   }

   function onChange(e:any) {
      applyEdits(e.currentTarget.value, e.currentTarget.selectionStart, e.currentTarget.selectionEnd, "default");
   }


   function onScroll() {
      //console.log("SRF onScroll1 " + scrollCorrection + "/" + prevScrollPos + "/" + textArea.current?.scrollTop);
      if (textArea.current) {
         if (scrollCorrection) {
            scrollCorrection = false;
            textArea.current.scrollTop = prevScrollPos;
            //console.log("SRF onScroll2 " + scrollCorrection + "/" + prevScrollPos + "/" + textArea.current?.scrollTop);
         } else {
            prevScrollPos = textArea.current.scrollTop;
            //console.log("SRF onScroll3 " + scrollCorrection + "/" + prevScrollPos + "/" + textArea.current?.scrollTop);
         }
      }
   }

   function onInput() {
      //console.log("SRF onInputa " + scrollCorrection + "/" + prevScrollPos + "/" + textArea.current?.scrollTop);
      scrollCorrection = true;
   }

   return <textarea ref={textArea} onKeyDown={onKeyDown} onChange={onChange} onInput={onInput} onScroll={onScroll} value={props.value} />;
 }
