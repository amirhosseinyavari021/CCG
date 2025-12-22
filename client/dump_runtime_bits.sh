set -e

echo "=== main.jsx ==="
sed -n '1,220p' src/main.jsx || true

echo "=== App.jsx ==="
sed -n '1,220p' src/App.jsx || true

echo "=== LanguageContext.jsx ==="
sed -n '1,260p' src/context/LanguageContext.jsx || true

echo "=== ThemeContext.jsx ==="
sed -n '1,260p' src/context/ThemeContext.jsx || true

echo "=== Header.jsx ==="
sed -n '1,260p' src/components/layout/Header.jsx || true

echo "=== MainLayout.jsx ==="
sed -n '1,260p' src/components/layout/MainLayout.jsx || true

echo "=== tailwind.config.* ==="
ls -la tailwind.config.* 2>/dev/null || true
echo "---"
sed -n '1,220p' tailwind.config.js 2>/dev/null || true
sed -n '1,220p' tailwind.config.cjs 2>/dev/null || true
sed -n '1,220p' tailwind.config.mjs 2>/dev/null || true

echo "=== index.css (top) ==="
sed -n '1,120p' src/index.css || true
