// client/src/components/ProtectedRoute.jsx
import { useContext } from "react";
import { AuthContext } from "../AuthContext";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);

  if (!user) return <Navigate to="/login" replace />;
  return children;
}
