static void render_open_wikilink_span2(MD_HTML* r, const MD_SPAN_WIKILINK_DETAIL* det) {
    RENDER_VERBATIM(r, "<a href=\"");
    render_attribute(r, &det->target, render_html_escaped);
    RENDER_VERBATIM(r, "\">");
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
       return 0;
    }
    return leave_span_callback(type, detail, userdata);
}


#undef RENDER_OPEN_WIKILINK_SPAN 
#undef LEAVE_SPAN_CALLBACK 
#undef RENDER_OPEN_LI_BLOCK
#define RENDER_OPEN_WIKILINK_SPAN render_open_wikilink_span2
#define LEAVE_SPAN_CALLBACK leave_span_callback2
#define RENDER_OPEN_LI_BLOCK render_open_li_block2
