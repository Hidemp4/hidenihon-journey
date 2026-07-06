import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { ProgressProvider } from "./hooks/useProgress";

createRoot(document.getElementById("root")!).render(
    <AuthProvider>
        <ProgressProvider>
            <App />
        </ProgressProvider>
    </AuthProvider>
);
