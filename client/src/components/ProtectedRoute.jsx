// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children }) {
  const [checked, setChecked] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('ccg_token');
    const guestMode = localStorage.getItem('ccg_guest_mode') === 'true';
    const guestRequests = parseInt(localStorage.getItem('ccg_guest_requests') || '0');

    // کاربر لاگین‌کرده یا مهمان با درخواست‌های باقی‌مانده
    if (token || (guestMode && guestRequests < 5)) {
      setIsAllowed(true);
    } else {
      setIsAllowed(false);
    }
    setChecked(true);
  }, []);

  if (!checked) return null; // loading state

  return isAllowed ? children : <Navigate to="/landing" replace />;
}	
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");
