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

const wikiExt = {
   name: 'wikilinks',
   level: 'inline',                         // This is an inline-level tokenizer
   start(src: string) {return src.indexOf('[');}, // Hint to Marked.js to stop and check for a match
   tokenizer(src: string, tokens: any[]) {
      const match = extRules.wikilinks.exec(src);
      if (match) {
         let link = match[1];
         let array = link.split("|");
         let linkTitle = array[0];
         let pageName = array.length > 1 ? array[1] : array[0];
         return {                             // Token to generate
            type: 'wikilinks',                 // Should match "name" above
            raw: match[0],                     // Text to consume from the source
            linkTitle, pageName                // Additional custom properties
         };
      }
   },
   renderer(token: any) {
      return `<a href="${token.pageName}">${token.linkTitle}</a>`;
   }
};

export function markedExtToHtml(text:string) {
   init();
   extData.checkboxIx = 0;
   extData.inColumns = false;
   extData.tableData = null;
   let s = marked(text);
   if (extData.inColumns) {
      s += "\n</div>\n";
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
               if (h.startsWith("<column")) {
                  let parts = h.substring(1, h.length - 1).split("-");
                  let arg = parts.length == 1 ? "1" : parts[1].trim();
                  if (arg == "end") {
                     if (extData.inColumns) {
                        extData.inColumns = false;
                        return "</div></div>";
                     }
                     return "";
                  }
                  let s = "";
                  if (extData.inColumns) {
                     s += '</div>';
                  } else {
                     extData.inColumns = true;
                     s += '<div style="display:flex;">\n';
                  }
                  s += '<div style="flex:' + arg + ';">';
                  return s;
               }
               return htmlText;
            }
         }
      });
   }
}

function tablerow(data:string[]|undefined, td:string) {
   if (data) return `<tr>${data.map(c => `<${td}>${c}</${td}>`).join("")}</tr>`;
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
         values[i][j] = convertValue(s);
      }
      return values[i][j];
   }

   function convertValue(s:string) {
      if (s.match(/^\d*\.?\d*$/)) {
         return parseFloat(s);
      }
      return s;
   }

   function formatValue(val:any) {
      return "" + val;
   }
}
