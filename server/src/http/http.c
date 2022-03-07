#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <time.h>
#include "http.h"
#include "../utils/concurrency.h"
#include "../utils/log.h"
#include "../utils/map.h"
#include "../utils/utils.h"

static bool printHeader(char *key, void *val, void *ctx);
static bool sendHeader(char *key, void *val, void *ctx);
static void reset(HttpContext ctx);
static char *upTo(HttpContext ctx, char delim);
static char next(HttpContext ctx);
static char *upToEndOfLine(HttpContext ctx);
static void skipSpaces(HttpContext ctx);
static bool peekBlankLine(HttpContext ctx);
static void callback(HttpContext ctx, bool isDone);
static int readFixedLength(HttpContext ctx, int n, int soFar);
static int readChunkSize(HttpContext ctx);
static void readChunkedEncoding(HttpContext ctx);
static void readHeader(HttpContext ctx);
static void readBody(HttpContext ctx);
static void setDate(Map map);
static bool peekEOF(HttpContext ctx);
static void autoclose(HttpContext ctx);

void http_request(HttpContext ctx) {
   reset(ctx);
   try {
      if (peekEOF(ctx)) {
         log_debug("client closed connection");
         ctx->closeDesired = true;
         return;
      }
      readHeader(ctx);
      autoclose(ctx);
      foreach_req(ctx, printHeader);
      readBody(ctx);
   } catch {
      log_debug("request fail: %s", t_local()->error);
      ctx->closeDesired = true;
   }
}

void http_send(HttpContext ctx) {
   http_sendEx(ctx, ctx->responseBody->size, true);
}

void http_sendEx(HttpContext ctx, int contentLength, bool firstChunk) {
   log_trace("sendEx %d first=%s", contentLength, firstChunk ? "t" : "f");
   if (firstChunk) {
      log_debug("response: %s %s - Length %d", get_resp(ctx, H_STATUS), get_resp(ctx, H_STATUS_REASON), contentLength);
      put_resp(ctx, H_CONTENT_LENGTH, t_printf("%d", contentLength));
      setDate(ctx->responseHeaders);
      foreach_resp(ctx, printHeader);
      socket_writeText(ctx->socket, "HTTP/1.1 ");
      socket_writeText(ctx->socket, get_resp(ctx, H_STATUS));
      socket_writeText(ctx->socket, " ");
      socket_writeText(ctx->socket, get_resp(ctx, H_STATUS_REASON));
      socket_writeText(ctx->socket, "\r\n");
      foreach_resp(ctx, sendHeader);
      socket_writeText(ctx->socket, "\r\n");
   }
   if (ctx->responseBody->size > 0) socket_write(ctx->socket, ctx->responseBody->bytes, ctx->responseBody->size);
}

static bool printHeader(char *key, void *val, void *ctx) {
   log_trace("   %s: %s", key, (char *)val);
   return true;
}

static bool sendHeader(char *key, void *val_v, void *ctx_v) {
   char *val = val_v;
   HttpContext ctx = ctx_v;
   if (key[0] == '<') return true;
   socket_writeText(ctx->socket, key);
   socket_writeText(ctx->socket, ": ");
   socket_writeText(ctx->socket, val);
   socket_writeText(ctx->socket, "\r\n");
   return true;
}

static void reset(HttpContext ctx) {
   bytearray_reset(ctx->requestBody);
   bytearray_reset(ctx->responseBody);
   map_reset(ctx->requestHeaders);
   map_reset(ctx->responseHeaders);
   ctx->undoChar = 0;

   put_resp(ctx, H_STATUS, "200");
   put_resp(ctx, H_STATUS_REASON, "OK");
   put_resp(ctx, H_SERVER, "misc-embedded-http");
}

static char *upTo(HttpContext ctx, char delim) {
   // TODO - change to 0-copy version
   char *buf = NULL;
   while (true) {
      char c = next(ctx);
      if (c == delim) {
         t_accum(buf, 0);
         return buf;
      } else if (c == '\n') {
         throw("unexpected newline");
      } else {
         t_accum(buf, c);
      }
   }
}

static bool peekEOF(HttpContext ctx) {
   if (ctx->undoChar != 0) return false;
   char c = socket_read(ctx->socket);
   if (c == READ_EOF) return true;
   if (c == READ_ERROR) throw("read error");
   ctx->undoChar = c;
   return false;
}

static char next(HttpContext ctx) {
   char c = ctx->undoChar;
   if (c != 0) {
      ctx->undoChar = 0;
      return c;
   }
   c = socket_read(ctx->socket);
   if (c == READ_ERROR) throw("read error");
   if (c == READ_EOF) throw("unexpected eof");
   return c;
}

static char *upToEndOfLine(HttpContext ctx) {
   char *buf = upTo(ctx, '\r');
   if (next(ctx) != '\n') throw("newline expected");
   return buf;
}

static void skipSpaces(HttpContext ctx) {
   while (true) {
      char c = next(ctx);
      switch (c) {
         case '\t':
         case '\v':
         case '\f':
         case ' ':
            break;
         default:
            ctx->undoChar = c;
            return;
      }
   }
}

static bool peekBlankLine(HttpContext ctx) {
   char c = next(ctx);
   if (c == '\r') {
      c = next(ctx);
      if (c == '\n') return true;
      throw("cr without nl when peeking for blank line");
   } else {
      ctx->undoChar = c;
   }
   return false;
}

static void callback(HttpContext ctx, bool isDone) {
   ((HttpCallbackFn)(ctx->callback))(ctx, isDone);
}

#define MAX_BODY_SIZE 1000000

static int readFixedLength(HttpContext ctx, int n, int soFar) {
   if (soFar == 0) bytearray_reset(ctx->requestBody);
   int ix = 0;
   while (ix < n) {
      char c = next(ctx);
      bytearray_append(ctx->requestBody, c);
      soFar++;
      ix++;
      if (soFar >= MAX_BODY_SIZE) {
         callback(ctx, false);
         soFar = 0;
      }
   }
   return soFar;
}

static int readChunkSize(HttpContext ctx) {
   char *line = upToEndOfLine(ctx);
   for (int i = 0; line[i] != 0; i++)
      if (line[i] == ';') {
         line[i] = 0;
         break;
      }
   return strtol(line, NULL, 16);
}

static void readChunkedEncoding(HttpContext ctx) {
   int len = 0;
   int soFar = 0;
   while (true) {
      int sz = readChunkSize(ctx);
      if (sz == 0) break;
      soFar = readFixedLength(ctx, sz, soFar);
      len += sz;
   }
}

static void readHeader(HttpContext ctx) {
   put_req(ctx, H_METHOD, trim(upTo(ctx, ' ')));
   put_req(ctx, H_PATH, trim(upTo(ctx, ' ')));
   put_req(ctx, H_VERSION, trim(upToEndOfLine(ctx)));

   while (true) {
      if (peekBlankLine(ctx)) break;
      char *key = trim(upTo(ctx, ':'));
      char *value = trim(upToEndOfLine(ctx));
      put_req(ctx, key, value);
   }
}

static void readBody(HttpContext ctx) {
   char *len = get_req(ctx, H_CONTENT_LENGTH);
   if (len != NULL) {
      int n = atoi(len);
      readFixedLength(ctx, n, 0);
      callback(ctx, true);
      return;
   }
   char *encoding = get_req(ctx, H_TRANSFER_ENCODING);
   if (encoding != NULL) {
      readChunkedEncoding(ctx);
      callback(ctx, true);
      return;
   }
   // no body
   callback(ctx, true);
}

static void setDate(Map map) {
   char buf[1000];
   time_t now = time(0);
   struct tm tm = *gmtime(&now);
   int written = strftime(buf, 1000, "%a, %d %b %Y %H:%M:%S %Z", &tm);
   map_put(map, H_DATE, t_printf("%s", buf));
}

static char *reasonFor(int status) {
   switch (status) {
      case 200:
         return "OK";
      case 304:
         return "Not modified";
      case 303:
         return "Redirect (POSTs succeeded)";
      case 307:
         return "Redirect (POSTs failed)";
      case 404:
         return "Not found";
      case 500:
         return "Internal server error";
   }
   return "Unknown";
}

void http_response_headers(HttpContext ctx, int status, bool cache, char *mime) {
   put_resp(ctx, H_STATUS, t_printf("%d", status));
   put_resp(ctx, H_STATUS_REASON, reasonFor(status));
   if (mime != NULL) put_resp(ctx, H_CONTENT_TYPE, mime);
   if (cache) put_resp(ctx, H_CACHE_CONTROL, H_CACHE_CONTROL_CACHE);
   if (!cache) put_resp(ctx, H_CACHE_CONTROL, H_CACHE_CONTROL_NO_CACHE);
}

void autoclose(HttpContext ctx) {
   char *header = get_req(ctx, H_CONNECTION);
   if (true || (header && containsIgnoreCase(header, "close"))) {
      ctx->closeDesired = true;
      put_resp(ctx, H_CONNECTION, "close");
   }
}