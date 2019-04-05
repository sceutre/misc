#include "utils/utils.h"
#include "http/web.h"
#include "http/files.h"
#include "tests/tests.h"
#include "markdown/render_html.h"
#include "win.h"

#define PARSER_FLAGS (MD_FLAG_STRIKETHROUGH | MD_FLAG_TABLES | MD_FLAG_NOINDENTEDCODEBLOCKS | MD_FLAG_TASKLISTS)
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

static char *hPath(char *dir, char *file) {
   int dlen, flen;
   char *res = malloc((dlen = strlen(dir)) + (flen = strlen(file)) + 2);
   memcpy(res, dir, dlen);
   memcpy(res + dlen + 1, file, flen);
   res[dlen] = '\\';
   res[dlen + 1 + flen] = 0;
   return res;
}

// static bool upload_save(HttpContext *ctx, void *arg) {
//    char *filename = normalizedPath(uploadRoot, map_get_text(&(ctx->requestHeaders), H_LOCALPATH), NULL);
//    sb_write_file(ctx->requestBody, filename);
//    http_response_headers(ctx, 200, false, "text/plain");
//    sb_push_all(ctx->responseBody, "Success", 7);
//    http_send(ctx);
//    return true;
// }

static void saveMD(const char *text, unsigned int size, void *userdata) {
   HttpContext *ctx = userdata;
   sb_push_all(ctx->responseBody, text, size);
}

static bool markdownGet(HttpContext *ctx, void *arg) {
   char *filename = normalizedPath(dataRoot, map_get_text(&(ctx->requestHeaders), H_LOCALPATH), "md");
   char *input = NULL;
   sb_read_file(input, filename);
   md_render_html(input, sb_count(input), saveMD, ctx, PARSER_FLAGS, RENDER_FLAGS);
   http_response_headers(ctx, 200, false, "text/html");
   http_send(ctx);
   return true;
}

static bool markdownGetRaw(HttpContext *ctx, void *arg) {
   char *filename = normalizedPath(dataRoot, map_get_text(&(ctx->requestHeaders), H_LOCALPATH), "md");
   char *input = NULL;
   sb_read_file(input, filename);
   sb_push_all(ctx->responseBody, input, sb_count(input));
   http_response_headers(ctx, 200, false, "text/plain");
   http_send(ctx);
   return true;
}

static bool markdownSave(HttpContext *ctx, void *arg) {
   char *filename = normalizedPath(dataRoot, map_get_text(&(ctx->requestHeaders), H_LOCALPATH), "md");
   sb_write_file(ctx->requestBody, filename);
   http_response_headers(ctx, 200, false, "text/plain");
   sb_push_all(ctx->responseBody, "Success", 7);
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
   ShellExecute(NULL, NULL, t_printf("http://%s:%d/", localhost, port), NULL, NULL, SW_SHOW);
}

static char *getExeFolder() {
   char *last = NULL;
   char *buf = malloc(256 * sizeof(char));
   GetModuleFileName(NULL, buf, 256);
   for (char *p = buf; *p; p++)
      if (*p == '/' || *p == '\\') last = p;
   if (last) *last = 0;
   return buf;
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

char **getEnvOpts() {
   wchar_t wideOpts[1024];
   char dest[256];
   wchar_t **parsed;
   char **utf8 = NULL;
   int count = 0;
   char *miscOpts = getenv("MISC_DOC_OPTS");
   if (miscOpts) {
      swprintf(wideOpts, 1024, L"%hs", miscOpts);
      parsed = CommandLineToArgvW(wideOpts, &count);
      sb_push(utf8, "misc.exe");
      for (int i = 0; i < count; i++) {
         WideCharToMultiByte(CP_UTF8, 0, parsed[i], -1, dest, sizeof(dest), NULL, NULL);
         sb_push(utf8, strdup(dest));
      }
      return utf8;
   }
   return NULL;
}

int main(int argc, char **argv) {
   MenuItem *items = NULL;
   win_pushMenuItem(items, "Open", showHome);
   win_pushMenuItem(items, "Open", showHome);
   win_pushMenuItem(items, "Exit", win_exit);
   mimeInit();
   t_init();

   try {
      Map *opt = map_new();
      char *exeLoc = getExeFolder();
      srcRoot = hPath(exeLoc, "srcroot");
      map_putall(opt, "port", "7575", "ext", "", "out", hPath(exeLoc, "data"), "localhost", "localhost", "debug", "0", NULL);
      char **envOpts = getEnvOpts();
      parseArgv(opt, envOpts, sb_count(envOpts));
      parseArgv(opt, argv, argc);
      port = toInt(map_get(opt, "port"));
      dataRoot = map_get(opt, "out");
      debugMode = toInt(map_get(opt, "debug"));
      localhost = map_get(opt, "localhost");
      char *externalFolders = map_get(opt, "ext");

      log_init(false, debugMode == M_TRACE ? LOG_TRACE : LOG_DEBUG, hPath(exeLoc, "log.txt"));
      for (int i = 0; i < sb_count(envOpts); i++) {
         log_debug("env opt [%s]", envOpts[i]);
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
         win_run(items, hPath(srcRoot, "prod\\favicon.ico"));
         log_info("shutting down");
      }
   } catch {
      usage();
   }

   exit(EXIT_SUCCESS);
   return 0;
}
