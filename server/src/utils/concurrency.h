#ifndef CONCURRENCY_H
#define CONCURRENCY_H

#include <setjmp.h>

#ifndef THROW_QUIETLY
#define THROW_QUIETLY 0
#endif 

struct Mutex_s;
struct Signal_s;
struct Thread_s;
typedef struct Mutex_s *Mutex;
typedef struct Signal_s *Signal;
typedef struct Thread_s *Thread;

struct LocalStorage_s {
   char *buffer;
   int ix;
   char *error;
   Thread thread;
};
typedef struct LocalStorage_s *LocalStorage;

typedef void (*CallbackFn)();

char *_threadLocalPrintf(const char *fmt, ...);
char *_threadLocalAccum(char c);
jmp_buf *_threadLocalJumpBuf(bool push, bool pop);

void t_init();
int t_start(CallbackFn func);
bool t_wait(int id, int millis);
#define t_printf _threadLocalPrintf
#define t_accum(buf,c) do { if (buf == NULL) buf = _threadLocalAccum(c); else _threadLocalAccum(c); } while (0)
void t_reset();
int t_threadId();

LocalStorage t_local();

void _mutexAcquire(Mutex m, bool readOnly);
void _mutexRelease(Mutex m, bool readOnly);
Mutex mutex_new();
#define mutex_lockR(mutex) _mutexAcquire(mutex, true)
#define mutex_lockRW(mutex) _mutexAcquire(mutex, false)
#define mutex_unlockR(mutex) _mutexRelease(mutex, true)
#define mutex_unlockRW(mutex) _mutexRelease(mutex, false)

Signal signal_new();
void signal_wait(Signal s);
void signal_fire(Signal s);

#define try          bool __needCatch = false; if (setjmp(*_threadLocalJumpBuf(true, false)) == 0)
#define catch        else { __needCatch = true; } _threadLocalJumpBuf(false, true); if (__needCatch)
#define throw(str)   do { t_local()->error = t_printf("%s", str); if (!THROW_QUIETLY) { log_error("%s", str); } longjmp(*_threadLocalJumpBuf(false, false), 1); } while (0)

#endif  // CONCURRENCY_H
