export const MIN_PASSWORD_LENGTH = 8;
export const MAX_NAME_LENGTH = 120;

export function validateStrongPassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "A senha deve ter letra maiúscula, letra minúscula e número.";
  }
  return "";
}

export function validatePasswords(password: string, confirmPassword: string) {
  return validateStrongPassword(password) || (password !== confirmPassword ? "As senhas não conferem." : "");
}