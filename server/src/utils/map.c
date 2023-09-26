#include <stdio.h>
#include <stdbool.h>
#include <stdlib.h>
#include <stdarg.h>
#include "map.h"
#include "utils.h"

struct MapElement_s {
   char *key;
   unsigned long hash;
   void *data;
};
typedef struct MapElement_s *MapElement;

struct Map_s {
   int capacity;
   int size;
   bool ignoreCase;
   MapElement data;
};

#define INITIAL_SIZE 64
#define issame(e,k,h,ignoreCase) (e.hash == h && (ignoreCase ? strcasecmp(k,e.key) : strcmp(k,e.key)) == 0)
#define isempty(e) (e.key == NULL)
#define empty(e) (e.key = NULL)
#define fill(e,k,h,value) (e.data = value, e.key=k, e.hash=h)

void map_init(Map m, int initialSize);

Map map_new() {
   Map m = calloc(1, sizeof(*m));
   map_init(m, INITIAL_SIZE);
   return m;
}

Map map_new_ex(bool ignoreCase, int initialSize) {
   Map m = calloc(1, sizeof(*m));
   map_init(m, initialSize);
   m->ignoreCase = ignoreCase;
   return m;
}

void map_init(Map m, int N) {
   m->data = calloc(N, sizeof(struct MapElement_s));
   m->capacity = N;
   m->size = 0;
   m->ignoreCase = false;
}

void map_reset(Map map) {
   MapElement elem = map->data;
   for (int i=0; i<map->capacity; i++) {
      elem[i].data = NULL;
      elem[i].key = NULL;
      elem[i].hash = 0;
   }
   map->size = 0;
}

void map_iterate(Map map, MapCallbackFn fn, void *arg) {
   MapElement elem = map->data;
   for (int i=0; i<map->capacity; i++) {
      if (!isempty(elem[i])) {
         bool keepGoing = fn(elem[i].key, elem[i].data, arg);
         if (!keepGoing) return;
      }
   }
}

void map_free(Map map) {
   free(map->data);
   free(map);
}

int map_length(Map map) {
   return map->size;
}

static int indexOf(Map map, char *key) {
   if (map->capacity == 0) return -1;
   unsigned long h = hashString(key, map->ignoreCase);
   MapElement array = map->data;
   int mask = map->capacity - 1;
   int i = h & mask;
   while (true) {
      if (isempty(array[i])) return -1;
      if (issame(array[i], key, h, map->ignoreCase)) return i;
      i = (i + 1) & mask;
   }
}

static void grow(Map map) {
   MapElement old = map->data;
   int n = map->capacity;
   map->capacity *= 2;
   map->data = calloc(map->capacity, sizeof(struct MapElement_s));
   map->size = 0;
   for (int i = 0; i < n; i++) {
      if (!isempty(old[i])) {
         map_put(map, old[i].key, old[i].data);
      }
   }
   free(old);
}

bool map_put(Map map, char *key, void *value) {
   unsigned long h = hashString(key, map->ignoreCase);
   MapElement array = map->data;
   int mask = map->capacity - 1;
   int i = h & mask;
   while (true) {
      if (isempty(array[i])) {
         if (map->size + 1 > map->capacity/2) {
            grow(map);
            return map_put(map, key, value);
         }
         map->size++;
         fill(array[i], key, h, value);
         return true;
      }
      if (issame(array[i], key, h, map->ignoreCase)) {
         fill(array[i], key, h, value);
         return false;
      }
      i = (i + 1) & mask;
   }
}


void *map_get(Map map, char *key) {
   int ix = indexOf(map, key);
   return ix < 0 ? NULL : map->data[ix].data;
}

bool map_delete(Map map, char *key) {
   int i = indexOf(map, key);
   if (i < 0) return false;
   MapElement array = map->data;
   int mask = map->capacity - 1;

   int j = i;
   while (true) {
      j = (j + 1) & mask;
      if (isempty(array[j])) break;
      int k = array[j].hash & mask;
      if ( (j > i && (k <= i || k > j)) || (j < i && (k <= i && k > j)) ) {
         fill(array[i], array[j].key, array[j].hash, array[j].data);
         i = j;
      }
   }
   empty(array[i]);
   return true;
}

void map_putall(Map map, ...) {
   va_list args;
   va_start(args, map);
   while (true) {
      char *key = va_arg(args, char*);
      if (key == NULL) break;
      void *val = va_arg(args, void*);
      map_put(map, key, val);
   }
   va_end(args);
}

void map_parseCLI(Map options, char **argv, int argc) {
   for (int i = 1; i < argc; i++) {
      char *p = argv[i];
      if (*(p++) == '-' && *(p++) == '-') {
         char *val = map_get(options, p);
         if (val != NULL) {
            if (strcmp(p, "help") == 0) {
               map_put(options, p, "true");
            } else {
               i++;
               if (i < argc) {
                  map_put(options, p, argv[i]);
                  continue;
               }
            }
         }
      }
   }
}
