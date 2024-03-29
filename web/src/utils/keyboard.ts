const keymap:{ [id:number]:string[] } = {
   8: ['Backspace', 'Backspace'],
   9: ['Tab', 'Tab'],

   12: ['Clear', 'Clear'],
   13: ['Enter', 'Enter'],

   16: ['Shift', 'Shift'],
   17: ['Control', 'Control'],
   18: ['Alt', 'Alt'],

   20: ['CapsLock', 'CapsLock'],

   27: ['Escape', 'Escape'],

   32: [' ', ' '],
   33: ['PageUp', 'PageUp'],
   34: ['PageDown', 'PageDown'],
   35: ['End', 'End'],
   36: ['Home', 'Home'],
   37: ['ArrowLeft', 'ArrowLeft'],
   38: ['ArrowUp', 'ArrowUp'],
   39: ['ArrowRight', 'ArrowRight'],
   40: ['ArrowDown', 'ArrowDown'],

   46: ['Delete', 'Delete'],

   48: ['0', ')'],
   49: ['1', '!'],
   50: ['2', '@'],
   51: ['3', '#'],
   52: ['4', '$'],
   53: ['5', '%'],
   54: ['6', '^'],
   55: ['7', '&'],
   56: ['8', '*'],
   57: ['9', '('],

   65: ['a', 'A'],
   66: ['b', 'B'],
   67: ['c', 'C'],
   68: ['d', 'D'],
   69: ['e', 'E'],
   70: ['f', 'F'],
   71: ['g', 'G'],
   72: ['h', 'H'],
   73: ['i', 'I'],
   74: ['j', 'J'],
   75: ['k', 'K'],
   76: ['l', 'L'],
   77: ['m', 'M'],
   78: ['n', 'N'],
   79: ['o', 'O'],
   80: ['p', 'P'],
   81: ['q', 'Q'],
   82: ['r', 'R'],
   83: ['s', 'S'],
   84: ['t', 'T'],
   85: ['u', 'U'],
   86: ['v', 'V'],
   87: ['w', 'W'],
   88: ['x', 'X'],
   89: ['y', 'Y'],
   90: ['z', 'Z'],
   91: ['Meta', 'Meta'],

   106: ['*', '*'],
   107: ['+', '+'],

   109: ['-', '-'],
   110: ['.', '.'],
   111: ['/', '/'],
   112: ['F1', 'F1'],
   113: ['F2', 'F2'],
   114: ['F3', 'F3'],
   115: ['F4', 'F4'],
   116: ['F5', 'F5'],
   117: ['F6', 'F6'],
   118: ['F7', 'F7'],
   119: ['F8', 'F8'],
   120: ['F9', 'F9'],
   121: ['F10', 'F10'],
   122: ['F11', 'F11'],
   123: ['F12', 'F12'],
   124: ['F13', 'F13'],
   125: ['F14', 'F14'],
   126: ['F15', 'F15'],
   127: ['F16', 'F16'],
   128: ['F17', 'F17'],
   129: ['F18', 'F18'],
   130: ['F19', 'F19'],

   186: [';', ':'],
   187: ['=', '+'],
   188: [',', '<'],
   189: ['-', '_'],
   190: ['.', '>'],
   191: ['/', '?'],
   192: ['`', '~'],

   219: ['[', '{'],
   220: ['\\', '|'],
   221: [']', '}'],
   222: ['\'', '"'],

};

export function getKey(e:KeyboardEvent) {
   let key:string = '';
   if (e.key && e.key !== 'Unidentified') {
      key = e.key;
   } else {
      key = e.shiftKey ? keymap[e.which][1] : keymap[e.which][0];
   }
   if (e.altKey) key = "Alt-" + key;
   if (e.ctrlKey) key = "Control-" + key;
   if (e.metaKey) key = "Meta-" + key;
   if (e.shiftKey && key == "Enter") key = "Shift-Enter";
   return key;
}

export function isPrintableKey(key:string) {
   if (key.indexOf("Alt") >= 0) return false;
   if (key.indexOf("Control") >= 0) return false;
   if (key.indexOf("Meta") >= 0) return false;
   if (nonPrintableKeys.indexOf(key) >= 0) return false;
   return true;
}

export const nonPrintableKeys = [
   'Backspace', 'Delete', 
   'Tab', 'Clear', 'Enter', 
   'Shift', 'Control', 'Alt', 'Meta',
   'CapsLock', 'Escape', 
   'PageUp', 'PageDown', 'End', 'Home', 'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown',
   'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19'
];
