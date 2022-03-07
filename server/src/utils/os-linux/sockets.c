#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <errno.h>
#include <unistd.h>
#include "../concurrency.h"
#include "../log.h"
#include "../sockets.h"

#define SOCKET_READ_BUFFER_SZ 8192
#define POOL_SIZE 10

struct ListenSocket_s {
   int sock;
   int port;
};

struct CommsSocket_s {
   int sock;
   char buf[SOCKET_READ_BUFFER_SZ];
   int ix;
   int length;
   bool eof;
};

static CommsSocket socketPool[POOL_SIZE];
static bool initialized = false;
static Mutex poolMutex;

static CommsSocket getCommsSocket();

static void init() {
   if (!initialized) {
      for (int i = 0; i < POOL_SIZE; i++) {
         CommsSocket cs = malloc(sizeof(*cs));
         socketPool[i] = cs;
      }
      poolMutex = mutex_new();
      initialized = true;
   }
}

ListenSocket socket_new(int port) {
   init();
   ListenSocket s = calloc(1, sizeof(*s));
   s->sock = socket(PF_INET, SOCK_STREAM, 0);
   s->port = port;
   if (s->sock == -1) {
      log_fatal("socket creation failed: %s", strerror(errno));
      throw("socket creation failed");
   }
   int enable = 1;
   if (setsockopt(s->sock, SOL_SOCKET, SO_REUSEADDR, &enable, sizeof(int)) < 0) {
      log_fatal("socket opts failed: %s", strerror(errno));
      throw("socket creation failed");
   }
   struct sockaddr_in serverAddr;
   serverAddr.sin_family = AF_INET;
   serverAddr.sin_port = htons(port); 
   serverAddr.sin_addr.s_addr = INADDR_ANY;
   if (bind(s->sock, (struct sockaddr *) &serverAddr, sizeof(serverAddr)) == -1) {
      log_fatal("socket bind failed: %s", strerror(errno));
      throw("socket creation failed");
   }
   if (listen(s->sock, 1024) == -1) {
      log_fatal("socket listen failed: %s", strerror(errno));
      throw("socket creation failed");
   }
   return s;
}

CommsSocket socket_listen(ListenSocket s) {
   while (true) {
      int newConn = accept(s->sock, NULL, NULL);
      if (newConn == -1) {
         log_error("Accept failed with error code : %s", strerror(errno));
         bool fatal = false; // TODO determine what is fatal
         if (fatal) {
            exit(EXIT_FAILURE);
         }
      } else {
         CommsSocket p = getCommsSocket();
         p->sock = newConn;
         return p;
      }
   }
   return NULL;
}

bool socket_write(CommsSocket p, const unsigned char *data, int len) {
   send(p->sock, data, len, 0);
   return true;  // TODO actually see if it was as success
}

char socket_read(CommsSocket p) {
   if (p->eof) return READ_EOF;
   if (p->ix >= p->length) {
      if (p->length + 10 >= SOCKET_READ_BUFFER_SZ) {
         p->ix = 0;
         p->length = 0;
      }
      int len = recv(p->sock, p->buf + p->ix, SOCKET_READ_BUFFER_SZ - p->length, 0);
      log_trace("recv of size [%d]", len);
      if (len <= 0) {
         p->eof = true;
         return READ_EOF;
      }
      p->length += len;
   }
   return p->buf[p->ix++];
}

void socket_close(CommsSocket p) {
   close(p->sock);
   p->ix = 0;
   p->length = 0;
   bool found = false;
   mutex_lockRW(poolMutex);
   for (int i = 0; i < POOL_SIZE && !found; i++) {
      if (socketPool[i] == NULL) {
         socketPool[i] = p;
         found = true;
      }
   }
   mutex_unlockRW(poolMutex);
   if (!found) free(p);

}

static CommsSocket getCommsSocket() {
   CommsSocket found = NULL;
   mutex_lockRW(poolMutex);
   for (int i = 0; i < POOL_SIZE && found == NULL; i++) {
      if (socketPool[i] != NULL) {
         found = socketPool[i];
         socketPool[i] = NULL;
         found->ix = 0;
         found->length = 0;
         found->eof = false;
      }
   }
   mutex_unlockRW(poolMutex);
   if (found != NULL) return found;
   CommsSocket p = malloc(sizeof(*p));
   memset(p, 0, sizeof(*p));
   return p;
}


