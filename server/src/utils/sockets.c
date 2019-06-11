#include "os-windows.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include "concurrency.h"
#include "log.h"

#define SOCKETS_IMPL
#define SOCKET_READ_BUFFER_SZ 8192

typedef struct {
   SOCKET socket;
   int port;
} *ListenSocket;

typedef struct {
   SOCKET socket;
   char buf[SOCKET_READ_BUFFER_SZ];
   int ix;
   int length;
   bool eof;
} *CommsSocket;

#include "sockets.h"

#define POOL_SIZE 10

static CommsSocket getCommsSocket();

static CommsSocket socketPool[POOL_SIZE];
static bool initialized = false;
static Mutex poolMutex;

static void init() {
   if (!initialized) {
      for (int i = 0; i < POOL_SIZE; i++) {
         CommsSocket cs = malloc(sizeof(*cs));
         socketPool[i] = cs;
      }
      WSADATA wsa;
      if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
         log_fatal("Failed. Error Code : %d", WSAGetLastError());
         exit(EXIT_FAILURE);
      }
      poolMutex = mutex_new();
      initialized = true;
   }
}

ListenSocket socket_new(int port) {
   init();
   SOCKET s = socket(AF_INET, SOCK_STREAM, 0);
   if (s == INVALID_SOCKET) {
      log_fatal("Failed. Error Code : %d", WSAGetLastError());
      exit(EXIT_FAILURE);
   }
   struct sockaddr_in server;
   server.sin_family = AF_INET;
   server.sin_addr.s_addr = INADDR_ANY;
   server.sin_port = htons(port);
   if (bind(s, (struct sockaddr *)&server, sizeof(server)) == SOCKET_ERROR) {
      log_fatal("Bind failed with error code : %d", WSAGetLastError());
      exit(EXIT_FAILURE);
   }
   listen(s, 16);
   ListenSocket p = malloc(sizeof(*p));
   p->port = port;
   p->socket = s;
   return p;
}

CommsSocket socket_listen(ListenSocket s) {
   while (true) {
      SOCKET newConn = accept(s->socket, NULL, NULL);
      if (newConn == INVALID_SOCKET) {
         // sadly, not all of these errors are fatal
         // TODO properly determine which are fatal
         log_error("Accept failed with error code : %d", WSAGetLastError());
         bool fatal = false;
         if (fatal) {
            log_fatal("Bind failed with error code : %d", WSAGetLastError());
            exit(EXIT_FAILURE);
         }
      } else {
         CommsSocket p = getCommsSocket();
         p->socket = newConn;
         return p;
      }
   }
}

bool socket_write(CommsSocket p, const unsigned char *data, int len) {
   send(p->socket, data, len, 0);
   return true;  // TODO actually see if it was as success
}

char socket_read(CommsSocket p) {
   if (p->eof) return READ_EOF;
   if (p->ix >= p->length) {
      if (p->length + 10 >= SOCKET_READ_BUFFER_SZ) {
         p->ix = 0;
         p->length = 0;
      }
      int len = recv(p->socket, p->buf + p->ix, SOCKET_READ_BUFFER_SZ - p->length, 0);
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
   closesocket(p->socket);
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
