export function authErrorMessage(error:{code?:string;status?:number}, fallback:string) {
  switch(error.code) {
    case "email_address_not_authorized": return "O envio de confirmação para este endereço ainda não está habilitado. Peça à administração Lume para configurar o serviço de e-mail ou criar seu acesso diretamente.";
    case "signup_disabled": case "email_provider_disabled": return "O cadastro por e-mail está desabilitado. Solicite seu acesso à administração Lume.";
    case "over_email_send_rate_limit": case "over_request_rate_limit": return "O limite de solicitações foi atingido. Aguarde alguns minutos antes de tentar novamente.";
    case "weak_password": return "A senha não atende à política de segurança. Use uma senha mais forte, com letras, números e símbolos.";
    case "email_address_invalid": return "Este endereço de e-mail não foi aceito. Confira o endereço informado.";
    case "captcha_failed": return "Não foi possível validar a proteção do cadastro. Peça à administração para conferir a configuração de acesso.";
    case "unexpected_failure": return "O serviço de cadastro ou e-mail apresentou uma falha. A administração deve conferir os logs de autenticação antes de repetir a tentativa.";
    default: return fallback;
  }
}
