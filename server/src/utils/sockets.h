#if !defined(SOCKETS_H)
#define SOCKETS_H

#include "buffer.h"
#include "headers.h"

#define READ_EOF -1
#define READ_ERROR -2
#define SOCKET_READ_BUFFER_SZ 8192

typedef struct {
   SOCKET socket;
   int port;
} ListenSocket;

typedef struct {
   SOCKET socket;
   char buf[SOCKET_READ_BUFFER_SZ];
   int ix;
   int length;
   bool eof;
} CommsSocket;

ListenSocket *socket_new(int port);
CommsSocket *socket_listen(ListenSocket *socket);
void socket_close(CommsSocket *socket);
char socket_read(CommsSocket *socket);
bool socket_write(CommsSocket *p, const char *data, int len);
#define socket_writeText(sock, text) socket_write(sock, text, strlen(text))

#endif  // SOCKETS_H
