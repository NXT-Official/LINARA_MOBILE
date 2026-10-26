import type { MessageKey } from "./tl";

export const en: Record<MessageKey, string> = {
  "language.label": "Language",
  "language.current": "Language: {language}",

  "tabs.today": "Today",
  "tabs.week": "My week",
  "tabs.pantry": "Pantry",
  "tabs.pay": "My pay",
  "tabs.record": "My record",
  "header.pantry": "Pantry and market",

  "common.back": "Back",
  "common.sendToManager": "Send to manager",
  "common.email": "Email",
  "common.emailPlaceholder": "e.g. rosa@gmail.com",
  "common.password": "Password",
  "common.haveAccount": "Have an account? Sign in",
  "common.backToSignIn": "Back to sign in",
  "common.tryAgain": "Try again",

  "welcome.subtitle": "Welcome! Enter the invite code from your employer to start.",
  "welcome.codeLabel": "Invite code",
  "welcome.codeHint": "6 letters and numbers",
  "welcome.codeLength": "The invite code has {count} characters.",
  "welcome.continue": "Continue",

  "signIn.title": "Welcome back",
  "signIn.subtitle": "For employers and household helpers. Sign in with your email and password.",
  "signIn.passwordPlaceholder": "Enter your password",
  "signIn.submit": "Sign in",
  "signIn.failed": "Couldn't sign in.",
  "signIn.forgot": "Forgot your password?",
  "signIn.create": "No account yet? Create one",

  "create.title": "Create an account",
  "create.subtitle": "Which one are you?",
  "create.helperTitle": "I'm a household helper",
  "create.helperBody": "I work in a home. I'll join with the invite code from my employer.",
  "create.employerTitle": "I'm an employer",
  "create.employerBody": "I run a household. Set it up, then invite the people who work in it.",

  "forgot.title": "Forgot your password?",
  "forgot.subtitle": "Enter your account's email. We'll send you a link to make a new one.",
  "forgot.invalidEmail": "Enter your full email address, e.g. rosa@gmail.com.",
  "forgot.failed": "The reset link wasn't sent.",
  "forgot.sentTitle": "The link for a new password is on its way!",
  "forgot.sentBody":
    "Check your email. If {email} has an account, there's a link there to make a new password.",
  "forgot.sentHint":
    "Can't find it? Look in the Spam or Promotions folder. After setting a new password, come back here and sign in.",
  "forgot.send": "Send the reset link",
  "forgot.resend": "Send again",
  "forgot.resendIn": "Send again ({seconds}s)",
  "forgot.otherEmail": "Use a different email",

  "review.step": "Step 2 of 3",
  "review.title": "Check first: is this what you agreed?",
  "review.notFound": "We couldn't find that code, or it was already used. Check it and try again.",
  "review.flagged":
    "Thank you. We told your manager. You can still continue, or wait until it's fixed.",
  "review.name": "Name",
  "review.station": "Job",
  "review.shift": "Shift hours",
  "review.restDay": "Rest day",
  "review.wage": "Monthly pay",
  "review.somethingWrong": "Something wrong? →",
  "review.join": "Correct, join",
  "review.continue": "Correct, continue",
  "review.joinFailed": "Couldn't join. Try again.",
  "review.legal": "By joining, you agree to Linara's {terms} and {privacy}.",
  "review.terms": "terms",
  "review.privacy": "privacy policy",

  "flag.eyebrow": "Report a mistake",
  "flag.title": "Something wrong?",
  "flag.subtitle":
    "What's wrong? Just tell us and we'll let your manager know. You don't have to agree yet.",
  "flag.which": "Which detail?",
  "flag.wage": "Pay",
  "flag.shift": "Shift hours",
  "flag.restDay": "Rest day",
  "flag.station": "Job",
  "flag.note": "Note (if any)",
  "flag.notePlaceholder": "E.g. We agreed on ₱8,500 a month, not ₱8,000.",
  "flag.failed": "The report wasn't sent.",
  "flag.cancel": "Never mind",

  "claim.step": "Step 3 of 3",
  "claim.title": "This account is yours.",
  "claim.intro":
    "It's {mine}. You'll see your work and pay record here, and you can download it as a PDF any time.",
  "claim.introMine": "all yours",
  "claim.emailLabel": "Your email address",
  "claim.emailInvalid": "That email address isn't valid.",
  "claim.passwordShort": "The password needs at least {count} characters.",
  "claim.passwordMismatch": "The passwords don't match.",
  "claim.passwordPlaceholder": "Make a password",
  "claim.confirmLabel": "Repeat the password",
  "claim.confirmPlaceholder": "Type the password again",
  "claim.privacy":
    "It's stored safely. This password is yours alone, and your manager can't see it.",
  "claim.returning":
    "Have an account from an earlier household? Use the same email and password. You'll just join the new household, and your earlier record stays with you.",
  "claim.failed": "The account couldn't be claimed.",
  "claim.submit": "Claim my account",

  "startup.title": "This is taking a while",
  "startup.body": "The internet may be slow. Try again, or sign out and sign in again.",

  "signOut.button": "Sign out",
  "signOut.confirm": "Are you sure? You'll need your email and password to get back in.",
  "signOut.cancel": "Never mind",
  "signOut.failed": "Couldn't sign out.",
  "pay.disabled":
    "Pay and HR features are temporarily disabled while we make sure they follow the law. Your records are kept.",
};
