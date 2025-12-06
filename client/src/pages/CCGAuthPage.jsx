import React from "react";
import "./auth.css";

export default function CCGAuthPage() {
  return (
    <div className="auth-container" dir="rtl">
      
      {/* ------ RIGHT INFO PANEL ------ */}
      <aside className="info-panel">
        <div className="panel-content">

          <div className="badge">CCG – Cando Command Generator</div>

          <h1 className="title">
            دستورات هوشمند بساز،
            <br />
            در دنیای IT بدرخش.
          </h1>

          <p className="subtitle">
            CCG ابزار حرفه‌ای تولید فرمان، اسکریپت و تحلیل کد برای دنیای واقعی DevOps و شبکه.
          </p>

          <div className="features-section">
            <h2 className="features-title">ویژگی‌ها</h2>
            <ul className="features-list">
              <li>تولید هوشمند دستور برای سناریوهای واقعی</li>
              <li>پشتیبانی از Linux، Windows، Cisco، MikroTik و FortiGate</li>
              <li>مقایسه، Refactor و تحلیل خطای اسکریپت‌ها با هوش مصنوعی</li>
            </ul>
          </div>

          <button className="cta-btn">
            ورود به محیط CCG
          </button>

          <footer className="footer">
            <div>
              <span>توسعه‌دهنده:</span> Amirhossein Yavari
            </div>
            <div>
              <span>همکاری آموزشی:</span> Cando Academy
            </div>
          </footer>

        </div>
      </aside>


      {/* ------ LEFT: login form ------ */}
      <main className="login-panel">
        <h2 className="login-title">ورود</h2>
        <p className="login-sub">حساب کاربری خود را وارد کنید</p>

        <form className="login-form">
          <input type="email" placeholder="ایمیل" className="input" />
          <input type="password" placeholder="رمز عبور" className="input" />
          <button className="login-btn">ورود</button>
        </form>
      </main>

    </div>
  );
}
