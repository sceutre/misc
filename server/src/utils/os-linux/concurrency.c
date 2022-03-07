#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <stdarg.h>
#include <pthread.h>
#include <semaphore.h>

#include "../log.h"
#include "../list.h"
#include "../concurrency.h"

struct Mutex_s {
   pthread_rwlock_t plock;         
};

struct Signal_s {
   sem_t semaphore;
};

struct Thread_s {
   pthread_t pthread;
   int id;
};

struct PerThread_s {
   struct LocalStorage_s storage;
   List jumpBuffers;
};

#define THREAD_BUFFER_SIZE 20 * 1024
#define MAX_THREADS 50

struct PerThread_s locals[MAX_THREADS];
Mutex threadStartMutex = NULL;

static int indexOfLocal();
static LocalStorage initThread();

LocalStorage t_local() {
   int i = indexOfLocal();
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
   initThread(pthread_self());
}

Mutex mutex_new() {
   Mutex m = malloc(sizeof(*m));
   pthread_rwlock_init(&(m->plock), NULL);
   return m;
}

void _mutexAcquire(Mutex m, bool readOnly) {
   if (readOnly) {
      pthread_rwlock_rdlock(&(m->plock));        
   } else {
      pthread_rwlock_wrlock(&(m->plock));              
   }
}

void _mutexRelease(Mutex m, bool readOnly) {
   pthread_rwlock_unlock(&(m->plock));
}

Signal signal_new() {
   Signal s = malloc(sizeof(*s));
   sem_init(&(s->semaphore), 0, 1);
   return s;
}

void signal_wait(Signal s) {
   sem_wait(&(s->semaphore));
}

void signal_fire(Signal s) {
   sem_post(&(s->semaphore));
}

void *_t_start(void *fn) {
   ((CallbackFn)fn)();
   return NULL;
}

int t_start(CallbackFn func) {
   mutex_lockRW(threadStartMutex);
   pthread_t threadId;
   pthread_create(&threadId, NULL, _t_start, func);
   LocalStorage s = initThread(threadId);
   mutex_unlockRW(threadStartMutex);
   return 0;
}

static LocalStorage initThread(pthread_t id) {
   for (int i = 0; i < MAX_THREADS; i++) {
      if (locals[i].storage.thread == NULL) {
         Thread t = malloc(sizeof(*t));
         locals[i].storage.thread = t;
         locals[i].storage.buffer = calloc(THREAD_BUFFER_SIZE, 1);
         locals[i].storage.thread->pthread = id;
         locals[i].storage.thread->id = i;
         locals[i].jumpBuffers = list_new();
         return &(locals[i].storage);
      }
   }
   return NULL;
}

bool t_wait(int i, int millis) {
  return true;
}

static int indexOfLocal() {
   pthread_t myThread = pthread_self();
   for (int i = 0; i < MAX_THREADS && locals[i].storage.thread != NULL; i++)
      if (pthread_equal(myThread, locals[i].storage.thread->pthread)) return i;
   return -1;
}

jmp_buf *_threadLocalJumpBuf(bool push, bool pop) {
   jmp_buf *p;

   List list = locals[indexOfLocal()].jumpBuffers;
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
   return indexOfLocal();
}