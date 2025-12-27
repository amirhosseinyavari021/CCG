#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/CCG"
echo "== Fixing Night/Day Theme =="

# بررسی وجود پوشه ها
[ -d "$ROOT/client" ] || { echo "❌ client/ directory not found"; exit 1; }
[ -d "$ROOT/server" ] || { echo "❌ server/ directory not found"; exit 1; }

# تغییرات در فایل‌های CSS
CSS="$ROOT/client/src/index.css"

# اضافه کردن استایل‌های مخصوص تم شب و روز
echo "== Updating CSS for Night and Day Mode =="

# برای حالت شب
sed -i '/\/\* Night Mode \*\//, /\/\* End of Night Mode \*\//d' "$CSS"
echo "/* Night Mode */" >> "$CSS"
echo "body.night-mode {" >> "$CSS"
echo "    background-color: #2c2c2c;" >> "$CSS"
echo "    color: #ffffff;" >> "$CSS"
echo "}" >> "$CSS"
echo "/* End of Night Mode */" >> "$CSS"

# برای حالت روز
sed -i '/\/\* Day Mode \*\//, /\/\* End of Day Mode \*\//d' "$CSS"
echo "/* Day Mode */" >> "$CSS"
echo "body.day-mode {" >> "$CSS"
echo "    background-color: #ffffff;" >> "$CSS"
echo "    color: #000000;" >> "$CSS"
echo "}" >> "$CSS"
echo "/* End of Day Mode */" >> "$CSS"

# اعمال تغییرات در تم
echo "== Applying changes to HTML/JS files =="

# پیدا کردن و تغییر کلاس‌ها برای تم شب و روز در فایل‌های جاوااسکریپت
JS_FILES=$(find "$ROOT/client/src" -type f -name "*.js" -or -name "*.jsx")
for FILE in $JS_FILES; do
    sed -i '/classList.add("night-mode")/d' "$FILE"
    sed -i '/classList.add("day-mode")/d' "$FILE"
    echo 'document.body.classList.add("night-mode");' >> "$FILE"
    echo 'document.body.classList.add("day-mode");' >> "$FILE"
done

# گزارش تغییرات
echo "== Theme changes applied successfully =="

# اقدام برای بازسازی
echo "== Building Frontend ==" 
cd "$ROOT/client"
npm run build

# گزارش نهایی
echo "== DONE. Themes should now function properly for Night/Day Mode. =="

