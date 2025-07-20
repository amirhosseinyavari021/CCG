const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();

// فعال کردن trust proxy برای پردازش هدر X-Forwarded-For
app.set('trust proxy', 1); // برای Render، 1 به معنای اعتماد به اولین پراکسی است

// تنظیم rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقیقه
  max: 100, // حداکثر 100 درخواست در هر IP
});
app.use(limiter);

// سرو فایل‌های استاتیک از پوشه client/build
app.use(express.static(path.join(__dirname, 'client/build')));

// هدایت تمام درخواست‌ها به index.html برای پشتیبانی از مسیریابی React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

app.listen(process.env.PORT || 3001, () => {
  console.log('Server running');
});
