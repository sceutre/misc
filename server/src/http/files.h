#ifndef FILES_H
#define FILES_H

#include "../utils/utils.h"
#include "http.h"
#include "mime.h"
#include "web.h"

void files_addDir(char *name, char *methodPattern, char *urlPattern, char *docroot, bool cache);
void files_addFile(char *name, char *methodPattern, char *urlPattern, char *filename, int status, bool cache);

#endif