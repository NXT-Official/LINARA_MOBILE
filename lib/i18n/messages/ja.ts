import type { MessageKey } from "./tl";

export const ja: Record<MessageKey, string> = {
  "language.label": "言語",
  "language.current": "言語：{language}",

  "tabs.today": "今日",
  "tabs.week": "今週",
  "tabs.pantry": "食品庫",
  "tabs.pay": "給料",
  "tabs.record": "記録",
  "header.pantry": "食品庫と買い出し",

  "common.back": "戻る",
  "common.sendToManager": "雇い主に送る",
  "common.email": "メールアドレス",
  "common.emailPlaceholder": "例：rosa@gmail.com",
  "common.password": "パスワード",
  "common.haveAccount": "アカウントをお持ちですか？ログイン",
  "common.backToSignIn": "ログインに戻る",
  "common.tryAgain": "もう一度試す",

  "welcome.subtitle": "ようこそ！雇い主から受け取った招待コードを入力して始めましょう。",
  "welcome.codeLabel": "招待コード",
  "welcome.codeHint": "英数字 6 文字",
  "welcome.codeLength": "招待コードは {count} 文字です。",
  "welcome.continue": "次へ",

  "signIn.title": "おかえりなさい",
  "signIn.subtitle":
    "雇い主と家事スタッフ向けです。メールアドレスとパスワードでログインしてください。",
  "signIn.passwordPlaceholder": "パスワードを入力",
  "signIn.submit": "ログイン",
  "signIn.failed": "ログインできませんでした。",
  "signIn.forgot": "パスワードをお忘れですか？",
  "signIn.create": "アカウントがない場合は作成",

  "create.title": "アカウントを作成",
  "create.subtitle": "どちらに当てはまりますか？",
  "create.helperTitle": "家事スタッフです",
  "create.helperBody": "家庭で働いています。雇い主からの招待コードで参加します。",
  "create.employerTitle": "雇い主です",
  "create.employerBody": "家庭を管理しています。設定してから、働く人を招待します。",

  "forgot.title": "パスワードをお忘れですか？",
  "forgot.subtitle":
    "アカウントのメールアドレスを入力してください。新しいパスワードを作るリンクを送ります。",
  "forgot.invalidEmail": "メールアドレスを最後まで入力してください。例：rosa@gmail.com",
  "forgot.failed": "リセット用リンクを送れませんでした。",
  "forgot.sentTitle": "新しいパスワード用のリンクを送りました！",
  "forgot.sentBody":
    "メールを確認してください。{email} のアカウントがあれば、新しいパスワードを作るリンクが届いています。",
  "forgot.sentHint":
    "見つからない場合は、迷惑メールやプロモーションのフォルダを確認してください。新しいパスワードを設定したら、ここに戻ってログインしてください。",
  "forgot.send": "リセット用リンクを送る",
  "forgot.resend": "もう一度送る",
  "forgot.resendIn": "もう一度送る（{seconds} 秒）",
  "forgot.otherEmail": "別のメールアドレスを使う",

  "review.step": "ステップ 2 / 3",
  "review.title": "まず確認：約束した内容と合っていますか？",
  "review.notFound":
    "そのコードが見つからないか、すでに使われています。確認してもう一度お試しください。",
  "review.flagged":
    "ありがとうございます。雇い主に伝えました。このまま進むことも、修正を待つこともできます。",
  "review.name": "名前",
  "review.station": "仕事",
  "review.shift": "勤務時間",
  "review.restDay": "休日",
  "review.wage": "月給",
  "review.somethingWrong": "違うところがありますか？→",
  "review.join": "正しいので参加する",
  "review.continue": "正しいので次へ",
  "review.joinFailed": "参加できませんでした。もう一度お試しください。",
  "review.legal": "参加すると、Linara の{terms}と{privacy}に同意したことになります。",
  "review.terms": "利用規約",
  "review.privacy": "プライバシーポリシー",

  "flag.eyebrow": "間違いを伝える",
  "flag.title": "違うところがありますか？",
  "flag.subtitle":
    "どこが違いますか？教えてくだされば雇い主に伝えます。まだ同意する必要はありません。",
  "flag.which": "どの項目ですか？",
  "flag.wage": "給料",
  "flag.shift": "勤務時間",
  "flag.restDay": "休日",
  "flag.station": "仕事",
  "flag.note": "メモ（あれば）",
  "flag.notePlaceholder": "例：月 ₱8,500 の約束で、₱8,000 ではありません。",
  "flag.failed": "送れませんでした。",
  "flag.cancel": "やめる",

  "claim.step": "ステップ 3 / 3",
  "claim.title": "このアカウントはあなたのものです。",
  "claim.intro":
    "{mine}のアカウントです。仕事と給料の記録をここで確認でき、いつでも PDF でダウンロードできます。",
  "claim.introMine": "あなただけ",
  "claim.emailLabel": "あなたのメールアドレス",
  "claim.emailInvalid": "メールアドレスが正しくありません。",
  "claim.passwordShort": "パスワードは {count} 文字以上にしてください。",
  "claim.passwordMismatch": "パスワードが一致しません。",
  "claim.passwordPlaceholder": "パスワードを作る",
  "claim.confirmLabel": "パスワードをもう一度",
  "claim.confirmPlaceholder": "もう一度パスワードを入力",
  "claim.privacy": "安全に保存されます。このパスワードはあなただけのもので、雇い主には見えません。",
  "claim.returning":
    "以前の家庭でアカウントを作りましたか？同じメールアドレスとパスワードを使ってください。新しい家庭に参加するだけで、以前の記録もそのまま残ります。",
  "claim.failed": "アカウントを受け取れませんでした。",
  "claim.submit": "アカウントを受け取る",

  "startup.title": "時間がかかっています",
  "startup.body":
    "インターネットが遅いかもしれません。もう一度試すか、ログアウトしてからログインし直してください。",

  "signOut.button": "ログアウト",
  "signOut.confirm": "よろしいですか？戻るにはメールアドレスとパスワードが必要です。",
  "signOut.cancel": "やめる",
  "signOut.failed": "ログアウトできませんでした。",
  "pay.disabled":
    "給料と人事の機能は、法律に沿っていることを確認するため一時的に停止しています。記録は保存されています。",
  "plan.tabClosed": "今はこの家庭では使えません。",
};
