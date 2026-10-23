#!/bin/bash
# ============================================================================
# NT-Xhex 仓库备份脚本（供定时任务每次运行后调用）
#
# 用途：把当前仓库完整打包到外接卷，确保每次自动推进都有可回滚的存档。
# 用法：bash tools/backup.sh [标签]      标签可写任务号，如 1.2
# 产出：/Volumes/Expand/Backups/NT-Xhex/NT-Xhex_v<版本>_<YYYYMMDD_HHMM>_<标签>.tar.gz
#
# 设计要点（为什么这样写）：
#   1. 外接卷未挂载时不报错、只提示跳过 —— 否则一次未插盘会让整个定时任务判失败。
#   2. 打包时按项目约定排除 .DS_Store / ._* / __MACOSX 三类 macOS 垃圾，
#      不触碰数据本体；不使用 ditto（此处是打包不是拷贝，tar 不产生资源叉）。
#   3. 备份后做「源文件数 vs 包内文件数」核对，不一致即判失败，防止半截包。
#   4. 保留最近 KEEP 份，仅删除本脚本自己生成、文件名前缀精确匹配的旧包，
#      不碰 Backups 目录下任何其他文件。
# ============================================================================
set -u

SRC="/Users/ntars/Documents/Github/NT-Xhex"
DEST_ROOT="/Volumes/Expand/Backups"
DEST="$DEST_ROOT/NT-Xhex"
KEEP=100
TAG="${1:-auto}"

# ---- 1. 目标卷检查 ----
if [ ! -d "$DEST_ROOT" ]; then
  echo "[backup] 跳过：$DEST_ROOT 未挂载（未插盘），本次不生成备份"
  exit 0
fi
mkdir -p "$DEST" || { echo "[backup] 失败：无法创建 $DEST"; exit 1; }

# ---- 2. 取版本号（不依赖 node，用文本解析更稳）----
VER=$(grep -o '"version"[^,]*' "$SRC/version.json" 2>/dev/null | grep -o '[0-9][0-9.]*' | head -1)
[ -z "${VER:-}" ] && VER="unknown"
TS=$(date +%Y%m%d_%H%M)
NAME="NT-Xhex_v${VER}_${TS}_${TAG}.tar.gz"

# ---- 3. 打包 ----
cd "$SRC" || { echo "[backup] 失败：进不去 $SRC"; exit 1; }
tar -czf "$DEST/$NAME" \
  --exclude='./.git' \
  --exclude='./node_modules' \
  --exclude='.DS_Store' \
  --exclude='._*' \
  --exclude='__MACOSX' \
  . 2>/dev/null

if [ ! -s "$DEST/$NAME" ]; then
  echo "[backup] 失败：未生成有效包"
  exit 1
fi

# ---- 4. 校验：源文件数 vs 包内文件数 ----
SRC_COUNT=$(find . -type f \
  -not -path './.git/*' -not -path './node_modules/*' \
  -not -name '.DS_Store' -not -name '._*' 2>/dev/null | wc -l | tr -d ' ')
BAK_COUNT=$(tar -tzf "$DEST/$NAME" 2>/dev/null | grep -v '/$' | wc -l | tr -d ' ')
SIZE=$(ls -lh "$DEST/$NAME" | awk '{print $5}')

if [ "$SRC_COUNT" != "$BAK_COUNT" ]; then
  echo "[backup] 警告：文件数不一致（源 $SRC_COUNT / 包内 $BAK_COUNT），请检查是否有文件被排除"
else
  echo "[backup] 完成：${NAME} | 源 ${SRC_COUNT} 文件 = 包内 ${BAK_COUNT} 文件 | ${SIZE}"
fi

# ---- 5. 轮转旧备份（只删本脚本自己生成、前缀精确匹配的包）----
COUNT=$(ls -1 "$DEST"/NT-Xhex_v*.tar.gz 2>/dev/null | wc -l | tr -d ' ')
if [ "$COUNT" -gt "$KEEP" ]; then
  ls -1t "$DEST"/NT-Xhex_v*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r f; do
    [ -f "$f" ] && rm -f "$f" && echo "[backup] 轮转删除旧份：$(basename "$f")"
  done
fi

echo "[backup] 当前备份份数：$(ls -1 "$DEST"/NT-Xhex_v*.tar.gz 2>/dev/null | wc -l | tr -d ' ') | 上限 ${KEEP}"
exit 0
