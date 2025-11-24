#!/bin/bash

OUTPUT="CCG-ok.txt"
SCRIPT_NAME=$(basename "$0")

rm -f "$OUTPUT"

echo "===== FULL PROJECT SOURCE DUMP: CCG =====" >> "$OUTPUT"
echo "Generated on: $(date)" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# لیست پسوند فایل‌های کد
EXTENSIONS="*.js *.jsx *.ts *.tsx *.html *.css *.json *.md *.env *.conf *.yaml *.yml *.sh"

# ساخت شرط پسوندها
EXT_ARGS=""
for EXT in $EXTENSIONS; do
  EXT_ARGS="$EXT_ARGS -o -name \"$EXT\""
done
EXT_ARGS=${EXT_ARGS# -o }

# اجرای find با فیلتر کامل
eval "find . \
  -type f \
  ! -path \"*node_modules*\" \
  ! -path \"./client/dist/*\" \
  ! -path \"./client/public/*\" \
  ! -path \"./dist/*\" \
  ! -path \"./build/*\" \
  ! -path \"./.git/*\" \
  ! -path \"*logs*\" \
  ! -path \"*cache*\" \
  ! -name \"$SCRIPT_NAME\" \
  ! -name \"package-lock.json\" \
  ! -name \"yarn.lock\" \
  ! -name \"pnpm-lock.yaml\" \
  ! -name \"package.json\" \
  ! -name \"*.png\" \
  ! -name \"*.jpg\" \
  ! -name \"*.jpeg\" \
  ! -name \"*.gif\" \
  ! -name \"*.ico\" \
  ! -name \"*.svg\" \
  ! -name \"*.webp\" \
  ! -name \"*.zip\" \
  ! -name \"*.bin\" \
  \( $EXT_ARGS \) \
  -print0" | sort -z | while IFS= read -r -d '' FILE
do
  echo "----------------------------------------" >> "$OUTPUT"
  echo "FILE: $FILE" >> "$OUTPUT"
  echo "----------------------------------------" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  cat "$FILE" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
done

echo "DONE! Output saved to $OUTPUT"

