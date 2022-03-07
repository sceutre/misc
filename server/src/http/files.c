#include <stdio.h>
#include "http.h"
#include "web.h"
#include "files.h"
#include "mime.h"
#include "../utils/utils.h"
#include "../utils/bytearray.h"
#include "../utils/concurrency.h"
#include "../utils/log.h"
#include "../utils/win.h"

#define CHUNK_SIZE 4096

typedef struct FileInfoStruct {
   char *filename;
   int status;
   bool cache;
} *FileInfo;

static bool doFile(HttpContext ctx, char *dir, char *file, int status, bool cache) {
   bytearray_reset(ctx->responseBody);
   char *filename = dir ? t_printf("%s/%s", dir, file) : t_printf("%s", file);
   replaceChar(filename, '/', win_fileSeperator());
   maskString(filename, "..", 'x');

   FILE *fp = fopen(filename, "rb");
   if (fp == NULL) {
      log_debug("not found: %s", filename);
      return false;
   }
   char *mime = mimeGet(filename);
   http_response_headers(ctx, status, cache, mime);
   fseek(fp, 0L, SEEK_END);
   long fileSize = ftell(fp);
   int read = 0;
   bytearray_grow(ctx->responseBody, min(CHUNK_SIZE, fileSize));
   fseek(fp, 0L, SEEK_SET);
   while (read < fileSize) {
      bytearray_reset(ctx->responseBody);
      int amountRead = fread(ctx->responseBody->bytes, 1, min(CHUNK_SIZE, fileSize - read), fp);
      ctx->responseBody->size += amountRead;
      http_sendEx(ctx, fileSize, read == 0);
      read += amountRead;
   }
   fclose(fp);
   return true;
}

static bool dirFn(HttpContext ctx, void *arg) {
   FileInfo fi = arg;
   char *path = get_req(ctx, H_LOCALPATH);
   return doFile(ctx, fi->filename, path, 200, fi->cache);
}

static bool fileFn(HttpContext ctx, void *arg) {
   FileInfo fi = arg;
   return doFile(ctx, NULL, fi->filename, fi->status, fi->cache);
}

void files_addDir(char *name, char *methodPattern, char *urlPattern, char *docroot, bool cache) {
   FileInfo fi = malloc(sizeof(*fi));
   fi->filename = docroot;
   fi->cache = cache;
   web_handler(name, methodPattern, urlPattern, dirFn, fi);
}

void files_addFile(char *name, char *methodPattern, char *urlPattern, char *filename, int status, bool cache) {
   FileInfo fi = malloc(sizeof(*fi));
   fi->filename = filename;
   fi->status = status;
   fi->cache = cache;
   web_handler(name, methodPattern, urlPattern, fileFn, fi);
}
