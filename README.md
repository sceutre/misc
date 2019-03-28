
## misc documentation server

A markdown wiki run via a http server written in C.

### usage

1. Unzip distribution somewhere
2. Doubleclick exe (see options below)
3. Visit http://localhost:7575/ or choose Open from the handy tray icon
4. To exit choose "Exit" from the handy tray icon

### markdown syntax

[CommonMark](https://commonmark.org/) with these extensions:
* [Tables](https://github.com/mity/md4c/wiki/Markdown-Syntax%3A-Tables)
* [Task lists](https://github.com/mity/md4c/wiki/Markdown-Syntax%3A-Task-Lists)
* [Strikethrough](https://github.com/mity/md4c/wiki/Markdown-Syntax%3A-Strikethrough) via `~text~`
* indenting doesn't define code blocks (use fencing)
* html tags beginning with capital letters like `<Foo>` are interpreted as local links to page Foo

### command line syntax

| option      | description                                               |
|-------------|-----------------------------------------------------------|
| --port NUM  | the port to use (default 7575)                            |
| --out DIR   | place to put data files (default {the exe location}/data) |
| --localhost host | host to use inplace of localhost when choosing open |
| --debug NUM | dev mode: 0=prod, 1=debug, 2=trace, 3=test (default 0)    |

In addition ot the command line you can specify the options in a MISC_DOC_OPTS 
environment variable.  If both the env variable and command args are specified, the args win.

### credits

* [md4c](https://github.com/mity/md4c) - excellent C markdown library 
* [stetchy buffer](https://github.com/nothings/stb/blob/master/stretchy_buffer.h) - dynamic arrays for C
* [log.c](https://github.com/rxi/log.c) - logging library for C
* [react](https://reactjs.org/) - wonderful UI framework
* [typescript](https://www.typescriptlang.org/) - wonderful extension to js
* [rollupjs](https://rollupjs.org/guide/en) - js bundling for prod (dev builds use browser modules)
* [clean-css](https://github.com/jakubpawlowicz/clean-css-cli) - css bundling and minifying