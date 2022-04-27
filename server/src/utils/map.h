#ifndef __MAP_H__
#define __MAP_H__

struct Map_s;
typedef struct Map_s *Map;

typedef bool (*MapCallbackFn)(char *key, void *value, void *arg);

Map map_new();
Map map_new_ex(bool ignoreCase, int initialSize);
void map_iterate(Map map, MapCallbackFn f, void *arg);
void map_free(Map map);
void map_reset(Map map);
bool map_put(Map map, char *key, void *value);
void map_putall(Map map, ...);
bool map_delete(Map map, char *key);
void *map_get(Map map, char *key);
int map_length(Map map);
void map_parseCLI(Map options, char **argv, int argc);

#define map_get_text(map,key) ((char *)map_get(map,key))
#define map_put_text(map,key, value) ((map_put(map,key, (void *)value))

#endif 