import type { MessageKey } from "./tl";

export const es: Record<MessageKey, string> = {
  "language.label": "Idioma",
  "language.current": "Idioma: {language}",

  "tabs.today": "Hoy",
  "tabs.week": "Mi semana",
  "tabs.pantry": "Despensa",
  "tabs.pay": "Mi sueldo",
  "tabs.record": "Mi historial",
  "header.pantry": "Despensa y mercado",

  "common.back": "Volver",
  "common.sendToManager": "Enviar al encargado",
  "common.email": "Correo",
  "common.emailPlaceholder": "p. ej. rosa@gmail.com",
  "common.password": "Contraseña",
  "common.haveAccount": "¿Ya tienes cuenta? Inicia sesión",
  "common.backToSignIn": "Volver a iniciar sesión",
  "common.tryAgain": "Reintentar",

  "welcome.subtitle": "¡Bienvenida! Escribe el código de invitación de tu empleador para empezar.",
  "welcome.codeLabel": "Código de invitación",
  "welcome.codeHint": "6 letras y números",
  "welcome.codeLength": "El código de invitación tiene {count} caracteres.",
  "welcome.continue": "Continuar",

  "signIn.title": "Bienvenida de nuevo",
  "signIn.subtitle":
    "Para empleadores y trabajadoras del hogar. Inicia sesión con tu correo y contraseña.",
  "signIn.passwordPlaceholder": "Escribe tu contraseña",
  "signIn.submit": "Iniciar sesión",
  "signIn.failed": "No se pudo iniciar sesión.",
  "signIn.forgot": "¿Olvidaste tu contraseña?",
  "signIn.create": "¿Aún sin cuenta? Crea una",

  "create.title": "Crear una cuenta",
  "create.subtitle": "¿Cuál de los dos eres?",
  "create.helperTitle": "Soy trabajadora del hogar",
  "create.helperBody": "Trabajo en una casa. Me uniré con el código de invitación de mi empleador.",
  "create.employerTitle": "Soy empleador",
  "create.employerBody": "Llevo un hogar. Lo configuro e invito a quienes trabajan en él.",

  "forgot.title": "¿Olvidaste tu contraseña?",
  "forgot.subtitle":
    "Escribe el correo de tu cuenta. Te enviaremos un enlace para crear una nueva.",
  "forgot.invalidEmail": "Escribe tu correo completo, p. ej. rosa@gmail.com.",
  "forgot.failed": "No se envió el enlace.",
  "forgot.sentTitle": "¡Te enviamos el enlace para una nueva contraseña!",
  "forgot.sentBody":
    "Revisa tu correo. Si {email} tiene una cuenta, allí hay un enlace para crear una contraseña nueva.",
  "forgot.sentHint":
    "¿No lo ves? Mira en Spam o Promociones. Después de crear la contraseña, vuelve aquí e inicia sesión.",
  "forgot.send": "Enviar el enlace",
  "forgot.resend": "Enviar de nuevo",
  "forgot.resendIn": "Enviar de nuevo ({seconds}s)",
  "forgot.otherEmail": "Usar otro correo",

  "review.step": "Paso 2 de 3",
  "review.title": "Revisa primero: ¿es lo que acordaron?",
  "review.notFound": "No encontramos ese código, o ya se usó. Revísalo e inténtalo de nuevo.",
  "review.flagged":
    "Gracias. Ya avisamos a tu encargado. Puedes continuar, o esperar a que se corrija.",
  "review.name": "Nombre",
  "review.station": "Trabajo",
  "review.shift": "Horario",
  "review.restDay": "Día de descanso",
  "review.wage": "Sueldo mensual",
  "review.somethingWrong": "¿Algo no está bien? →",
  "review.join": "Correcto, unirme",
  "review.continue": "Correcto, continuar",
  "review.joinFailed": "No se pudo unir. Inténtalo de nuevo.",
  "review.legal": "Al unirte, aceptas los {terms} y la {privacy} de Linara.",
  "review.terms": "términos",
  "review.privacy": "política de privacidad",

  "flag.eyebrow": "Avisar de un error",
  "flag.title": "¿Algo no está bien?",
  "flag.subtitle":
    "¿Qué está mal? Dínoslo y avisaremos a tu encargado. Todavía no tienes que aceptar.",
  "flag.which": "¿Qué dato?",
  "flag.wage": "Sueldo",
  "flag.shift": "Horario",
  "flag.restDay": "Día de descanso",
  "flag.station": "Trabajo",
  "flag.note": "Nota (si hay)",
  "flag.notePlaceholder": "P. ej. Acordamos ₱8,500 al mes, no ₱8,000.",
  "flag.failed": "No se envió el aviso.",
  "flag.cancel": "Mejor no",

  "claim.step": "Paso 3 de 3",
  "claim.title": "Esta cuenta es tuya.",
  "claim.intro":
    "Es {mine}. Aquí verás tu historial de trabajo y sueldo, y puedes descargarlo en PDF cuando quieras.",
  "claim.introMine": "solo tuya",
  "claim.emailLabel": "Tu correo",
  "claim.emailInvalid": "Ese correo no es válido.",
  "claim.passwordShort": "La contraseña necesita al menos {count} caracteres.",
  "claim.passwordMismatch": "Las contraseñas no coinciden.",
  "claim.passwordPlaceholder": "Crea una contraseña",
  "claim.confirmLabel": "Repite la contraseña",
  "claim.confirmPlaceholder": "Escribe la contraseña otra vez",
  "claim.privacy":
    "Se guarda de forma segura. Esta contraseña es solo tuya y tu encargado no puede verla.",
  "claim.returning":
    "¿Tienes cuenta de un hogar anterior? Usa el mismo correo y contraseña. Solo te unirás al nuevo hogar y tu historial anterior se queda contigo.",
  "claim.failed": "No se pudo activar la cuenta.",
  "claim.submit": "Activar mi cuenta",

  "startup.title": "Esto está tardando",
  "startup.body":
    "Puede que el internet esté lento. Inténtalo de nuevo, o cierra sesión y vuelve a entrar.",

  "signOut.button": "Cerrar sesión",
  "signOut.confirm": "¿Segura? Necesitarás tu correo y contraseña para volver a entrar.",
  "signOut.cancel": "Mejor no",
  "signOut.failed": "No se pudo cerrar sesión.",
};
