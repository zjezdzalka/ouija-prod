// Słownik tłumaczeń dla interfejsu ouija
// Użycie: const { t } = useTranslation()
//
// ── Jak dodać własne tłumaczenie ─────────────────────────────────────────────
//
// 1. Znajdź odpowiednią sekcję (lub dodaj nową komentarzem // ── Moja sekcja ──)
// 2. Dodaj klucz w obu językach: pl i en
//    Przykład:
//      pl: { 'moja.sekcja.klucz': 'Tekst po polsku' }
//      en: { 'moja.sekcja.klucz': 'Text in English' }
// 3. Użyj w komponencie:
//      const { t } = useTranslation()
//      <p>{t('moja.sekcja.klucz')}</p>
//
// ── Klucze ze zmiennymi ───────────────────────────────────────────────────────
// Jeśli potrzebujesz wstawić wartość dynamiczną, użyj funkcji tWith():
//   pl: { 'chat.unread': 'Nieprzeczytane: {count}' }
//   en: { 'chat.unread': 'Unread: {count}' }
//   Użycie: tWith('chat.unread', { count: 5 })  →  "Nieprzeczytane: 5"
// ─────────────────────────────────────────────────────────────────────────────

import { useSettings } from '@/context/SettingsContext'

export const translations = {
  pl: {
    // ── Header ──────────────────────────────────────────────────────────────
    'nav.login': 'login',
    'nav.register': 'register',
    'nav.chats': 'chats',
    'nav.logout': 'wyloguj',

    // ── Home ────────────────────────────────────────────────────────────────
    'home.title': 'witaj w ouija!',
    'home.subtitle':
      'dołącz lub stwórz społeczność, współpracuj w zespołach i ciesz się komfortem ouija!',

    // ── Login ────────────────────────────────────────────────────────────────
    'login.title': 'Zaloguj się',
    'login.username': 'Nazwa użytkownika',
    'login.password': 'Hasło',
    'login.submit': 'Zaloguj',
    'login.submitting': 'Logowanie...',
    'login.noAccount': 'Nie masz konta?',
    'login.register': 'Zarejestruj się',
    'login.forgotPassword': 'Zapomniałeś hasła?',
    'login.errorInvalid': 'Nieprawidłowa nazwa użytkownika lub hasło',
    'login.errorServer': 'Brak połączenia z serwerem',
    'login.errorUsernameRequired': 'Nazwa użytkownika jest wymagana',
    'login.errorUsernameShort':
      'Nazwa użytkownika musi mieć co najmniej 3 znaki',
    'login.errorPasswordRequired': 'Hasło jest wymagane',
    'login.errorPasswordShort': 'Hasło musi mieć co najmniej 8 znaków',

    // ── Register ─────────────────────────────────────────────────────────────
    'register.title': 'Zarejestruj się',
    'register.email': 'E-mail',
    'register.username': 'Nazwa użytkownika',
    'register.password': 'Hasło',
    'register.passwordConfirm': 'Powtórz hasło',
    'register.submit': 'Zarejestruj',
    'register.submitting': 'Tworzenie...',
    'register.hasAccount': 'Masz już konto?',
    'register.login': 'Zaloguj się',
    'register.successTitle': 'witaj!',
    'register.successVerifyTitle': 'sprawdź skrzynkę',
    'register.successReady':
      'Twoje konto jest gotowe. Możesz się teraz zalogować.',
    'register.successVerify':
      'Wysłaliśmy link weryfikacyjny na Twój adres e-mail. Kliknij go, aby aktywować konto.',
    'register.goToLogin': 'przejdź do',
    'register.goToLoginLink': 'logowania',
    'register.errorServer': 'Brak połączenia z serwerem',
    'register.errorEmailRequired': 'E-mail jest wymagany',
    'register.errorEmailInvalid': 'Nieprawidłowy format e-mail',
    'register.errorUsernameRequired': 'Nazwa użytkownika jest wymagana',
    'register.errorUsernameShort':
      'Nazwa użytkownika musi mieć co najmniej 3 znaki',
    'register.errorUsernameLong':
      'Nazwa użytkownika może mieć maksymalnie 32 znaki',
    'register.errorUsernameChars':
      'Dozwolone znaki: litery, cyfry, podkreślnik',
    'register.errorPasswordRequired': 'Hasło jest wymagane',
    'register.errorPasswordShort': 'Hasło musi mieć co najmniej 8 znaków',
    'register.errorPasswordUppercase':
      'Hasło musi zawierać co najmniej jedną wielką literę',
    'register.errorPasswordDigit':
      'Hasło musi zawierać co najmniej jedną cyfrę',
    'register.errorPasswordConfirmRequired': 'Powtórzenie hasła jest wymagane',
    'register.errorPasswordConfirmMatch': 'Hasła nie są identyczne',
    'register.errorEmailExists': 'Konto z tym e-mailem już istnieje',
    'register.errorUsernameExists': "Konto z tym username'm już istnieje",

    // ── Forgot Password ───────────────────────────────────────────────────────
    'forgotPassword.title': 'Zapomniałem hasła',
    'forgotPassword.email': 'E-mail',
    'forgotPassword.submit': 'Wyślij link resetujący',
    'forgotPassword.submitting': 'Wysyłanie...',
    'forgotPassword.rememberedIt': 'Pamiętasz hasło?',
    'forgotPassword.backToLogin': 'Zaloguj się',
    'forgotPassword.doneTitle': 'sprawdź skrzynkę',
    'forgotPassword.doneText':
      'Jeśli ten adres jest zarejestrowany, wysłaliśmy link resetujący. Link wygasa po 1 godzinie.',
    'forgotPassword.backTo': 'wróć do',
    'forgotPassword.backToLoginLink': 'logowania',
    'forgotPassword.errorEmailRequired': 'E-mail jest wymagany',
    'forgotPassword.errorEmailInvalid': 'Nieprawidłowy format e-mail',

    // ── Reset Password ────────────────────────────────────────────────────────
    'resetPassword.title': 'nowe hasło',
    'resetPassword.newPassword': 'Nowe hasło',
    'resetPassword.confirmPassword': 'Powtórz hasło',
    'resetPassword.submit': 'Ustaw nowe hasło',
    'resetPassword.submitting': 'Zapisywanie...',
    'resetPassword.doneTitle': 'hasło zmienione',
    'resetPassword.doneText':
      'Twoje hasło zostało zmienione. Możesz się teraz zalogować.',
    'resetPassword.goTo': 'przejdź do',
    'resetPassword.goToLoginLink': 'logowania',
    'resetPassword.invalidLinkTitle': 'nieprawidłowy link',
    'resetPassword.invalidLinkText':
      'Link resetujący nie zawiera tokenu. Poproś o nowy.',
    'resetPassword.requestNew': 'poproś o nowy link',
    'resetPassword.errorPasswordRequired': 'Hasło jest wymagane',
    'resetPassword.errorPasswordShort': 'Hasło musi mieć co najmniej 8 znaków',
    'resetPassword.errorPasswordUppercase':
      'Hasło musi zawierać co najmniej jedną wielką literę',
    'resetPassword.errorPasswordDigit':
      'Hasło musi zawierać co najmniej jedną cyfrę',
    'resetPassword.errorPasswordMatch': 'Hasła nie są identyczne',
    'resetPassword.errorConfirmRequired': 'Powtórzenie hasła jest wymagane',
    'resetPassword.errorServer': 'Wystąpił błąd sieci. Spróbuj ponownie.',

    // ── Verify Email ──────────────────────────────────────────────────────────
    'verifyEmail.titleLoading': 'weryfikacja...',
    'verifyEmail.titleDone': 'zweryfikowano ✓',
    'verifyEmail.titleError': 'ups',
    'verifyEmail.messageDone':
      'Twój adres e-mail został zweryfikowany. Możesz się teraz zalogować.',
    'verifyEmail.messageNoToken':
      'Brak tokenu weryfikacyjnego w linku. Sprawdź e-mail i spróbuj ponownie.',
    'verifyEmail.goTo': 'przejdź do',
    'verifyEmail.goToLoginLink': 'logowania',

    // ── Chaty ────────────────────────────────────────────────────────────────
    'chat.loading': 'Ładowanie...',
    'chat.loadingMessages': 'Ładowanie wiadomości...',
    'chat.loadingOlder': 'Ładowanie starszych...',
    'chat.noChat': 'Wybierz czat',
    'chat.searchPlaceholder': 'szukaj czatu lub osoby...',
    'chat.searchLoading': 'Szukam...',
    'chat.searchNoResults': 'Brak wyników',
    'chat.searchSectionChats': 'Czaty',
    'chat.searchSectionPeople': 'Nowe osoby',
    'chat.messagePlaceholder': 'wpisz wiadomość',
    'chat.sendBtn': 'wyślij',
    'chat.sending': '...',
    'chat.attachTitle': 'Dodaj plik',
    'chat.sentByMe': 'Ty',
    'chat.attachment': '📎 Załącznik',
    'chat.sentInvite': 'Wysłano',
    'chat.addFriend': 'Dodaj znajomego',
    'chat.writeMessage': 'Napisz wiadomość',
    'chat.errorUpload': 'Błąd uploadu pliku',
    'chat.errorSend': 'Błąd wysyłania',
    'chat.errorCreate': 'Błąd tworzenia czatu',
    'chat.errorInvite': 'Błąd wysyłania zaproszenia',
    'chat.mute': 'Wycisz powiadomienia',
    'chat.unmute': 'Włącz powiadomienia',
    'chat.muted': 'Wyciszony',
    'chat.someone': 'Ktoś',
    'chat.friendRequestTitle': 'Nowe zaproszenie do znajomych',
    'chat.friendRequestSent': 'wysłał(a) Ci zaproszenie do znajomych',
    'chat.friendAcceptedTitle': 'Zaproszenie zaakceptowane',
    'chat.friendAccepted': 'zaakceptował(a) Twoje zaproszenie',
    'chat.accept': 'akceptuj',
    'chat.reactionTitle': 'Nowa reakcja',
    'chat.reactionBody': 'ktoś zareagował na Twoją wiadomość',

    // ── Status użytkownika ───────────────────────────────────────────────────
    'status.ONLINE': 'Aktywny',
    'status.AWAY': 'Zaraz wracam',
    'status.BUSY': 'Nie przeszkadzać',
    'status.OFFLINE': 'Offline',
    'status.INVISIBLE': 'Niewidoczny',

    // ── Profil ───────────────────────────────────────────────────────────────
    'profile.settings': 'Ustawienia strony',
    'profile.appearance': 'Wygląd',
    'profile.theme': 'Motyw',
    'profile.themeDark': '🌙 Ciemny',
    'profile.themeLight': '☀️ Jasny',
    'profile.fontSize': 'Rozmiar czcionki',
    'profile.fontSmall': 'Mały',
    'profile.fontMedium': 'Średni',
    'profile.fontLarge': 'Duży',
    'profile.language': 'Język',
    'profile.langLabel': 'Język interfejsu',
    'profile.langPl': '🇵🇱 Polski',
    'profile.langEn': '🇬🇧 English',
    'profile.notifications': 'Powiadomienia',
    'profile.notifSound': 'Dźwięk',
    'profile.notifDesktop': 'Powiadomienia systemowe',
    'profile.account': 'Konto',
    'profile.logout': 'Wyloguj się',
    'profile.logoutConfirm': 'Na pewno chcesz się wylogować?',
    'profile.saved': 'Zapisano ✓',
    'profile.friends': 'Znajomi',
    'profile.noFriends': 'Brak znajomych',
    'profile.pendingInvites': 'Zaproszenia do znajomych',
    'profile.sentInvites': 'Wysłane zaproszenia',
    'profile.wantsToBeYourFriend': 'chce zostać Twoim znajomym',
    'profile.awaitingResponse': 'oczekuje na odpowiedź',
    'profile.accept': '✓ Akceptuj',
    'profile.reject': '✕ Odrzuć',
    'profile.cancel': '✕ Cofnij',
    'profile.message': 'Wiadomość',
    'profile.remove': 'Usuń',
    'profile.passwordLabel': 'Hasło:',
    'profile.changePassword': 'Zmień hasło',
    'profile.cancelChange': 'Anuluj',
    'profile.savePassword': 'Zapisz',
    'profile.newPasswordPlaceholder': 'Nowe hasło (min. 8 znaków)',
    'profile.passwordChanged': 'Hasło zmienione pomyślnie!',
    'profile.changeAvatar': 'Zmień zdjęcie',
    'profile.changePasswordRedirect': 'Zmień hasło przez e-mail',
    'profile.accountCreated': 'Konto założone',
    'profile.accountAge': 'Wiek konta',
    'profile.accountAgeDays': 'dni',
    'profile.errorPasswordRequired': 'Hasło jest wymagane',
    'profile.errorPasswordShort': 'Hasło musi mieć co najmniej 8 znaków',
    'profile.errorPasswordUppercase':
      'Hasło musi zawierać co najmniej jedną wielką literę',
    'profile.errorPasswordDigit': 'Hasło musi zawierać co najmniej jedną cyfrę',
    'profile.errorServer': 'Brak połączenia z serwerem',

    // ── ProfilePopup ──────────────────────────────────────────────────────────
    'profilePopup.about': 'O mnie',
    'profilePopup.details': 'Szczegóły',
    'profilePopup.joinedAt': 'Dołączył {date}',
    'profilePopup.mutuals': 'Wspólni znajomi — {count}',
    'profilePopup.noMutuals': 'Brak wspólnych znajomych',
    'profilePopup.sendMessage': 'Wyślij wiadomość',
    'profilePopup.addFriend': 'Dodaj do znajomych',
    'profilePopup.pendingSent': '⏳ Zaproszenie wysłane',
    'profilePopup.acceptFriend': 'Akceptuj zaproszenie',
    'profilePopup.alreadyFriend': '✓ Znajomy',
    'profilePopup.loadError': 'Nie można załadować profilu',

    // ── GroupInfoPopup ───────────────────────────────────────────────────────
    'chat.groupChatLabel': 'Czat grupowy',
    'groupPopup.members': 'członków',
    'groupPopup.membersLabel': 'Członkowie',
    'groupPopup.you': 'ty',
    'groupPopup.openChat': 'Otwórz czat',

    // ── UserProfile (profil innego użytkownika) ──────────────────────────────
    'userProfile.loading': 'Ładowanie...',
    'userProfile.notFound': 'Nie znaleziono użytkownika',
    'userProfile.friends': 'Znajomi ({count})',
    'userProfile.writeMessage': '💬 Napisz wiadomość',
    'userProfile.addFriend': '+ Dodaj do znajomych',
    'userProfile.pendingSent': '⏳ Zaproszenie wysłane',
    'userProfile.pendingReceived':
      '📩 Chce zostać Twoim znajomym — akceptuj w profilu',
    'userProfile.back': '← Wróć',
    'userProfile.errorAdd': 'Błąd dodawania znajomego',
    'userProfile.errorMessage': 'Błąd tworzenia czatu',

    // ── Wspólne ──────────────────────────────────────────────────────────────
    'common.loading': 'Ładowanie...',
    'common.error': 'Błąd wczytywania'
  },

  en: {
    // ── Header ──────────────────────────────────────────────────────────────
    'nav.login': 'login',
    'nav.register': 'register',
    'nav.chats': 'chats',
    'nav.logout': 'logout',

    // ── Home ────────────────────────────────────────────────────────────────
    'home.title': 'welcome to ouija!',
    'home.subtitle':
      'join or host a community, collaborate in teams and enjoy the comfort of ouija!',

    // ── Login ────────────────────────────────────────────────────────────────
    'login.title': 'Sign in',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.submit': 'Sign in',
    'login.submitting': 'Signing in...',
    'login.noAccount': "Don't have an account?",
    'login.register': 'Sign up',
    'login.forgotPassword': 'Forgot your password?',
    'login.errorInvalid': 'Invalid username or password',
    'login.errorServer': 'Cannot connect to server',
    'login.errorUsernameRequired': 'Username is required',
    'login.errorUsernameShort': 'Username must be at least 3 characters',
    'login.errorPasswordRequired': 'Password is required',
    'login.errorPasswordShort': 'Password must be at least 8 characters',

    // ── Register ─────────────────────────────────────────────────────────────
    'register.title': 'Create account',
    'register.email': 'E-mail',
    'register.username': 'Username',
    'register.password': 'Password',
    'register.passwordConfirm': 'Confirm password',
    'register.submit': 'Sign up',
    'register.submitting': 'Creating...',
    'register.hasAccount': 'Already have an account?',
    'register.login': 'Sign in',
    'register.successTitle': 'welcome!',
    'register.successVerifyTitle': 'check your inbox',
    'register.successReady': 'Your account is ready. You can now log in.',
    'register.successVerify':
      'We sent a verification link to your email address. Click it to activate your account.',
    'register.goToLogin': 'go to',
    'register.goToLoginLink': 'login',
    'register.errorServer': 'Cannot connect to server',
    'register.errorEmailRequired': 'E-mail is required',
    'register.errorEmailInvalid': 'Invalid e-mail format',
    'register.errorUsernameRequired': 'Username is required',
    'register.errorUsernameShort': 'Username must be at least 3 characters',
    'register.errorUsernameLong': 'Username can be at most 32 characters',
    'register.errorUsernameChars':
      'Only letters, digits and underscores are allowed',
    'register.errorPasswordRequired': 'Password is required',
    'register.errorPasswordShort': 'Password must be at least 8 characters',
    'register.errorPasswordUppercase':
      'Password must contain at least one uppercase letter',
    'register.errorPasswordDigit': 'Password must contain at least one digit',
    'register.errorPasswordConfirmRequired': 'Please repeat your password',
    'register.errorPasswordConfirmMatch': 'Passwords do not match',
    'register.errorEmailExists': 'An account with this e-mail already exists',
    'register.errorUsernameExists':
      'An account with this username already exists',

    // ── Forgot Password ───────────────────────────────────────────────────────
    'forgotPassword.title': 'forgot password',
    'forgotPassword.email': 'E-mail',
    'forgotPassword.submit': 'Send reset link',
    'forgotPassword.submitting': 'Sending...',
    'forgotPassword.rememberedIt': 'Remembered it?',
    'forgotPassword.backToLogin': 'Sign in',
    'forgotPassword.doneTitle': 'check your inbox',
    'forgotPassword.doneText':
      'If that address is registered, we sent a reset link. The link expires in 1 hour.',
    'forgotPassword.backTo': 'back to',
    'forgotPassword.backToLoginLink': 'login',
    'forgotPassword.errorEmailRequired': 'E-mail is required',
    'forgotPassword.errorEmailInvalid': 'Invalid e-mail format',

    // ── Reset Password ────────────────────────────────────────────────────────
    'resetPassword.title': 'new password',
    'resetPassword.newPassword': 'New password',
    'resetPassword.confirmPassword': 'Repeat password',
    'resetPassword.submit': 'Set new password',
    'resetPassword.submitting': 'Saving...',
    'resetPassword.doneTitle': 'password updated',
    'resetPassword.doneText':
      'Your password has been changed. You can now log in.',
    'resetPassword.goTo': 'go to',
    'resetPassword.goToLoginLink': 'login',
    'resetPassword.invalidLinkTitle': 'invalid link',
    'resetPassword.invalidLinkText':
      'This reset link is missing a token. Please request a new one.',
    'resetPassword.requestNew': 'request new link',
    'resetPassword.errorPasswordRequired': 'Password is required',
    'resetPassword.errorPasswordShort':
      'Password must be at least 8 characters',
    'resetPassword.errorPasswordUppercase':
      'Password must contain at least one uppercase letter',
    'resetPassword.errorPasswordDigit':
      'Password must contain at least one digit',
    'resetPassword.errorPasswordMatch': 'Passwords do not match',
    'resetPassword.errorConfirmRequired': 'Please repeat your password',
    'resetPassword.errorServer': 'A network error occurred. Please try again.',

    // ── Verify Email ──────────────────────────────────────────────────────────
    'verifyEmail.titleLoading': 'verifying…',
    'verifyEmail.titleDone': 'verified ✓',
    'verifyEmail.titleError': 'oops',
    'verifyEmail.messageDone':
      'Your email has been verified. You can now log in.',
    'verifyEmail.messageNoToken':
      'No verification token found in the link. Check your e-mail and try again.',
    'verifyEmail.goTo': 'go to',
    'verifyEmail.goToLoginLink': 'login',

    // ── Chats ────────────────────────────────────────────────────────────────
    'chat.loading': 'Loading...',
    'chat.loadingMessages': 'Loading messages...',
    'chat.loadingOlder': 'Loading older...',
    'chat.noChat': 'Select a chat',
    'chat.searchPlaceholder': 'search chats or people...',
    'chat.searchLoading': 'Searching...',
    'chat.searchNoResults': 'No results',
    'chat.searchSectionChats': 'Chats',
    'chat.searchSectionPeople': 'New people',
    'chat.messagePlaceholder': 'type a message',
    'chat.sendBtn': 'send',
    'chat.sending': '...',
    'chat.attachTitle': 'Attach file',
    'chat.sentByMe': 'You',
    'chat.attachment': '📎 Attachment',
    'chat.sentInvite': 'Sent',
    'chat.addFriend': 'Add friend',
    'chat.writeMessage': 'Message',
    'chat.errorUpload': 'Upload failed',
    'chat.errorSend': 'Failed to send',
    'chat.errorCreate': 'Failed to create chat',
    'chat.errorInvite': 'Failed to send invite',
    'chat.mute': 'Mute notifications',
    'chat.unmute': 'Unmute notifications',
    'chat.muted': 'Muted',
    'chat.someone': 'Someone',
    'chat.friendRequestTitle': 'New friend request',
    'chat.friendRequestSent': 'sent you a friend request',
    'chat.friendAcceptedTitle': 'Friend request accepted',
    'chat.friendAccepted': 'accepted your friend request',
    'chat.accept': 'accept',
    'chat.reactionTitle': 'New reaction',
    'chat.reactionBody': 'someone reacted to your message',

    // ── User status ──────────────────────────────────────────────────────────
    'status.ONLINE': 'Online',
    'status.AWAY': 'Away',
    'status.BUSY': 'Do not disturb',
    'status.OFFLINE': 'Offline',
    'status.INVISIBLE': 'Invisible',

    // ── Profile ──────────────────────────────────────────────────────────────
    'profile.settings': 'App settings',
    'profile.appearance': 'Appearance',
    'profile.theme': 'Theme',
    'profile.themeDark': '🌙 Dark',
    'profile.themeLight': '☀️ Light',
    'profile.fontSize': 'Font size',
    'profile.fontSmall': 'Small',
    'profile.fontMedium': 'Medium',
    'profile.fontLarge': 'Large',
    'profile.language': 'Language',
    'profile.langLabel': 'Interface language',
    'profile.langPl': '🇵🇱 Polish',
    'profile.langEn': '🇬🇧 English',
    'profile.notifications': 'Notifications',
    'profile.notifSound': 'Sound',
    'profile.notifDesktop': 'Desktop notifications',
    'profile.account': 'Account',
    'profile.logout': 'Log out',
    'profile.logoutConfirm': 'Are you sure you want to log out?',
    'profile.saved': 'Saved ✓',
    'profile.friends': 'Friends',
    'profile.noFriends': 'No friends yet',
    'profile.pendingInvites': 'Friend requests',
    'profile.sentInvites': 'Sent invites',
    'profile.wantsToBeYourFriend': 'wants to be your friend',
    'profile.awaitingResponse': 'awaiting response',
    'profile.accept': '✓ Accept',
    'profile.reject': '✕ Reject',
    'profile.cancel': '✕ Cancel',
    'profile.message': 'Message',
    'profile.remove': 'Remove',
    'profile.passwordLabel': 'Password:',
    'profile.changePassword': 'Change password',
    'profile.cancelChange': 'Cancel',
    'profile.savePassword': 'Save',
    'profile.newPasswordPlaceholder': 'New password (min. 8 chars)',
    'profile.passwordChanged': 'Password changed successfully!',
    'profile.changeAvatar': 'Change photo',
    'profile.changePasswordRedirect': 'Change password via e-mail',
    'profile.accountCreated': 'Account created',
    'profile.accountAge': 'Account age',
    'profile.accountAgeDays': 'days',
    'profile.errorPasswordRequired': 'Password is required',
    'profile.errorPasswordShort': 'Password must be at least 8 characters',
    'profile.errorPasswordUppercase':
      'Password must contain at least one uppercase letter',
    'profile.errorPasswordDigit': 'Password must contain at least one digit',
    'profile.errorServer': 'Cannot connect to server',

    // ── ProfilePopup ──────────────────────────────────────────────────────────
    'profilePopup.about': 'About',
    'profilePopup.details': 'Details',
    'profilePopup.joinedAt': 'Joined {date}',
    'profilePopup.mutuals': 'Mutual friends — {count}',
    'profilePopup.noMutuals': 'No mutual friends',
    'profilePopup.sendMessage': 'Send message',
    'profilePopup.addFriend': 'Add friend',
    'profilePopup.pendingSent': '⏳ Request sent',
    'profilePopup.acceptFriend': 'Accept request',
    'profilePopup.alreadyFriend': '✓ Friends',
    'profilePopup.loadError': 'Could not load profile',

    // ── GroupInfoPopup ───────────────────────────────────────────────────────
    'chat.groupChatLabel': 'Group Chat',
    'groupPopup.members': 'members',
    'groupPopup.membersLabel': 'Members',
    'groupPopup.you': 'you',
    'groupPopup.openChat': 'Open chat',

    // ── UserProfile (other user's profile) ───────────────────────────────────
    'userProfile.loading': 'Loading...',
    'userProfile.notFound': 'User not found',
    'userProfile.friends': 'Friends ({count})',
    'userProfile.writeMessage': '💬 Send message',
    'userProfile.addFriend': '+ Add friend',
    'userProfile.pendingSent': '⏳ Request sent',
    'userProfile.pendingReceived':
      '📩 Wants to be your friend — accept in your profile',
    'userProfile.back': '← Back',
    'userProfile.errorAdd': 'Failed to add friend',
    'userProfile.errorMessage': 'Failed to create chat',

    // ── Common ───────────────────────────────────────────────────────────────
    'common.loading': 'Loading...',
    'common.error': 'Failed to load'
  }
} as const

export type TranslationKey = keyof typeof translations.pl

export function useTranslation() {
  const { settings } = useSettings()
  const lang = settings.language

  function t(key: TranslationKey): string {
    return (
      (translations[lang] as Record<string, string>)[key] ??
      (translations.pl as Record<string, string>)[key] ??
      key
    )
  }

  // Wersja z podstawianiem zmiennych: tWith('chat.unread', { count: 5 })
  function tWith(
    key: TranslationKey,
    vars: Record<string, string | number>
  ): string {
    let text = t(key)
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v))
    }
    return text
  }

  return { t, tWith, lang }
}
