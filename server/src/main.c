#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
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
#include <pthread.h>

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

static char *hPath(const char *dir, const char *file) {
   int d = strlen(dir);
   int f = strlen(file);
   char *res = malloc(d + f + 2);
   memcpy(res, dir, d);
   res[d] = '\\';
   memcpy(res + d + 1, file, f);
   res[d + 1 + f] = 0;
   return res;
}

static void saveMD(const char *text, unsigned int size, void *userdata) {
   HttpContext ctx = userdata;
   bytearray_append_all(ctx->responseBody, text, size);
}

static bool markdownGet(HttpContext ctx, void *arg) {
   char *filename = normalizedPath(dataRoot, get_req(ctx, H_LOCALPATH), "md");
   Bytearray input = bytearray_readfile(filename);
   if (input) md_html(input->bytes, input->size, saveMD, ctx, PARSER_FLAGS, RENDER_FLAGS);
   http_response_headers(ctx, 200, false, "text/html");
   http_send(ctx);
   return true;
}

static bool markdownGetRaw(HttpContext ctx, void *arg) {
   char *filename = normalizedPath(dataRoot,  get_req(ctx, H_LOCALPATH), "md");
   Bytearray input = bytearray_readfile(filename);
   if (input) bytearray_append_all(ctx->responseBody, input->bytes, input->size);
   http_response_headers(ctx, 200, false, "text/plain");
   http_send(ctx);
   return true;
}

static bool markdownSave(HttpContext ctx, void *arg) {
   char *filename = normalizedPath(dataRoot,  get_req(ctx, H_LOCALPATH), "md");
   bytearray_writefile(ctx->requestBody, filename);
   http_response_headers(ctx, 200, false, "text/plain");
   bytearray_append_all(ctx->responseBody, "Success", 7);
   http_send(ctx);
   return true;
}

static void usage() {
   log_info(
       "\n"
       "usage: misc [options]\n"
       "            [options are also read from MISC_DOC_OPTS environment variable]\n"
       "  --port num                        port number (default 7575)\n"
       "  --out dir                         location of data files (default ./data)\n"
       "  --localhost hostname              localhost alias to use when launching from tray\n"
       "  --ext name1;dir1;name2;dir2;...    serve static files in dir1 as /-/ext/name1, and so on\n"
       "  --debug 0,1,2,3        dev mode: 0=prod, 1=debug, 2=trace, 3=test (default 0)\n\n");
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
   win_pushMenuItem("Open", showHome);
   win_pushMenuItem("Open", showHome);
   win_pushMenuItem("Exit", win_exit);
   mimeInit();
   t_init();

   try {
      Map opt = map_new();
      char *exeLoc = win_getExeFolder();
      srcRoot = hPath(exeLoc, "srcroot");
      map_putall(opt, "port", "7575", "ext", "", "out", hPath(exeLoc, "data"), "localhost", "localhost", "debug", "0", NULL);
      char *envArgv[100];
      int envArgc = win_getEnvOpts("MISC_DOC_OPTS", envArgv, 100);
      if (envArgc > 0) map_parseCLI(opt, envArgv, envArgc);
      map_parseCLI(opt, argv, argc);
      port = toInt(map_get(opt, "port"));
      dataRoot = map_get(opt, "out");
      debugMode = toInt(map_get(opt, "debug"));
      localhost = map_get(opt, "localhost");
      char *externalFolders = map_get(opt, "ext");

      log_init(false, debugMode == M_TRACE ? LOG_TRACE : LOG_DEBUG, hPath(exeLoc, "log.txt"));
      for (int i = 0; i < envArgc; i++) {
         log_debug("env opt [%s]", envArgv[i]);
      }

      if (debugMode == 3) {
         log_info("testing");
         testAll();
      } else {
         log_info("running on port %d, src={%s}, data={%s}, mode={%d}, localhost={%s}, ext={%s}", port, srcRoot, dataRoot, debugMode, localhost, externalFolders);
         web_handler("markdownGet", "GET", "/-/md-to-html/", markdownGet, NULL);
         web_handler("markdown_raw", "GET", "/-/md/", markdownGetRaw, NULL);
         web_handler("markdown_save", "POST", "/-/md/", markdownSave, NULL);
         files_addDir("src_cached", "GET", "/-/src/prod/", hPath(srcRoot, "prod"), true);
         files_addDir("src_uncached", "GET", "/-/src/", srcRoot, false);
         addExternalFolders(externalFolders);
         files_addFile("404-api", "GET", "/-/", hPath(srcRoot, "404.html"), 404, false);
         files_addFile("favicon", "*", "/favicon.ico", hPath(srcRoot, "prod\\favicon.ico"), 200, true);
         files_addFile("index", "GET", "/", hPath(srcRoot, debugMode != M_PROD ? "index-dev.html" : "index.html"), 200, true);
         files_addFile("404-method", "*", "/", hPath(srcRoot, "404.html"), 404, false);
         web_start(port);
         win_run(hPath(srcRoot, "prod\\favicon.ico"), TOOLTIP);
         log_info("shutting down");
      }
   } catch {
      usage();
   }

   exit(EXIT_SUCCESS);
   return 0;
}
