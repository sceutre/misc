import {marked} from "../utils/marked.js";
import {emojis} from "../utils/emojis.js";
import {Parser as fParser} from "../utils/hot-formula-parser.js";

interface TableData {
   currentRow: string[];
   rows: string[][],
   align: string[],
   hasForumulas: boolean
}

interface MarkedExtData {
   checkboxIx:number;
   tableData:TableData|null;
   inColumns:boolean;
   init:boolean;
}

const extData:MarkedExtData = {
   checkboxIx:0,
   tableData:null,
   inColumns:false,
   init:false
};

const extRules = {
   emoji: /^:(\w+):/,
   wikilinks: /^\[\[([^\]]+)\]\]/
};

const emojiExt = {
   name: 'emoji',
   level: 'inline',                         // This is an inline-level tokenizer
   start(src: string) {return src.indexOf(':');}, // Hint to Marked.js to stop and check for a match
   tokenizer(src: string, tokens: any[]) {
      const match = extRules.emoji.exec(src);
      if (match && emojis[match[1]]) {
         return {                             // Token to generate
            type: 'emoji',                     // Should match "name" above
            raw: match[0],                     // Text to consume from the source
            emoji: match[1]                    // Additional custom properties
         };
      }
   },
   renderer(token: any) {
      return emojis[token.emoji];
   }
};

// [[LinkPage|some link text]] -> <a href=LinkPage>some link text</a>
// [[image.png]] -> <img src=image.png> 
// [[image.png|100x200]] -> <img src=image.png width=100 height=200>
// [[image.png|100x?]] -> <img src=image.png width=100>
// [[image.png|?x200]] -> <img src=image.png height=200>
// [[image.png|50%]] -> <img src=image.png width="50%">
 
const wikiExt = {
   name: 'wikilinks',
   level: 'inline',                               // This is an inline-level tokenizer
   start(src: string) {return src.indexOf('[');}, // Hint to Marked.js to stop and check for a match
   tokenizer(src: string, tokens: any[]) {
      const match = extRules.wikilinks.exec(src);
      if (match) {
         let link = match[1];
         let array = link.split("|");
         let pageName = array[0].trim();
         let linkTitle = array.length > 1 ? array[1].trim() : pageName;
         let ext = "";
         let ix = pageName.lastIndexOf(".");
         if (ix > 0) {
            let ix2 = pageName.indexOf(" ", ix);
            if (ix2 < 0) ext = pageName.substring(ix+1);
         }
         return {                              // Token to generate
            type: 'wikilinks',                 // Should match "name" above
            raw: match[0],                     // Text to consume from the source
            linkTitle, pageName, ext           // Additional custom properties
         };
      }
   },
   renderer(token: any) {
      let ext = token.ext.toLowerCase();
      let pageName = token.pageName;
      let linkTitle = token.linkTitle;
      if (ext == "png" || ext == "jpg" || ext == "jpeg" || ext == "gif" || ext == "svg") {
         let w = ""; let h = "";
         if (pageName !== linkTitle) {
            let parts = linkTitle.split("x");
            if (parts.length == 2) {
               w = parts[0] == "?" ? "" : ("width="+parts[0]);
               h = parts[1] == "?" ? "" : ("height="+parts[1]);
            } else if (parts.length == 1 && parts[0].endsWith("%")) {
               w = "width=\"" + parts[0] + "\"";
            }
         }
         return `<a href="/-/img/${pageName}"><img src="/-/img/${pageName}" ${w} ${h}></a>`;
      }
      return `<a href="${pageName}">${linkTitle}</a>`;
   }
};

export function markedExtToHtml(text:string) {
   init();
   extData.checkboxIx = 0;
   extData.inColumns = false;
   extData.tableData = null;
   let s = marked(text);
   if (extData.inColumns) {
      s += "\n</div></div>\n";
      extData.inColumns = false;
   }
   return s;
}

function init() {
   if (!extData.init) {
      extData.init = true;
      marked.use({
         gfm: true,
         breaks: false,
         smartLists: true
      });
      marked.use({extensions: [emojiExt, wikiExt]});
      marked.use({
         renderer: {
            listitem(text, task, checked) {
               if (task) return `<li data-ix="${extData.checkboxIx++}" class="task-list-item">${text}</li>\n`;
               else return `<li>${text}</li>\n`;
            },
            checkbox(checked) {
               return `<i class="icon-check${checked ? "on" : "off"}"></i> `;
            },
            tablecell(content, flags) {
               content = content.trim();
               if (!extData.tableData) extData.tableData = { rows: [], align: [], currentRow: [], hasForumulas: false }
               extData.tableData.currentRow.push(content)
               if (flags.header) extData.tableData.align.push(flags.align || "");
               if (!extData.tableData.hasForumulas) extData.tableData.hasForumulas = content.startsWith("=");
               return "";
            },
            tablerow() {
               extData.tableData!.rows.push(extData.tableData!.currentRow);
               extData.tableData!.currentRow = []
               return "";
            },
            table() {
               if (extData.tableData) {
                  spreadsheetify();
                  if (extData.tableData.rows.length == 1) {
                     return `
                     <table>
                        <thead>
                           ${tablerow(extData.tableData.rows[0], 'th')}
                        </thead>
                     </table>`
                  } 
                  let s = `
                  <table>
                     <thead>
                        ${tablerow(extData.tableData.rows.shift(), 'th')}
                     </thead>
                     <tbody>
                        ${extData.tableData.rows.map(r => tablerow(r, 'td')).join("\n      ")}
                     </tbody>
                  </table>`;
                  extData.tableData = null;
                  return s;
               }
               return "";
            },
            html(htmlText) {
               let h = htmlText.trim();
               if ((h.startsWith("<column-end") || h.startsWith("<column-off") || h.startsWith("</column")) && extData.inColumns) {
                  extData.inColumns = false;
                  return "\n</div></div>\n";
               }
               if (h.startsWith("<column")) {
                  let args = parseMyHtml(h);
                  let s = "";
                  if (!extData.inColumns) {
                     let gap = typeof args["gap"] == "undefined" ? "50px" : args["gap"] + "px";
                     let width = (args["width"] ? args["width"] : "1");
                     s += `<div style="display:flex;gap:${gap}"><div style="flex:${width};">\n`;
                     extData.inColumns = true;
                  } else {
                     let width = (args["width"] ? args["width"] : "1");
                     s += `</div><div style="flex:${width};">`
                  }
                  return s;
               }
               if (h.startsWith("<numberformat")) {
                  let args = parseMyHtml(h);
                  if (typeof args["commas"] != "undefined") NUMBER_FORMAT.commas = args["commas"] == "true";
                  if (typeof args["decimals"] != "undefined") NUMBER_FORMAT.decimals = +args["decimals"]
                  if (typeof args["negbrackets"] != "undefined") NUMBER_FORMAT.negbrackets = args["negbrackets"] == "true";
                  if (typeof args["prefix"] != "undefined") NUMBER_FORMAT.prefix = args["prefix"].replace("dollar", "$");
                  return "";
               }
               return htmlText;
            }
         }
      });
   }
}

function tablerow(data:string[]|undefined, td:string) {
   if (data) {
      return `<tr>${data.map((c,i) => {
         let style = "";
         let align = extData.tableData!.align[i];
         //console.log(align,i);
         if (align=="right")  { style = ' style="text-align:right"'; }
         if (align=="center") { style = ' style="text-align:center"'; }
         return `<${td}${style}>${c}</${td}>`
      }).join("")}</tr>`;
   }
   return "";
}

function spreadsheetify() {
   let values:any[][] = [];
   let parser = new fParser();
   let tableData = extData.tableData;
   if (tableData && tableData.hasForumulas) {
      parser.on('callCellValue', function(cellCoord:any, done:any) {
         let i:number = cellCoord.row.index;
         let j:number = cellCoord.column.index;
         done(getValue(i,j));
      });
      parser.on('callRangeValue', function(startCellCoord:any, endCellCoord:any, done:any) {
         let fragment:any[] = [];
         for (let i:number = startCellCoord.row.index; i <= endCellCoord.row.index; i++) {
           let colFragment:any[] = [];
           for (let j:number = startCellCoord.column.index; j <= endCellCoord.column.index; j++) {
             colFragment.push(getValue(i,j));
           }
           fragment.push(colFragment);
         }
         done(fragment);
      });
      for (let i = 0; i < tableData.rows.length; i++) {
         values.push(Array(tableData.rows[i].length).fill(undefined));
      }
      for (let i = 0; i < tableData.rows.length; i++) {
         for (let j = 0; j < tableData.rows[i].length; j++) {
            let s = tableData.rows[i][j];
            if (s.startsWith("=")) {
               getValue(i,j);
            }
         }
      }
   }

   function getValue(i:number, j:number) {
      let v = values[i][j];
      if (v === null) throw ("circular formula reference");
      if (typeof v != "undefined") return v;
      let s = tableData!.rows[i][j];
      if (s.startsWith("=")) {
         values[i][j] = null;
         let obj = parser.parse(s.substring(1));
         values[i][j] = obj.error ? obj.error : obj.result;
         tableData!.rows[i][j] = formatValue(values[i][j]);
      } else {
         let commaless = s.replace(",", "");
         if (commaless.match(/^\d*\.?\d*$/)) {
            values[i][j] = parseFloat(commaless);
            tableData!.rows[i][j] = formatValue(values[i][j]);
         } else {
            values[i][j] = s;
         }

      }
      return values[i][j];
   }

   function convertValue(s:string) {
      let commaless = s.replace(",", "");
      if (commaless.match(/^\d*\.?\d*$/)) {
         return parseFloat(commaless);
      }
      return s;
   }

   function formatValue(val:any) {
      if (typeof val == "number") {
         let numstr = Number(Math.abs(val)).toFixed(NUMBER_FORMAT.decimals);
         if (NUMBER_FORMAT.commas) {
            numstr = numstr.replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
         }
         numstr = NUMBER_FORMAT.prefix + numstr;
         if (val < 0) {
            if (NUMBER_FORMAT.negbrackets) {
               numstr = "(" + numstr +")";
            } else {
               numstr = "-" + numstr;
            }
         }
         return numstr;
      }
      return "" + val;
   }
}

const NUMBER_FORMAT = {
   commas: true,
   decimals: 0,
   negbrackets: true,
   prefix: ""
}

function parseMyHtml(html:string) {
   let parts = html.substring(1, html.length-1).split("-");
   let results:{[k:string] : string} = {};
   for (let i = 1; i+1 < parts.length; i += 2) {
      results[parts[i]] = parts[i+1];
   }
   return results;
}