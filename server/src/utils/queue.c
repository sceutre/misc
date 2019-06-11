#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <string.h>
#include "queue.h"

Queue queue_new(int maxNumItems) {
   Queue q = malloc(sizeof(*q));
   q->head = q->tail = q->count = 0;
   q->maxItems = maxNumItems;
   q->items = malloc(maxNumItems * sizeof(void *));
   memset(q->items, 0, maxNumItems * sizeof(void *));
   return q;
}

bool queue_prepend(Queue queue, void *item) {
   if (queue->count >= queue->maxItems) return false;
   queue->count++;
   queue->head = ((queue->head - 1) + queue->maxItems) % queue->maxItems;
   queue->items[queue->head] = item;
   return true;
}

bool queue_append(Queue queue, void *item) {
   if (queue->count >= queue->maxItems) return false;
   queue->count++;
   queue->items[queue->tail] = item;
   queue->tail = (queue->tail + 1) % queue->maxItems;
   return true;
}

void *queue_popFirst(Queue queue) {
   if (queue->count <= 0) return NULL;
   void *p = queue->items[queue->head];
   queue->items[queue->head] = NULL;
   queue->head = (queue->head + 1) % queue->maxItems;
   queue->count--;
   return p;
}

void *queue_popLast(Queue queue) {
   if (queue->count <= 0) return NULL;
   queue->tail = ((queue->tail - 1) + queue->maxItems) % queue->maxItems;
   void *p = queue->items[queue->tail];
   queue->items[queue->tail] = NULL;
   queue->count--;
   return p;
}