/**
 * Traduz mensagens de erro do Supabase Auth para português.
 */
export function translateAuthError(message: string): string {
  const msg = message.toLowerCase();

  if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) {
    return "Este e-mail já está cadastrado. Faça login ou recupere sua senha.";
  }
  if (msg.includes("pwned") || msg.includes("known to be weak") || msg.includes("easy to guess") || msg.includes("compromised")) {
    return "Esta senha é conhecida por ter vazado em outros sites e é fácil de adivinhar. Por favor, escolha uma senha diferente e mais forte.";
  }
  if (msg.includes("password should be at least") || msg.includes("password is too short")) {
    return "A senha é muito curta. Use pelo menos 6 caracteres.";
  }
  if (msg.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (msg.includes("invalid email")) {
    return "E-mail inválido. Verifique o endereço digitado.";
  }
  if (msg.includes("email not confirmed")) {
    return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (msg.includes("token") && (msg.includes("expired") || msg.includes("invalid"))) {
    return "Link expirado ou inválido. Solicite um novo.";
  }
  if (msg.includes("user not found")) {
    // Intentionally generic — revealing "user not found" enables account enumeration
    return "E-mail ou senha incorretos.";
  }
  if (msg.includes("network") || msg.includes("failed to fetch")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }

  return message;
}
