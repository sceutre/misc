#include "os-windows.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include "../log.h"
#include "../list.h"
#include "../concurrency.h"

struct Mutex_s {
   SRWLOCK srwLock;
};

struct Signal_s {
   HANDLE semaphore;
};

struct Thread_s {
   HANDLE handle;
   unsigned int osId;
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

static int indexOfLocal(unsigned int id);
static unsigned int __stdcall threadStarter(void *func);
static LocalStorage initThread(unsigned int threadId);

LocalStorage t_local() {
   int i = indexOfLocal(GetCurrentThreadId());
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
   initThread(GetCurrentThreadId());
}

Mutex mutex_new() {
   Mutex m = malloc(sizeof(*m));
   InitializeSRWLock(&(m->srwLock));
   return m;
}

void _mutexAcquire(Mutex m, bool readOnly) {
   if (readOnly)
      AcquireSRWLockShared(&(m->srwLock));
   else
      AcquireSRWLockExclusive(&(m->srwLock));
}

void _mutexRelease(Mutex m, bool readOnly) {
   if (readOnly)
      ReleaseSRWLockShared(&(m->srwLock));
   else
      ReleaseSRWLockExclusive(&(m->srwLock));
}

Signal signal_new() {
   Signal s = malloc(sizeof(*s));
   s->semaphore = CreateSemaphore(NULL, 1, 1, NULL);
   return s;
}

void signal_wait(Signal s) {
   WaitForSingleObject(s->semaphore, INFINITE);
}

void signal_fire(Signal s) {
   ReleaseSemaphore(s->semaphore, 1, NULL);
}

int t_start(CallbackFn func) {
   mutex_lockRW(threadStartMutex);
   unsigned int threadId;
   HANDLE h = (HANDLE)_beginthreadex(NULL, 0, threadStarter, (void *)func, 0, &threadId);
   LocalStorage s = initThread(threadId);
   s->thread->handle = h;
   mutex_unlockRW(threadStartMutex);
   return s->thread->id;
}

static LocalStorage initThread(unsigned int threadId) {
   for (int i = 0; i < MAX_THREADS; i++) {
      if (locals[i].storage.thread == NULL) {
         Thread t = malloc(sizeof(*t));
         locals[i].storage.thread = t;
         locals[i].storage.buffer = calloc(THREAD_BUFFER_SIZE, 1);
         locals[i].storage.thread->osId = threadId;
         locals[i].storage.thread->id = i;
         locals[i].jumpBuffers = list_new();
         return &(locals[i].storage);
      }
   }
   return NULL;
}

bool t_wait(int i, int millis) {
   i--;
   int rc = WaitForSingleObject(locals[i].storage.thread->handle, millis);
   if (rc == WAIT_OBJECT_0) {
      CloseHandle(locals[i].storage.thread->handle);
      locals[i].storage.thread->handle = NULL;
      return true;
   }
   return false;
}

static int indexOfLocal(unsigned int id) {
   for (int i = 0; i < MAX_THREADS && locals[i].storage.thread != NULL; i++)
      if (locals[i].storage.thread->osId == id) return i;
   return -1;
}

static unsigned int __stdcall threadStarter(void *func) {
   // this lock acts as a latch so sender can be done init
   mutex_lockRW(threadStartMutex);
   mutex_unlockRW(threadStartMutex);
   ((CallbackFn)func)();
   return 1;
}

jmp_buf *_threadLocalJumpBuf(bool push, bool pop) {
   jmp_buf *p;

   List list = locals[indexOfLocal(GetCurrentThreadId())].jumpBuffers;
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
   return indexOfLocal(GetCurrentThreadId());
}