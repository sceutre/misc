#ifndef MY_WIN32_H
#define MY_WIN32_H

typedef void (*MenuFn)();

void win_pushMenuItem(char *name, MenuFn callback);
void win_run(char *ico, char *tooltip);
void win_exit();
void win_openBrowser(char *host, int port, char *uri, bool https);
char *win_getExeFolder();
int win_getEnvOpts(char *varName, char **dest, int size);
void win_getLocalTime(int *hours, int *mins, int *seconds, int *millis);
char win_fileSeperator();
bool win_hasRunLoop();
#endif