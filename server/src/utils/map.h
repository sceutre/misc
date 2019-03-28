#ifndef __MAP_H__
#define __MAP_H__

typedef struct {
   char *key;
   unsigned long hash;
   void *data;
} MapElement;

typedef struct {
   int capacity;
   int size;
   MapElement *data;
} Map;

typedef bool (*MapCallbackFn)(char *key, void *value, void *arg);

Map *map_new();
void map_init(Map *m);
void map_iterate(Map *map, MapCallbackFn f, void *arg);
void map_free(Map *map);
void map_reset(Map *map);
bool map_put(Map *map, char *key, void *value);
void map_putall(Map *map, ...);
bool map_delete(Map *map, char *key);
void *map_get(Map *map, char *key);
int map_length(Map *map);

#define map_get_text(map,key) ((char *)map_get(map,key))
#define map_put_text(map,key, value) ((map_put(map,key, (void *)value))

#endif 