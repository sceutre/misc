#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include "../utils/concurrency.h"
#include "../utils/map.h"
#include "../utils/log.h"
#include "../utils/list.h"
#include "../utils/bytearray.h"
#include "tests.h"

static void testExceptionsB() {
   log_info("B start");
   throw("throwing from B");
   log_info("B done");
}

static void testExceptionsA() {
   try {
      log_info("A start");
      testExceptionsB();
      log_info("A done");
   } catch {
      log_error("caught A: %s", t_local()->error);
      throw("rethrowing from A");
   }
}

static void testExceptions() {
   try {
      log_info("main start");
      testExceptionsA();
      log_info("main done");
   } catch {
      log_error("caught main: %s", t_local()->error);
   }
   log_info("main really done");
}

static void testMap() {
   Map map = map_new();
   map_put(map, "foo", "bar");
   map_put(map, "red", "blue");
   map_put(map, "one", "two");
   log_info("%s => %s", "red", map_get(map, "red"));
   log_info("%s => %s", "one", map_get(map, "one"));
   log_info("%s => %s", "foo", map_get(map, "foo"));
   map_free(map);
}

static void testList() {
   List list = list_new_ex(16, list_freeDirectFn);
   for (int i = 0; i < 100; i++) {
      list_push(list, strdup(i%2 == 0 ? "some string" : "odd"));
   }
   log_info("%d: %s", 50, list_get(list, 50));
   log_info("%d: %s", 51, list_get(list, 51));
   log_info("%d: %s", 52, list_get(list, 52));
   list_free(list);
}

static void testBytearray() {
   Bytearray array = bytearray_new();
   for (int i = 0; i < 26; i++) {
      bytearray_append(array, 'A' + i);
   }
   bytearray_append(array, 0);
   log_info("%s", array->bytes);
   bytearray_free(array);
}


Signal sigA;
Mutex mutexA;
int runningThreads;

void fn() {
   log_info("hello from thread %d", t_threadId());
   mutex_lockRW(mutexA);
   runningThreads--;
   mutex_unlockRW(mutexA);
   signal_fire(sigA);
}

static void testThreads() {
   sigA = signal_new();
   mutexA = mutex_new();
   runningThreads = 2;

   t_start(fn);
   t_start(fn);

   bool isDone = false;
   while (!isDone) {
      signal_wait(sigA);
      mutex_lockR(mutexA);
      isDone = runningThreads == 0;
      mutex_unlockR(mutexA);
   }

   log_info("goodbye from main");
}

void testAll() {
   log_info("** testExceptions"); testExceptions();
   log_info("** testMap"); testMap();
   log_info("** testList"); testList();
   log_info("** testThreads"); testThreads();
   log_info("** testBytearray"); testBytearray();
}