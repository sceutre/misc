#if !defined(SOCKETS_H)
#define SOCKETS_H

#define READ_EOF -1
#define READ_ERROR -2

#ifndef SOCKETS_IMPL
typedef void *ListenSocket;
typedef void *CommsSocket;
#endif

#include <stdbool.h>

ListenSocket socket_new(int port);
CommsSocket socket_listen(ListenSocket socket);
void socket_close(CommsSocket socket);
char socket_read(CommsSocket socket);
bool socket_write(CommsSocket p, const char *data, int len);
#define socket_writeText(sock, text) socket_write(sock, text, strlen(text))

#endif  // SOCKETS_H
