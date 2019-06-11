#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include "../utils/concurrency.h"
#include "../utils/map.h"
#include "../utils/log.h"
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

void testAll() {
   testExceptions();
   testMap();
}