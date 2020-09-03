#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include "../concurrency.h"
#include "../log.h"
#include "../sockets.h"

#define SOCKET_READ_BUFFER_SZ 8192
#define POOL_SIZE 10

struct ListenSocket_s {
};

struct CommsSocket_s {
};

ListenSocket socket_new(int port) {
}

CommsSocket socket_listen(ListenSocket s) {
}

bool socket_write(CommsSocket p, const unsigned char *data, int len) {
}

char socket_read(CommsSocket p) {
}

void socket_close(CommsSocket p) {
}
