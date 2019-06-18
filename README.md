
## misc documentation server

A markdown wiki run via a http server written in C.  Windows-only right now.

### sales pitch

I wanted a place to store notes, and wanted to use Markdown.  I wanted it
to run on startup and be a click away, with a tiny memory footprint.

So "misc" is a wiki that runs in a web-browser.  The server side is a C program containing an 
embedded http server.  The UI runs in a browser which is a 
bit of cheating on my desire for low memory, but I feel the marginal impact of
one more tab is small.

On startup it sits in the tray and takes a couple megabytes of memory.  Double-click
on it and it opens a tab to its homepage.  All pages are stored as markdown files and rendered to HTML on the fly as accessed. To that base I added a couple more quality of life
things since I do use it every day:

1. Built in dark theme (click on the logo lower left to toggle).
2. Auto-saves every couple seconds, and auto-polls and loads changes.  Combined they keep
   multiple tabs or on multiple machines in sync.  (it doesn't save old versions though so 
   be careful out there)
3. It supports the task lists extension to markdown, and in addition to rendering them you
   can click on them to toggle. I find checking
   things off and seeing them crossed out extremely satisfying.
4. Tab in the editor inserts spaces to align on three-space boundary, like god intended.

Like any wiki to make a new page just visit it and choose to edit.  There is one special
page called Sidebar which gets rendered as the sidebar.

### usage

1. Unzip distribution somewhere
2. Doubleclick exe (see command options below)
3. Visit http://localhost:7575/ or doubleclick or click and choose Open from the handy tray icon
4. To exit choose "Exit" from the handy tray icon

Don't open it up on the internet.  The http server has no known vulnerabilities because
it has not been tested for any.  I run copies on all my machines (well two machines) and have 
them all write to a Dropbox folder.

### markdown syntax

[CommonMark](https://commonmark.org/) with these extensions:
* [Tables](https://github.com/mity/md4c/wiki/Markdown-Syntax%3A-Tables)
* [Task lists](https://github.com/mity/md4c/wiki/Markdown-Syntax%3A-Task-Lists)
* [Strikethrough](https://github.com/mity/md4c/wiki/Markdown-Syntax%3A-Strikethrough) via `~text~`
* indenting doesn't define code blocks (use fencing)
* html tags beginning with capital letters like `<Foo>` are interpreted as local links to page Foo
* Note that like the original, but unlike many places that accept Markdown, it supports putting random
  HTML in the document without restriction.  You should resist the urge to insert malicious HTML for yourself.

### command line syntax

You can specify these options on the commandline or in a MISC_DOC_OPTS environment variable

| option      | description                                               |
|-------------|-----------------------------------------------------------|
| --port NUM  | the port to use (default 7575)                            |
| --out DIR   | place to put data files (default {the exe location}/data) |
| --localhost host | host to use inplace of localhost when choosing open |
| --debug NUM | dev mode: 0=prod, 1=debug, 2=trace, 3=test (default 0)    |
| --ext name1;dir1;name2;dir2;... | serve static files in dir1 as /-/ext/name1, and so on |

_The `--ext` option doesn't really have any use as far as the program goes, but I thought since I'm running a web server anyways it's nice for some dev stuff to be able to have it serve random folders._

### built upon

* [md4c](https://github.com/mity/md4c) - excellent C markdown library 
* [log.c](https://github.com/rxi/log.c) - single-file logging library for C
* [react](https://reactjs.org/) - UI framework
