#include "../utils/log.h"

static void render_open_wikilink_span2(MD_HTML* r, const MD_SPAN_WIKILINK_DETAIL* det) {
    RENDER_VERBATIM(r, "<a href=\"");
    render_attribute(r, &det->target, render_html_escaped);
    RENDER_VERBATIM(r, "\">");
    r->flags = r->flags | MD_HTML_FLAG_INWIKI;
    strncpy(r->last_wiki_target, det->target.text, det->target.size);
    r->last_wiki_target[det->target.size] = 0;
}

static void render_open_li_block2(MD_HTML* r, const MD_BLOCK_LI_DETAIL* det) {
    if (det->is_task) {
        char buf[256];
        snprintf(buf, sizeof(buf), 
            "<li class=\"task-list-item\" data-ix=\"%d\">"
            "<i class=\"icon-check%s\"></i> ", det->task_mark_offset, (det->task_mark == 'x' || det->task_mark == 'X') ? "on" : "off");
        RENDER_VERBATIM(r, buf);
    } else {
       render_open_li_block(r, det);
    }
}

static int leave_span_callback2(MD_SPANTYPE type, void* detail, void* userdata) {
    MD_HTML* r = (MD_HTML*) userdata;
    if (r->image_nesting_level <= 0 && type == MD_SPAN_WIKILINK) {
       RENDER_VERBATIM(r, "</a>"); 
       r->flags = r->flags & ~MD_HTML_FLAG_INWIKI;
       return 0;
    }
    return leave_span_callback(type, detail, userdata);
}

static void render_html_escaped2(MD_HTML* r, const MD_CHAR* data, MD_SIZE size) {
   if (r->flags & MD_HTML_FLAG_INWIKI && strncmp(data, "img ", 4) == 0) {
      log_debug("IN WIKI link{%s} rendering{%.*s}", r->last_wiki_target, size, data);
      RENDER_VERBATIM(r, "<img src=\"img/");
      RENDER_VERBATIM(r, r->last_wiki_target);
      RENDER_VERBATIM(r, "\" ");
      render_verbatim(r, data + 4, size-4);
      RENDER_VERBATIM(r, ">");
   } else {
      render_html_escaped(r, data, size);
   }
}

#undef RENDER_OPEN_WIKILINK_SPAN 
#undef LEAVE_SPAN_CALLBACK 
#undef RENDER_OPEN_LI_BLOCK
#undef RENDER_HTML_ESCAPED
#define RENDER_OPEN_WIKILINK_SPAN render_open_wikilink_span2
#define LEAVE_SPAN_CALLBACK leave_span_callback2
#define RENDER_OPEN_LI_BLOCK render_open_li_block2
#define RENDER_HTML_ESCAPED render_html_escaped2