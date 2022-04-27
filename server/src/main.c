#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <stdarg.h>
#include <sys/stat.h>
#include "utils/utils.h"
#include "utils/list.h"
#include "utils/log.h"
#include "utils/bytearray.h"
#include "utils/concurrency.h"
#include "utils/win.h"
#include "http/web.h"
#include "http/files.h"
#include "tests/tests.h"
#include "markdown/md4c-html.h"
#include "http/mime.h"

#define TOOLTIP "Misc documentation server - built " __DATE__ 

#define PARSER_FLAGS (MD_FLAG_STRIKETHROUGH | MD_FLAG_TABLES | MD_FLAG_NOINDENTEDCODEBLOCKS | MD_FLAG_TASKLISTS | MD_FLAG_WIKILINKS | MD_FLAG_UNDERLINE)
#define RENDER_FLAGS 0

#define FILE_MD 1
#define FILE_UPLOAD 2

#define M_PROD 0
#define M_DEBUG 1
#define M_TRACE 2

static char *dataRoot;
static char *srcRoot;
static char *localhost;
static int debugMode;
static int port;

static char *normalizedPath(const char *dir, char *file, const char *ext) {
   char *p = file;
   while (*(++p))
      if (!isalnum(*p)) *p = '_';
   return t_printf("%s/%s%s%s", dir, file, ext ? "." : "", ext ? ext : "");
}

static char *hPath(char *p, ...) {
   char SEP = win_fileSeperator();
   int len = strlen(p);
   va_list args;
   va_start(args, p);
   while (true) {
      char *s = va_arg(args, char*);
      if (s == NULL) break;
      len += strlen(s) + 1;
   }
   va_end(args);
   log_trace("len is %d", len);
   
   char *res = malloc(len+1);
   int i = 0;
   int n;
   n = strlen(p); 
   memcpy(res + i, p, n);
   i += n;
   va_start(args, p);
   while (true) {
      char *s = va_arg(args, char*);
      if (s == NULL) break;
      n = strlen(s); 
      res[i] = SEP;
      memcpy(res + i + 1, s, n);
      i += n + 1;
   }
   va_end(args);
   res[i] = 0;
   log_trace("returning %s - %d", res, i);
   return res;
}

static void saveMD(const char *text, unsigned int size, void *userdata) {
   HttpContext ctx = userdata;
   bytearray_append_all(ctx->responseBody, text, size);
}

static bool markdownToHtml(HttpContext ctx, void *arg) {
   Bytearray input = ctx->requestBody;
   if (input) {
      log_trace("md2html size %d", input->size);
      md_html(input->bytes, input->size, saveMD, ctx, PARSER_FLAGS, RENDER_FLAGS);
   }
   else log_debug("markdownToHtml missing body");
   http_response_headers(ctx, 200, false, "text/html");
   http_send(ctx);
   return true;
}

static bool wikiGet(HttpContext ctx, void *arg) {
   char *exts[] = { "json", "svg", "md" };
   char *mimes[] = { "application/json", "image/svg+xml", "text/plain" };
   struct stat statInfo;
   char *filename = NULL, *mimeType, *p;
   time_t maxTime = 0;
   int err;
   for (int i = 0; i < 3; i++) {
      p = normalizedPath(dataRoot,  get_req(ctx, H_LOCALPATH), exts[i]);
      log_trace("checking %s", p);
      if (i == 2 && filename == NULL) {
         filename = p;
         mimeType = mimes[i];
         break;
      }
      err = stat(p, &statInfo);
      if (err == 0 && statInfo.st_mtime > maxTime) {
         maxTime = statInfo.st_mtime;
         filename = p;
         mimeType = mimes[i];
         log_trace("tm %ld", maxTime);
      }
   }

   Bytearray input = bytearray_readfile(filename);
   if (input) bytearray_append_all(ctx->responseBody, input->bytes, input->size);
   http_response_headers(ctx, 200, false, mimeType);
   http_send(ctx);
   return true;
}

static bool wikiSave(HttpContext ctx, void *arg) {
   char *name = get_req(ctx, H_LOCALPATH);
   char *ext = get_req(ctx, "MISC-Ext");
   if (ext == NULL) {
      ext = "md";
   }
   char *filename = normalizedPath(dataRoot, name, ext);
   bytearray_writefile(ctx->requestBody, filename);
   http_response_headers(ctx, 200, false, "text/plain");
   bytearray_append_all(ctx->responseBody, "Success", 7);
   http_send(ctx);
   return true;
}

static void usage() {
   puts(
       "\n"
       "usage: misc [options]\n"
       "            [options are also read from MISC_DOC_OPTS environment variable]\n\n"
       "  --help                            this help\n"
       "  --port num                        port number (default 7575)\n"
       "  --out dir                         location of data files (default ./data)\n"
       "  --localhost hostname              localhost alias to use when launching from tray\n"
       "  --ext name1;dir1;name2;dir2;...   serve static files in dir1 as /-/ext/name1, and so on\n"
       "  --log logFileName                 log file name or stderr (default log.txt)\n"
       "  --debug 1,2,3                     1=debug, 2=trace, 3=test (default 1)\n\n");
}

static void showHome() {
   win_openBrowser(localhost, port, "", false);
}

static void addExternalFolders(char *external) {
   if (*external) {
      int array[20], ix = 0, semi1, semi2;
      int n = findAll(external, ';', array, 20);
      for (int i=0; i < n-1; i += 2) {
         semi1 = array[i];
         semi2 = array[i+1];
         external[semi1] = 0;
         external[semi2] = 0;
         char *name = t_printf("ext_%s", external + ix);
         char *uri = t_printf("/-/ext/%s", external + ix);
         char *folder = external + semi1 + 1;
         log_debug("ext %s at %s for %s", name, uri, folder);
         files_addDir(strdup(name), "GET", strdup(uri), strdup(folder), false);
         ix = semi2 + 1;
      }
   }
}

int main(int argc, char **argv) {
   bool usageOnCatch = true;
   win_pushMenuItem("Open", showHome);
   win_pushMenuItem("Open", showHome);
   win_pushMenuItem("Exit", win_exit);
   mimeInit();
   t_init();

   try {
      Map opt = map_new();
      char *exeLoc = win_getExeFolder();
      srcRoot = hPath(exeLoc, "srcroot", NULL);
      map_putall(opt, "port", "7575", "ext", "", "out", hPath(exeLoc, "data", NULL), "localhost", "localhost", "debug", "0", "log", "log.txt", "help", "false", NULL);
      char *envArgv[100];
      int envArgc = win_getEnvOpts("MISC_DOC_OPTS", envArgv, 100);
      if (envArgc > 0) map_parseCLI(opt, envArgv, envArgc);
      map_parseCLI(opt, argv, argc);
      port = toInt(map_get(opt, "port"));
      dataRoot = map_get(opt, "out");
      debugMode = toInt(map_get(opt, "debug"));
      localhost = map_get(opt, "localhost");
      char *externalFolders = map_get(opt, "ext");
      char *logLocation = map_get(opt, "log");
      bool doStderr = strcmp("stderr", logLocation) == 0;
      bool doHelp = strcmp("true", map_get(opt, "help")) == 0;
      if (doHelp) {
         usage();
         return 0;
      }

      log_init(doStderr, debugMode == M_TRACE ? LOG_TRACE : LOG_DEBUG, hPath(exeLoc, logLocation, NULL));
      log_trace("post log init");

      for (int i = 0; i < envArgc; i++) {
         log_debug("env opt [%s]", envArgv[i]);
      }

      if (debugMode == 3) {
         log_info("testing");
         testAll();
      } else {
         usageOnCatch = false;
         log_info("running on port %d, src={%s}, data={%s}, mode={%d}, localhost={%s}, ext={%s}", port, srcRoot, dataRoot, debugMode, localhost, externalFolders);
         web_handler("md_to_html", "POST", "/-/md-to-html/", markdownToHtml, NULL);
         web_handler("wiki_get", "GET", "/-/md/", wikiGet, NULL);
         web_handler("wiki_save", "POST", "/-/md/", wikiSave, NULL);
         log_trace("past web handlers");
         files_addDir("src_cached", "GET", "/-/src/prod/", hPath(srcRoot, "prod", NULL), true);
         files_addDir("src_uncached", "GET", "/-/src/", srcRoot, false);
         addExternalFolders(externalFolders);
         files_addFile("404-api", "GET", "/-/", hPath(srcRoot, "404.html", NULL), 404, false);
         files_addFile("favicon", "*", "/favicon.ico", hPath(srcRoot, "prod", "favicon.ico", NULL), 200, true);
         files_addFile("index", "GET", "/", hPath(srcRoot, debugMode != M_PROD ? "index-dev.html" : "index.html", NULL), 200, true);
         files_addFile("404-method", "*", "/", hPath(srcRoot, "404.html", NULL), 404, false);
         log_trace("starting web");
         web_start(port, !win_hasRunLoop());
         win_run(hPath(srcRoot, "prod", "favicon.ico", NULL), TOOLTIP);
         log_info("shutting down");
      }
   } catch {
      if (usageOnCatch) usage();
   }

   exit(EXIT_SUCCESS);
   return 0;
}
