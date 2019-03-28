#ifndef MY_WIN32_H
#define MY_WIN32_H

#include "utils/utils.h"

typedef void (*MenuFn)();

typedef struct {
   char *menuText;
   MenuFn callback;
} MenuItem;

#define win_pushMenuItem(items, name, callback) \
   do {                                         \
      MenuItem it = {name, callback};           \
      sb_push(items, it);                       \
   } while (0)

void win_run(MenuItem *items, char *ico);
void win_exit();

#endif