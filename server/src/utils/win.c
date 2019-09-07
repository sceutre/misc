#include "os-windows.h"
#include <stdio.h>
#include <stdbool.h>
#include <stdlib.h>
#include "win.h"
#include "list.h"
#include "concurrency.h"
#include "utils.h"

#define ICON_ID 1
#define TRAY_MESSAGE (WM_APP + 1)
#define MENU_START (WM_APP + 2)

typedef struct {
   char *menuText;
   MenuFn callback;
} MenuItem;

static NOTIFYICONDATA notifyIconData;
static HWND hWnd;
static List items = NULL;
static char *icoFile;

void win_pushMenuItem(char *name, MenuFn callback) {
   if (items == NULL) {
      items = list_new();
   }
   MenuItem *mi = malloc(sizeof *mi);
   mi->menuText=name;
   mi->callback=callback;
   list_push(items, mi);
}

static void showContextMenu(HWND hWnd) {
   POINT pt;
   GetCursorPos(&pt);
   HMENU hMenu = CreatePopupMenu();
   if (hMenu) {
      for (int i = 1, n = list_size(items); i < n; i++) {
         MenuItem *p = list_get(items, i);
         InsertMenu(hMenu, -1, MF_BYPOSITION, MENU_START + i, p->menuText);
      }
      SetForegroundWindow(hWnd);
      TrackPopupMenu(hMenu, TPM_BOTTOMALIGN, pt.x, pt.y, 0, hWnd, NULL);
      DestroyMenu(hMenu);
   }
}

static LRESULT CALLBACK appWndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam) {
   int ix;
   switch (message) {
      case TRAY_MESSAGE:
         switch (lParam) {
            case WM_LBUTTONDOWN:
            case WM_RBUTTONDOWN:
            case WM_CONTEXTMENU:
               showContextMenu(hWnd);
               break;
            case WM_LBUTTONDBLCLK:
               ((MenuItem *)list_get(items, 0))->callback();
               break;
         }
         break;
      case WM_COMMAND:
         ix = LOWORD(wParam);
         ix -= MENU_START;
         ((MenuItem *)list_get(items, ix))->callback();
         return 1;
      case WM_DESTROY:
         notifyIconData.uFlags = 0;
         Shell_NotifyIcon(NIM_DELETE, &notifyIconData);
         PostQuitMessage(0);
         break;
   }
   return DefWindowProc(hWnd, message, wParam, lParam);
}

static bool init(char *tooltip) {
   static char szClassName[] = "myWindowClass";
   static char szWindowName[] = "myWindowTitle";
   WNDCLASSEX WndClass;
   MSG msg;
   HINSTANCE hInstance = GetModuleHandle(NULL);

   memset(&WndClass, 0, sizeof(WndClass));
   WndClass.cbSize = sizeof(WndClass);
   WndClass.lpszClassName = szClassName;
   WndClass.lpfnWndProc = appWndProc;
   WndClass.hInstance = hInstance;
   WndClass.hIcon = LoadIcon(NULL, IDI_APPLICATION);
   WndClass.hIconSm = LoadIcon(NULL, IDI_APPLICATION);
   WndClass.hCursor = LoadCursor(NULL, IDC_ARROW);
   WndClass.hbrBackground = (HBRUSH)(COLOR_BTNFACE + 1);
   WndClass.lpszMenuName = NULL;

   if (!RegisterClassEx(&WndClass)) return false;
   hWnd = CreateWindowEx(WS_EX_WINDOWEDGE, szClassName, szWindowName, WS_OVERLAPPEDWINDOW /* | WS_VISIBLE */, CW_USEDEFAULT, CW_USEDEFAULT,
                         500, 300, 0, 0, hInstance, 0);
   if (!hWnd) return false;

   memset(&notifyIconData, 0, sizeof(NOTIFYICONDATA));
   notifyIconData.cbSize = sizeof(NOTIFYICONDATA);
   notifyIconData.uID = ICON_ID;
   notifyIconData.uFlags = NIF_ICON | NIF_MESSAGE | NIF_TIP;
   notifyIconData.hWnd = hWnd;
   notifyIconData.uCallbackMessage = TRAY_MESSAGE;
   notifyIconData.hIcon = (HICON)LoadImage(NULL, icoFile, IMAGE_ICON, 32, 32, LR_DEFAULTCOLOR | LR_LOADFROMFILE);
   lstrcpyn(notifyIconData.szTip, tooltip, sizeof(notifyIconData.szTip) / sizeof(WCHAR));

   Shell_NotifyIcon(NIM_ADD, &notifyIconData);
   if (notifyIconData.hIcon && DestroyIcon(notifyIconData.hIcon)) notifyIconData.hIcon = NULL;
   return true;
}

void win_exit() {
   DestroyWindow(hWnd);
}

void win_run(char *ico, char *tooltip) {
   MSG msg;
   icoFile = ico;
   if (!init(tooltip)) return;
   while (GetMessage(&msg, NULL, 0, 0)) {
      TranslateMessage(&msg);
      DispatchMessage(&msg);
   }
}

void win_openBrowser(char *host, int port, char *uri, bool https) {
   ShellExecute(NULL, NULL, t_printf("http%s://%s:%d/%s", https ? "s" : "", host, port, uri), NULL, NULL, SW_SHOW);
}

char *win_getExeFolder() {
   char *last = NULL;
   char *buf = malloc(256 * sizeof(char));
   GetModuleFileName(NULL, buf, 256);
   for (char *p = buf; *p; p++)
      if (*p == '/' || *p == '\\') last = p;
   if (last) *last = 0;
   return buf;
}

int win_getEnvOpts(char *envStr, char **dest, int size) {
   wchar_t wideOpts[1024];
   char tmp[256];
   wchar_t **parsed;
   int count = 0;
   char *miscOpts = getenv(envStr);
   if (miscOpts) {
      dest[0] = "";
      swprintf(wideOpts, 1024, L"%hs", miscOpts);
      parsed = CommandLineToArgvW(wideOpts, &count);
      count = min(count, size-1);
      for (int i = 0; i < count; i++) {
         WideCharToMultiByte(CP_UTF8, 0, parsed[i], -1, tmp, sizeof(tmp), NULL, NULL);
         dest[i + 1] = strdup(tmp);
      }
      return count + 1;
   }
   return 0;
}

void win_getLocalTime(int *hours, int *mins, int *seconds, int *millis) {
   SYSTEMTIME lt;
   GetLocalTime(&lt);
   *hours = lt.wHour;
   *mins = lt.wMinute;
   *seconds = lt.wSecond;
   *millis = lt.wMilliseconds;
}