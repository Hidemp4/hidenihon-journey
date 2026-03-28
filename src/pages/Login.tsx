import { Separator } from "@/components/ui/separator";
import { useAuthContext } from "@/contexts/AuthContext";
import { ChevronLeft } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { t } from "./Theme";
import { C } from "vitest/dist/chunks/reporters.d.BFLkQcL6.js";

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuthContext();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        login("fake-token-123");
        navigate("/home")
    }

    return (
        <div className="w-full h-screen bg-[#ececec] p-6">
            <div className="bg-white w-14 h-14 rounded-md flex justify-center items-center shadow-sm">
                <ChevronLeft />
            </div>

            <form className="container mt-12 mb-6" onSubmit={handleSubmit}>

                <div className="space-y-3">
                    <h1 className="text-3xl font-semibold">Log In</h1>
                    <p className="text-sm text-[#555] font-medium">Ao fazer login, você concorda com nossos
                        <span className="text-black"> Termos de Uso</span>.
                    </p>
                </div>

                <div className="space-y-5 mt-6">
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="username" className="text-sm text-[#555] font-medium">
                            E-mail:
                            <span className="text-red-500">*</span>
                        </label>
                        <input type="text" id="username" name="username" placeholder="Digite seu e-mail" required
                            className="rounded-xl p-3 border border-gray-300 placeholder:text-sm
                            focus:px-6 focus:outline-none focus:ring-2 focus:ring-[#df2531] transition-all duration-200 autofill:shadow-[0_0_0_30px_#f9f9f9_inset]"
                        />
                    </div>

                    <div className="flex flex-col space-y-2">
                        <label htmlFor="password" className="text-sm text-[#555] font-medium">
                            Password:
                            <span className="text-red-500">*</span>
                        </label>
                        <input type="password" id="password" name="password" placeholder="Digite sua senha" required
                            className="rounded-xl p-3 border border-gray-300 placeholder:text-sm
                            focus:px-6 focus:outline-none focus:ring-2 focus:ring-[#df2531] transition-all duration-200 autofill:shadow-[0_0_0_30px_#f9f9f9_inset]"
                        />
                    </div>

                    <p className="text-sm text-[#555] font-medium">
                        Esqueceu a senha?
                        <span className="text-black"> Recupere aqui</span>
                    </p>

                    <button type="submit"
                        style={{background: t.accent}}
                        className="text-white rounded-xl w-full py-3 font-medium
                    hover:bg-[#c41f29] transition-colors duration-200">
                        Log In
                    </button>
                </div>
            </form >

            <div className="flex items-center gap-3 mb-6">
                <Separator style={{ background: t.accent45 }} className="flex-1" orientation="horizontal" />
                <span className="SeparatorText">Ou</span>
                <Separator style={{ background: t.accent45 }} className="flex-1" orientation="horizontal" />
            </div>

            <div className="space-y-4">
                <button style={{ border: `1px ${t.accent45} solid` }}
                className="flex items-center justify-center gap-3 bg-white rounded-xl w-full py-3 text-sm font-medium hover:bg-[#f0f0f0] transition-colors duration-200">
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-      4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                    </svg>
                    Sign in with Google
                </button>

                <button style={{ border: `1px ${t.accent45} solid` }}
                className="flex items-center justify-center gap-3 bg-white rounded-xl w-full py-3 text-sm font-medium
                hover:bg-[#f0f0f0] transition-colors duration-200">
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                        <path fill="#1970dd" d="M24 5A19 19 0 1 0 24 43A19 19 0 1 0 24 5Z"></path>
                        <path fill="#fff" d="M26.572,29.036h4.917l0.772-4.995h-5.69v-2.73c0-2.075,0.678-3.915,2.619-3.915h3.119v-4.359c-0.548-0.074-1.707-0.236-3.897-0.236c-4.573,0-7.254,2.415-7.254,7.917v3.323h-4.701v4.995h4.701v13.729C22.089,42.905,23.032,43,24,43c0.875,0,1.729-0.08,2.572-0.194V29.036z"></path>
                    </svg>
                    Sign in with Facebook
                </button>
            </div>

            <p className="text-sm text-center text-[#555] font-medium mt-8">
                Não possui conta?
                <span className="text-black"> Cadastre-se aqui</span>
            </p>
        </div >
    );
}