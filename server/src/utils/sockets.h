#if !defined(SOCKETS_H)
#define SOCKETS_H

#define READ_EOF -1
#define READ_ERROR -2

#include <stdbool.h>

struct ListenSocket_s;
struct CommsSocket_s;
typedef struct ListenSocket_s *ListenSocket;
typedef struct CommsSocket_s *CommsSocket;

ListenSocket socket_new(int port);
CommsSocket socket_listen(ListenSocket socket);
void socket_close(CommsSocket socket);
char socket_read(CommsSocket socket);
bool socket_write(CommsSocket p, const unsigned char *data, int len);
#define socket_writeText(sock, text) socket_write(sock, text, strlen(text))

#endif  // SOCKETS_H
