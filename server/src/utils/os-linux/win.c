#include <stdio.h>
#include <stdbool.h>
#include <stdlib.h>
#include <time.h>
#include "../win.h"
#include "../concurrency.h"


void win_pushMenuItem(char *name, MenuFn callback) {
}

void win_exit() {
   exit(1);
}

void win_run(char *ico, char *tooltip) {
}

void win_openBrowser(char *host, int port, char *uri, bool https) {
 //  ShellExecute(NULL, NULL, t_printf("http%s://%s:%d/%s", https ? "s" : "", host, port, uri), NULL, NULL, SW_SHOW);
}

char *win_getExeFolder() {
   return ".";
}

// on linux first char is the deliminator for the rest
int win_getEnvOpts(char *envStr, char **dest, int size) {
   char tmp[256];
   int count = 0;
   char *miscOpts = getenv(envStr);
   if (miscOpts) {
      char delim = miscOpts[0];
      int i = 1; int start = 1, j = 0;
      do {
         if (miscOpts[i] == 0 || miscOpts[i] == delim) {
            dest[j++] = strndup(miscOpts + start, i - start);
         }
      } while (j < size && miscOpts[i++] != 0);
      return j;
   }
   return 0;
}

void win_getLocalTime(int *hours, int *mins, int *seconds, int *millis) {
   struct timespec clocktm;
   time_t rawtime;
   clock_gettime(CLOCK_REALTIME, &clocktm);
   time(&rawtime);
   struct tm *lt = localtime(&rawtime);
   *hours = lt->tm_hour;
   *mins = lt->tm_min;
   *seconds = lt->tm_sec;
   *millis = clocktm.tv_nsec / 1000000;
}