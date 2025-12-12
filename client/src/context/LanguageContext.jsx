import { createContext, useContext, useEffect, useState } from 'react';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  // استفاده از localStorage برای ذخیره زبان انتخاب‌شده
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('ccg_lang') || 'fa'; // پیش‌فرض فارسی
  });

  // ذخیره در localStorage هر وقت زبان تغییر کرد
  useEffect(() => {
    localStorage.setItem('ccg_lang', lang);
  }, [lang]);

  // تابع تغییر زبان
  const changeLanguage = (newLang) => {
    setLang(newLang);
  };

  // توابع ترجمه برای زبان فعلی
  const translations = {
    fa: {
      welcome: 'خوش‌آمدید!',
      selectLanguage: 'زبان پیش‌فرض را انتخاب کنید',
      continue: 'ادامه',
      persian: 'فارسی',
      english: 'English',
      tryWithoutSignup: 'امتحان بدون ثبت‌نام',
      loginOrRegister: 'ثبت‌نام یا ورود',
      guestMode: 'حالت مهمان',
      guestDescription: 'شما می‌توانید 5 درخواست رایگان انجام دهید.',
      registerNow: 'همین حالا ثبت‌نام کنید',
    },
    en: {
      welcome: 'Welcome!',
      selectLanguage: 'Select your default language',
      continue: 'Continue',
      persian: 'فارسی',
      english: 'English',
      tryWithoutSignup: 'Try without signup',
      loginOrRegister: 'Login or Register',
      guestMode: 'Guest Mode',
      guestDescription: 'You can make 5 free requests.',
      registerNow: 'Register Now',
    }
  };

  const t = (key) => translations[lang][key] || key;

  const value = {
    lang,
    changeLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
