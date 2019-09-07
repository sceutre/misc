#ifndef QUEUE_H
#define QUEUE_H

#include <stdbool.h>

struct Queue_s;
typedef struct Queue_s *Queue;

Queue queue_new(int maxNumItems);
bool queue_prepend(Queue queue, void *item);
bool queue_append(Queue queue, void *item);
void *queue_popFirst(Queue queue);
void *queue_popLast(Queue queue);

#endif