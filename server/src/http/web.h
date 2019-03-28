#ifndef WEB_H
#define WEB_H

#include "../utils/utils.h"
#include "http.h"
#include "mime.h"

#define M_GET 1
#define M_POST 2

typedef bool (*WebCallback)(HttpContext *ctx, void *arg);

typedef struct WebHandler {
   char *name;
   char *methodPattern;
   char *urlPattern;
   void *arg;
   struct WebHandler *next;
   WebCallback callback;
} WebHandler;

void web_handler(char *name, char *methodPattern, char *urlPattern, WebCallback callback, void *arg);
void web_start(int port);
void web_stop();
void web_setMaxConcurrent(int maxConcurrent);
void web_setNumWorkers(int numWorkers);

#endif
