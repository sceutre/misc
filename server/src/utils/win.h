#ifndef MY_WIN32_H
#define MY_WIN32_H

#include "list.h"

typedef void (*MenuFn)();

typedef struct {
   char *menuText;
   MenuFn callback;
} MenuItem;

void win_pushMenuItem(char *name, MenuFn callback);
void win_run(char *ico, char *tooltip);
void win_exit();
void win_openBrowser(char *host, int port, char *uri, bool https);
char *win_getExeFolder();
List win_getEnvOpts(char *envStr);
void win_getLocalTime(int *hours, int *mins, int *seconds, int *millis);
#endif