BIN_DIR := bin
SRC_DIR := server/src
BUILD_DIR := build
INSTALL_DIR := ../../apps/Misc

ifeq ($(OS),Windows_NT)
  detected_OS := Windows
else
  detected_OS := $(shell uname)
endif

ifeq ($(detected_OS),Windows)
   C_FILES := $(shell find $(SRC_DIR) -name '*.c' -not -path '*/os-linux/*' -not -path '*/os-mac/*')
else ifeq ($(detected_OS),Darwin)
   C_FILES := $(shell find $(SRC_DIR) -name '*.c' -not -path '*/os-linux/*' -not -path '*/os-win32/*')
else
   C_FILES := $(shell find $(SRC_DIR) -name '*.c' -not -path '*/os-win32/*' -not -path '*/os-mac/*')
endif


CC := gcc
CFLAGS = -std=c99 -MT $@ -MMD -MP -MF $(BUILD_DIR)/$*.d 
CFLAGS += -fPIC -DNO_SSL -Wall -Wno-unused-variable -Wno-unused-function -Wno-pointer-sign -Werror

EXE := $(BIN_DIR)/misc.exe
JS := $(BIN_DIR)/srcroot/prod/bundle.js
CSS := $(BIN_DIR)/srcroot/prod/bundle.css
ASSETS := $(BIN_DIR)/assets.info

OBJ_FILES := $(C_FILES:$(SRC_DIR)/%.c=$(BUILD_DIR)/%.o)
DEP_FILES := $(C_FILES:$(SRC_DIR)/%.c=$(BUILD_DIR)/%.d)
DIRS := $(BIN_DIR) $(patsubst $(SRC_DIR)%,$(BUILD_DIR)%,$(shell find $(SRC_DIR) -type d))

.DEFAULT: all
.PHONY: all, clean, run, dirs, fresh, debug, release, web, webwatch, install, css

all: debug

debug: CFLAGS += -g -g3 -O0 -DDEBUG
debug: dirs web $(EXE)

release: CFLAGS += -O2 -s 
release: dirs web $(EXE)

fresh: clean debug

$(OBJ_FILES): $(BUILD_DIR)/%.o: $(SRC_DIR)/%.c $(BUILD_DIR)/%.d
	@$(CC) $(CFLAGS) -c -o $@ $<
	@printf "  \xE2\x9c\x93 $@\n"

$(EXE): $(OBJ_FILES)
	@$(CC) -o $@ $^ -lws2_32 -ladvapi32 -mwindows
	@printf "  \xE2\x9c\x93 $(EXE)\n"

dirs:
	@mkdir -p $(DIRS)
	@mkdir -p $(BIN_DIR)/srcroot/dev
	@mkdir -p $(BIN_DIR)/srcroot/prod/node_flat

clean:
	@rm -rf $(TARGET) $(ASSETS) $(BIN_DIR)/srcroot $(BUILD_DIR)
	@printf "  \xE2\x9c\x93 $@\n"

run: all
	$(BIN_TARGET)

web: $(JS) $(CSS) $(ASSETS)

webwatch: $(CSS) $(ASSETS) 
	@cd web && ./node_modules/.bin/tsc -w

$(JS): $(shell find web/src -name *.ts* -type f)
	@cd web && ./node_modules/.bin/tsc
	@cd .  && web/node_modules/.bin/rollup $(BIN_DIR)/srcroot/dev/main.js --silent  -o $(BIN_DIR)/srcroot/prod/bundle.js -f esm
	@printf "  \xE2\x9c\x93 $@\n"

$(CSS): $(shell find web/src -name *.css -type f)
	@cd web && node_modules/.bin/cleancss src/css/style.css  --skip-rebase -o ../bin/srcroot/prod/bundle.css
	@printf "  \xE2\x9c\x93 $@\n"

$(ASSETS): $(shell find web/assets -type f)
	@cp web/assets/*.html $(BIN_DIR)/srcroot
	@cp -R web/assets/prod/* $(BIN_DIR)/srcroot/prod
	@cp web/node_modules/react*/umd/{react,react-dom}.{development,production}.*js $(BIN_DIR)/srcroot/prod/node_flat 
	@touch $(ASSETS)
	@printf "  \xE2\x9c\x93 $@\n"

$(DEP_FILES): $(BUILD_DIR)/%.d: ;

install: clean release
	@rm -rf $(INSTALL_DIR)/misc.exe $(INSTALL_DIR)/srcroot
	@cp -R $(BIN_DIR)/misc.exe $(BIN_DIR)/srcroot $(INSTALL_DIR)
	@printf "  \xE2\x9c\x93 $@\n"

css: $(CSS)

-include $(DEP_FILES)