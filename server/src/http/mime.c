#include "mime.h"

Map mimeTypes = {0, 0, NULL};

#define put(x, y) map_put(&(mimeTypes), x, y)
#define get(x) map_get(&(mimeTypes), x)

void mimeInit() {
   map_init(&mimeTypes);
   put("aac", "audio/aac");
   put(".bmp", "image/bmp");
   put(".css", "text/css");
   put(".csv", "text/csv");
   put(".gif", "image/gif");
   put(".htm", "text/html");
   put(".html", "text/html");
   put(".jpeg", "image/jpeg");
   put(".jpg", "image/jpeg");
   put(".js", "text/javascript");
   put(".json", "application/json");
   put(".mid", "audio/midi");
   put(".midi", "audio/midi");
   put(".mjs", "application/javascript");
   put(".mp3", "audio/mpeg");
   put(".mpeg", "video/mpeg");
   put(".otf", "font/otf");
   put(".png", "image/png");
   put(".pdf", "application/pdf");
   put(".svg", "image/svg+xml");
   put(".tif", "image/tiff");
   put(".tiff", "image/tiff");
   put(".ttf", "font/ttf");
   put(".txt", "text/plain");
   put(".wav", "audio/wav");
   put(".weba", "audio/webm");
   put(".webm", "video/webm");
   put(".webp", "image/webp");
   put(".woff", "font/woff");
   put(".woff2", "font/woff2");
   put(".xhtml", "application/xhtml+xml");
   put(".zip", "application/zip");
}

char *mimeGet(char *name) {
   char *ext = name;
   char *p;
   while (true) {
      p = strstr(ext + 1, ".");
      if (p == NULL) break;
      ext = p;
   }
   char loweredExt[10];
   lowercase(ext, loweredExt, 9);
   char *res = get(loweredExt);
   return res == NULL ? "application/octet-stream" : res;
}
