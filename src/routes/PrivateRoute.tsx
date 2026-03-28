import { useAuthContext } from "@/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";

const PrivateRoute = () => {
    const { token } = useAuthContext();

    return token ? <Outlet /> : <Navigate to="/login" replace />;
}

export default PrivateRoute;