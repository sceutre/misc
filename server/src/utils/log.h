#ifndef LOG_H
#define LOG_H

#include "utils.h"

#define LOG_VERSION "0.1.0"

typedef void (*log_LockFn)(void *udata, int lock);

enum { LOG_TRACE, LOG_DEBUG, LOG_INFO, LOG_WARN, LOG_ERROR, LOG_FATAL };

#define log_trace(...) log_log(LOG_TRACE, strrchr("/" __FILE__, '/') + 1, __LINE__, __VA_ARGS__)
#define log_debug(...) log_log(LOG_DEBUG, strrchr("/" __FILE__, '/') + 1, __LINE__, __VA_ARGS__)
#define log_info(...) log_log(LOG_INFO, strrchr("/" __FILE__, '/') + 1, __LINE__, __VA_ARGS__)
#define log_warn(...) log_log(LOG_WARN, strrchr("/" __FILE__, '/') + 1, __LINE__, __VA_ARGS__)
#define log_error(...) log_log(LOG_ERROR, strrchr("/" __FILE__, '/') + 1, __LINE__, __VA_ARGS__)
#define log_fatal(...) log_log(LOG_FATAL, strrchr("/" __FILE__, '/') + 1, __LINE__, __VA_ARGS__)

void log_init(bool useStderr, int level, char *filename);
void log_set_level(int level);
void log_log(int level, const char *file, int line, const char *fmt, ...);

#endif