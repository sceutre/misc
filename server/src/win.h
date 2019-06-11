#ifndef MY_WIN32_H
#define MY_WIN32_H

typedef void (*MenuFn)();

typedef struct {
   char *menuText;
   MenuFn callback;
} MenuItem;

void win_pushMenuItem(char *name, MenuFn callback);
void win_run(char *ico);
void win_exit();

#endif