export const domainGuard = (req, res, next) => {
  const prompt = req.body?.prompt;
  const userRequest = prompt?.variables?.user_request || '';

  if (!userRequest || !userRequest.trim()) {
    return next();
  }

  const faText = userRequest;

  // موضوعاتی که به CCG ربطی ندارن و باید کلاً رد بشن
  const blockedKeywords = [
    'عشق',
    'رابطه',
    'روانشناسی',
    'سلامتی',
    'سلامت',
    'رژیم',
    'تعبیر خواب',
    'خوابم',
    'انگیزه',
    'افسردگی',
    'دوست دختر',
    'دوست پسر',
    'رابطه عاطفی'
  ];

  if (blockedKeywords.some(k => faText.includes(k))) {
    return res.status(400).json({
      error: '❌ این سؤال خارج از حوزه‌ی CCG است. لطفاً فقط درباره‌ی IT، DevOps، CLI، شبکه و اسکریپت‌ها سؤال بپرسید.'
    });
  }

  // بقیه رو می‌ذاریم بره جلو، خود پرامپت اصلی هم محدودیت داره
  return next();
};
