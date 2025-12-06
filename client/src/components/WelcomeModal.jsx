// client/src/pages/Dashboard.jsx
import { useContext } from "react";
import { AuthContext } from "../AuthContext";
import { logout } from "../api/authService";
import WelcomeModal from "../components/WelcomeModal";

export default function Dashboard() {
  const { user, setUser } = useContext(AuthContext);

  const doLogout = () => {
    logout();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <div className="w-full min-h-screen bg-gray-900 text-white p-6">

      <WelcomeModal name={user.name} />

      <h1 className="text-2xl mb-4">داشبورد</h1>

      <div className="bg-gray-800 p-4 rounded mb-4">
        <p>نام: {user.name}</p>
        <p>ایمیل: {user.email}</p>
        <p>پلن: {user.plan}</p>
        <p>مصرف امروز: {user.usage.dailyUsed}</p>
      </div>

      <button onClick={doLogout} className="bg-red-600 px-4 py-2 rounded">
        خروج
      </button>
    </div>
  );
}
