import { useAuthContext } from "@/contexts/auth-context-core";
import { Navigate, Outlet } from "react-router-dom";

const PrivateRoute = () => {
    const { token, loading } = useAuthContext();

    if (loading) return <div className="min-h-screen bg-background" />;
    return token ? <Outlet /> : <Navigate to="/login" replace />;
}

export default PrivateRoute;
