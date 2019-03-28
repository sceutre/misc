#include "web.h"

static struct {
   int port;
   int numWorkers;
   int maxConcurrent;
   Queue *queue;
   Mutex *mutex;
   Signal *signal;
   WebHandler *handlers;
} this = {0, 5, 100, NULL, NULL, NULL, NULL};

static void listenLoop();
static void workerLoop();
static void overloaded(CommsSocket *socket);

void web_handler(char *name, char *methodPattern, char *urlPattern, WebCallback callback, void *arg) {
   WebHandler h = {.name = name, .arg = arg, .methodPattern = methodPattern, .urlPattern = urlPattern, .callback = callback};
   sb_push(this.handlers, h);
}

void web_setMaxConcurrent(int maxConcurrent) {
   this.maxConcurrent = maxConcurrent;
}

void web_setNumWorkers(int numWorkers) {
   this.numWorkers = numWorkers;
}

void web_stop() {
   // TODO implement
}

void web_start(int port) {
   this.port = port;
   this.queue = queue_new(this.maxConcurrent);
   this.mutex = mutex_new();
   this.signal = signal_new();
   for (int i = 0; i < this.numWorkers; i++) t_start(workerLoop);
   t_start(listenLoop);
}

static void listenLoop() {
   ListenSocket *serverSocket = socket_new(this.port);
   CommsSocket *socket;
   while (true) {
      socket = socket_listen(serverSocket);
      if (socket != NULL) {
         log_debug("new connection");
         mutex_lockRW(this.mutex);
         bool pushed = queue_append(this.queue, socket);
         mutex_unlockRW(this.mutex);
         if (pushed)
            signal_fire(this.signal);
         else
            overloaded(socket);
      }
   }
}

static void httpCallback(HttpContext *ctx, bool isDone) {
   char *method = get_req(ctx, H_METHOD);
   char *path = get_req(ctx, H_PATH);
   log_debug("request: %s %s", method, path);
   for (int i = 0; i < sb_count(this.handlers); i++) {
      char *m = this.handlers[i].methodPattern;
      char *u = this.handlers[i].urlPattern;
      if ((strcmp("*", m) == 0 || containsIgnoreCase(m, method)) && strncmp(path, u, strlen(u)) == 0) {
         log_debug("handling: %s (%s %s)", this.handlers[i].name, m, u);
         put_req(ctx, H_LOCALPATH, path + strlen(u));
         if (this.handlers[i].callback != NULL && this.handlers[i].callback(ctx, this.handlers[i].arg)) return;
      }
   }
}

static void workerLoop() {
   CommsSocket *socket;
   HttpContext context;
   memset(&context, 0, sizeof(context));
   map_init(&(context.requestHeaders));
   map_init(&(context.responseHeaders));
   context.requestBody = context.responseBody = NULL;
   context.callback = httpCallback;

   while (true) {
      mutex_lockRW(this.mutex);
      socket = (CommsSocket *)queue_popFirst(this.queue);
      mutex_unlockRW(this.mutex);
      if (socket != NULL) {
         int c = 1;
         context.socket = socket;
         while (true) {
            log_debug("handling incoming connection [%d]", c++);
            t_reset();
            http_request(&context);
            if (context.closeDesired) {
               socket_close(socket);
               break;
            }
         }
      } else {
         signal_wait(this.signal);
      }
   }
}

static void overloaded(CommsSocket *socket) {
   // TODO implement
}
