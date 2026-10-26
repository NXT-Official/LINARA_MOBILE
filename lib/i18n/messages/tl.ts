/**
 * Taglish, the default and the source for every other language. The wording
 * is the app's own, unchanged. A key added here has to be added to each
 * language too, or the typecheck fails. `{name}` is filled in when shown.
 */
export const tl = {
  "language.label": "Wika",
  "language.current": "Wika: {language}",

  "tabs.today": "Ngayon",
  "tabs.week": "Linggo ko",
  "tabs.pantry": "Pantry",
  "tabs.pay": "Sahod ko",
  "tabs.record": "Record ko",
  "header.pantry": "Pantry at palengke",

  "common.back": "Bumalik",
  "common.sendToManager": "Ipadala sa manager",
  "common.email": "Email",
  "common.emailPlaceholder": "hal. rosa@gmail.com",
  "common.password": "Password",
  "common.haveAccount": "May account ka na? Mag-sign in",
  "common.backToSignIn": "Bumalik sa sign in",
  "common.tryAgain": "Subukan ulit",

  "welcome.subtitle":
    "Maligayang pagdating! I-enter mo ang invite code galing sa employer mo para simulan.",
  "welcome.codeLabel": "Invite code",
  "welcome.codeHint": "6 na letra at numero",
  "welcome.codeLength": "Kailangan {count} characters ang invite code, po.",
  "welcome.continue": "Tuloy",

  "signIn.title": "Maligayang pagbabalik",
  "signIn.subtitle": "Para sa employer at kasambahay. Mag-sign in gamit ang email at password mo.",
  "signIn.passwordPlaceholder": "Ilagay ang password mo",
  "signIn.submit": "Mag-sign in",
  "signIn.failed": "Hindi nakapag-sign in.",
  "signIn.forgot": "Nakalimutan ang password?",
  "signIn.create": "Wala pang account? Gumawa ng account",

  "create.title": "Gumawa ng account",
  "create.subtitle": "Alin ka sa dalawa?",
  "create.helperTitle": "Kasambahay ako",
  "create.helperBody":
    "Nagtatrabaho ako sa isang bahay. Sasali ako gamit ang invite code galing sa employer ko.",
  "create.employerTitle": "Employer ako",
  "create.employerBody": "I run a household. Set it up, then invite the people who work in it.",

  "forgot.title": "Nakalimutan ang password?",
  "forgot.subtitle":
    "Ilagay ang email ng account mo. Padadalhan ka namin ng link para gumawa ng bago.",
  "forgot.invalidEmail": "Ilagay ang buong email address mo, hal. rosa@gmail.com.",
  "forgot.failed": "Hindi naipadala ang reset link.",
  "forgot.sentTitle": "Naipadala na ang link para sa bagong password!",
  "forgot.sentBody":
    "I-check ang email mo. Kung may account ang {email}, may link doon para gumawa ng bagong password.",
  "forgot.sentHint":
    "Hindi makita? Tingnan ang Spam o Promotions folder. Pagkatapos mag-set ng bagong password, bumalik dito at mag-sign in.",
  "forgot.send": "Ipadala ang reset link",
  "forgot.resend": "Ipadala ulit",
  "forgot.resendIn": "Ipadala ulit ({seconds}s)",
  "forgot.otherEmail": "Ibang email ang gagamitin",

  "review.step": "Hakbang 2 sa 3",
  "review.title": "Tingnan mo muna — ito ba ang usapan?",
  "review.notFound":
    "Hindi namin nahanap ang code na iyan, o na-claim na ito. Paki-check at subukan ulit.",
  "review.flagged":
    "Salamat — sinabi na namin sa manager mo. Pwede ka pa ring mag-continue, o mag-antay muna ng ayos.",
  "review.name": "Pangalan",
  "review.station": "Trabaho",
  "review.shift": "Oras ng shift",
  "review.restDay": "Rest day",
  "review.wage": "Sahod kada buwan",
  "review.somethingWrong": "May hindi tama? →",
  "review.join": "Tama — sumali",
  "review.continue": "Tama ito — tuloy",
  "review.joinFailed": "Hindi nakasali. Subukan ulit.",
  "review.legal": "Sa pagsali, sumasang-ayon ka sa {terms} at {privacy} ng Linara.",
  "review.terms": "terms",
  "review.privacy": "privacy policy",

  "flag.eyebrow": "Sabihin ang mali",
  "flag.title": "May hindi tama?",
  "flag.subtitle":
    "Alin ang mali? Sabihin mo lang — ipapaalam namin sa manager. Hindi mo pa kailangang pumirma.",
  "flag.which": "Aling detalye?",
  "flag.wage": "Sahod",
  "flag.shift": "Oras ng shift",
  "flag.restDay": "Rest day",
  "flag.station": "Trabaho",
  "flag.note": "Tala (kung meron)",
  "flag.notePlaceholder": "Hal. Ang usapan namin ay ₱8,500 monthly rate, hindi ₱8,000.",
  "flag.failed": "May error sa pagpapadala ng flag.",
  "flag.cancel": "Huwag na",

  "claim.step": "Hakbang 3 sa 3",
  "claim.title": "Iyo ang account na ito.",
  "claim.intro":
    "Ito ay {mine}. Makikita mo rito ang record ng trabaho at sahod mo, at mada-download mo ito bilang PDF anumang oras.",
  "claim.introMine": "iyong-iyo",
  "claim.emailLabel": "Email address mo",
  "claim.emailInvalid": "Hindi valid ang email address, po.",
  "claim.passwordShort": "Dapat may kahit {count} characters ang password.",
  "claim.passwordMismatch": "Hindi magkatugma ang password.",
  "claim.passwordPlaceholder": "Gumawa ng password",
  "claim.confirmLabel": "Ulitin ang password",
  "claim.confirmPlaceholder": "I-type ulit ang password",
  "claim.privacy":
    "Ito ay ise-save nang ligtas sa system. Iyong-iyo lang ang password na ito at hindi ito nakikita ng manager mo.",
  "claim.returning":
    "May account ka na mula sa dating household? Gamitin ang parehong email at password. Sasali ka lang sa bagong household, at kasama pa rin ang record mo noon.",
  "claim.failed": "Hindi nagtagumpay ang pag-claim ng account.",
  "claim.submit": "I-claim ang account ko",

  "startup.title": "Medyo natatagalan",
  "startup.body": "Baka mahina ang internet. Subukan ulit, o mag-sign out at mag-sign in muli.",

  "signOut.button": "Mag-sign out",
  "signOut.confirm": "Sigurado ka? Kailangan mo ang email at password mo para makabalik.",
  "signOut.cancel": "Huwag na",
  "signOut.failed": "Hindi nakapag-sign out.",
  "pay.disabled":
    "Pansamantalang naka-off ang sahod at HR features habang sinisiguro naming sumusunod ito sa batas. Ligtas ang iyong mga record.",
} as const;

export type MessageKey = keyof typeof tl;
