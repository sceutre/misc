#include "utils.h"
#include <w32api.h>

#define THREAD_BUFFER_SIZE 20 * 1024

LocalStorage *locals = NULL;
Mutex *threadStartMutex = NULL;

static int indexOfLocal(unsigned int id);
static unsigned int __stdcall threadStarter(void *func);
static LocalStorage *initThread(unsigned int threadId);

LocalStorage *t_local() {
   int i = indexOfLocal(GetCurrentThreadId());
   return locals + i;
}

char *_threadLocalPrintf(const char *fmt, ...) {
   int i = indexOfLocal(GetCurrentThreadId());
   if (i >= 0) {
      va_list args;
      va_start(args, fmt);
      char *s = locals[i].buffer + locals[i].ix;
      int written = vsnprintf(s, THREAD_BUFFER_SIZE - locals[i].ix, fmt, args);
      va_end(args);
      locals[i].ix += written + 1;
      return s;
   }
   return NULL;
}

char *_threadLocalAccum(char c) {
   int i = indexOfLocal(GetCurrentThreadId());
   if (i >= 0) {
      locals[i].buffer[locals[i].ix] = c;
      locals[i].ix++;
      return locals[i].buffer + locals[i].ix - 1;
   }
   return NULL;
}

void t_reset() {
   int i = indexOfLocal(GetCurrentThreadId());
   if (i >= 0) {
      locals[i].ix = 0;
   }
}

void t_init() {
   threadStartMutex = mutex_new();
   initThread(GetCurrentThreadId());
}

Mutex *mutex_new() {
   Mutex *m = malloc(sizeof(Mutex));
   InitializeSRWLock(&(m->srwLock));
   return m;
}

void _mutexAcquire(Mutex *m, bool readOnly) {
   if (readOnly)
      AcquireSRWLockShared(&(m->srwLock));
   else
      AcquireSRWLockExclusive(&(m->srwLock));
}

void _mutexRelease(Mutex *m, bool readOnly) {
   if (readOnly)
      ReleaseSRWLockShared(&(m->srwLock));
   else
      ReleaseSRWLockExclusive(&(m->srwLock));
}

Signal *signal_new() {
   Signal *s = malloc(sizeof(Signal));
   s->semaphore = CreateSemaphore(NULL, 1, 1, NULL);
   return s;
}

void signal_wait(Signal *s) {
   WaitForSingleObject(s->semaphore, INFINITE);
}

void signal_fire(Signal *s) {
   ReleaseSemaphore(s->semaphore, 1, NULL);
}

int t_start(CallbackFn func) {
   mutex_lockRW(threadStartMutex);
   unsigned int threadId;
   HANDLE h = (HANDLE)_beginthreadex(NULL, 0, threadStarter, (void *)func, 0, &threadId);
   LocalStorage *s = initThread(threadId);
   s->thread.handle = h;
   mutex_unlockRW(threadStartMutex);
   return s->thread.id;
}

static LocalStorage *initThread(unsigned int threadId) {
   LocalStorage loc = { 0 };
   loc.buffer = calloc(THREAD_BUFFER_SIZE, 1);
   loc.thread.osId = threadId;
   loc.thread.id = sb_count(locals) + 1;
   sb_push(locals, loc);
   return locals + sb_count(locals) - 1;
}

bool t_wait(int i, int millis) {
   i--;
   int rc = WaitForSingleObject(locals[i].thread.handle, millis);
   if (rc == WAIT_OBJECT_0) {
      CloseHandle(locals[i].thread.handle);
      locals[i].thread.handle = NULL;
      return true;
   }
   return false;
}

static int indexOfLocal(unsigned int id) {
   for (int i = 0; i < sb_count(locals); i++)
      if (locals[i].thread.osId == id) return i;
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
   jmp_buf next, *p;
   int i = indexOfLocal(GetCurrentThreadId());
   if (i >= 0) {
      if (push) {
         p = malloc(sizeof next);
         sb_push(locals[i].jumpBuffers, p);
      }
      if (pop) {
         p = sb_pop(locals[i].jumpBuffers);
         free(p);
      }
      return sb_last(locals[i].jumpBuffers);
   }
   return NULL;
}