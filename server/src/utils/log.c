/*
 * Copyright (c) 2017 rxi
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

#include "os-windows.h"
#include <stdio.h>
#include <stdbool.h>
#include "log.h"
#include "concurrency.h"
#include "utils.h"

typedef struct {
   FILE *fp;
   int level;
   Mutex *mutex;
} LogOpts;

static LogOpts L = {NULL, LOG_DEBUG, NULL};

static const char *level_names[] = {"TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"};

static void lock(void) {
   mutex_lockRW(L.mutex);
}

static void unlock(void) {
   mutex_unlockRW(L.mutex);
}

void log_init(bool useStderr, int level, char *filename) {
   if (useStderr) {
      L.fp = stderr;
   } else if (filename != NULL) {
      L.fp = fopen(filename, "wb");
   } else {
      L.fp = NULL;
   }
   L.level = level;
   L.mutex = mutex_new();
}

void log_set_level(int level) {
   L.level = level;
}

void log_log(int level, const char *file, int line, const char *fmt, ...) {
   if (level < L.level) {
      return;
   }

   mutex_lockRW(L.mutex);

   SYSTEMTIME lt;
   GetLocalTime(&lt);
   va_list args;
   char lineinfo[100] = {0}, shortFile[10], *lineInfoP = lineinfo;
   if (level == LOG_TRACE) {
      stringCopyUpTo(shortFile, file, '.', 7);
      snprintf(lineinfo, 100, "          {%s/%d}", shortFile, line);
      lineInfoP = lineinfo + (strlen(lineinfo) - 13);
   }
   if (L.fp != NULL) {
      va_start(args, fmt);
      fprintf(L.fp, "%s[%d] %02d:%02d:%02d.%03d %-5s ", lineInfoP, t_threadId(), lt.wHour, lt.wMinute, lt.wSecond, lt.wMilliseconds,
              level_names[level]);
      vfprintf(L.fp, fmt, args);
      va_end(args);
      fprintf(L.fp, "\n");
      fflush(L.fp);
   }
   mutex_unlockRW(L.mutex);
}