#if !defined(HTTP_H)
#define HTTP_H

#include "../utils/utils.h"

#define H_CONTENT_LENGTH "Content-Length"
#define H_CONTENT_TYPE "Content-Type"
#define H_CACHE_CONTROL "Cache-Control"
#define H_CONNECTION "Connection"
#define H_CACHE_CONTROL_CACHE "max-age=31536000"
#define H_CACHE_CONTROL_NO_CACHE "no-cache, no-store, must-revalidate"
#define H_TRANSFER_ENCODING "Transfer-Encoding"
#define H_DATE "Date"
#define H_SERVER "Server"
#define H_STATUS "<status>"
#define H_STATUS_REASON "<statusReason>"
#define H_METHOD "<method>"
#define H_PATH "<path>"
#define H_LOCALPATH "<localpath>"
#define H_VERSION "<version>"

typedef struct {
   char undoChar;
   Map requestHeaders;
   Map responseHeaders;
   char *requestBody;
   char *responseBody;
   CommsSocket *socket;
   void *callback;
   bool closeDesired;
} HttpContext;

typedef void (*HttpCallback)(HttpContext *ctx, bool isDone);

void http_request(HttpContext *ctx);
void http_send(HttpContext *ctx);
void http_sendEx(HttpContext *ctx, int contentLength, bool firstChunk);
void http_response_headers(HttpContext *ctx, int status, boolean cache, char *mime);

#define put_req(ctx, key, val) map_put(&(ctx->requestHeaders), key, val)
#define put_resp(ctx, key, val) map_put(&(ctx->responseHeaders), key, val)
#define get_req(ctx, key) map_get(&(ctx->requestHeaders), key)
#define get_resp(ctx, key) map_get(&(ctx->responseHeaders), key)
#define foreach_req(ctx, fn) map_iterate(&(ctx->requestHeaders), fn, ctx)
#define foreach_resp(ctx, fn) map_iterate(&(ctx->responseHeaders), fn, ctx)

#endif  // HTTP_H
