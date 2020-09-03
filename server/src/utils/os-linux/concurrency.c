#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include "../log.h"
#include "../list.h"
#include "../concurrency.h"

struct Mutex_s {
};

struct Signal_s {
};

struct Thread_s {
};

struct PerThread_s {
   struct LocalStorage_s storage;
   List jumpBuffers;
};

#define THREAD_BUFFER_SIZE 20 * 1024
#define MAX_THREADS 50

struct PerThread_s locals[MAX_THREADS];
Mutex threadStartMutex = NULL;

static int indexOfLocal(unsigned int id);
static unsigned int __stdcall threadStarter(void *func);
static LocalStorage initThread(unsigned int threadId);

// TODO - implement
#define GET_THREAD_ID 0

LocalStorage t_local() {
   int i = indexOfLocal(GET_THREAD_ID);
   return &(locals[i].storage);
}

char *_threadLocalPrintf(const char *fmt, ...) {
   LocalStorage st = t_local();
   va_list args;
   va_start(args, fmt);
   char *s = st->buffer + st->ix;
   int written = vsnprintf(s, THREAD_BUFFER_SIZE - st->ix, fmt, args);
   va_end(args);
   st->ix += written + 1;
   return s;
}

char *_threadLocalAccum(char c) {
   LocalStorage st = t_local();
   st->buffer[st->ix] = c;
   return st->buffer + st->ix++;
}

void t_reset() {
   LocalStorage st = t_local();
   st->ix = 0;
}

void t_init() {
   threadStartMutex = mutex_new();
   for (int i = 0; i < MAX_THREADS; i++) locals[i].storage.thread = NULL;
   initThread(GET_THREAD_ID);
}

Mutex mutex_new() {
   Mutex m = malloc(sizeof(*m));
   // TODO implement
   return m;
}

void _mutexAcquire(Mutex m, bool readOnly) {
   // TODO implement
}

void _mutexRelease(Mutex m, bool readOnly) {
   // TODO implement
}

Signal signal_new() {
   Signal s = malloc(sizeof(*s));
   // TODO implement
   return s;
}

void signal_wait(Signal s) {
   // TODO implement
}

void signal_fire(Signal s) {
   // TODO implement
}

int t_start(CallbackFn func) {
   mutex_lockRW(threadStartMutex);
   // TODO implement
   mutex_unlockRW(threadStartMutex);
   return 0;
}

static LocalStorage initThread(unsigned int threadId) {
   // TODO implement
   return NULL;
}

bool t_wait(int i, int millis) {
   // TODO implement
   return true;
}

static int indexOfLocal(unsigned int id) {
   // TODO implement
   return -1;
}

jmp_buf *_threadLocalJumpBuf(bool push, bool pop) {
   jmp_buf *p;

   List list = locals[indexOfLocal(GET_THREAD_ID)].jumpBuffers;
   if (push) {
      p = malloc(sizeof(*p));
      list_push(list, p);
   }
   if (pop) {
      p = list_pop(list);
      free(p);
   }
   return list_get(list, list_size(list) - 1);
}

int t_threadId() {
   return indexOfLocal(GET_THREAD_ID);
}