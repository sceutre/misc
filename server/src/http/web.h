#ifndef WEB_H
#define WEB_H

#include "http.h"

#define M_GET 1
#define M_POST 2

typedef bool (*WebCallback)(HttpContext ctx, void *arg);

typedef struct WebHandlerStruct {
   char *name;
   char *methodPattern;
   char *urlPattern;
   void *arg;
   struct WebHandlerStruct *next;
   WebCallback callback;
} *WebHandler;

void web_handler(char *name, char *methodPattern, char *urlPattern, WebCallback callback, void *arg);
void web_start(int port, bool blockUntilDone);
void web_stop();
void web_setMaxConcurrent(int maxConcurrent);
void web_setNumWorkers(int numWorkers);

#endif
