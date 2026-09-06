# MIRROR-07 — Firebase test build

This build is already connected to the dedicated Firebase Web App for project `h40n-signal`.

## Test locally with Firebase

Do **not** double-click `index.html` when you want to test Firebase. That intentionally opens LOCAL DEMO mode.

Instead:

- Double-click `ABRIR MIRROR.bat` for the public experience.
- Double-click `ABRIR ADMIN.bat` for the CONTROL NODE.

Both use `http://localhost:8765`, which lets the Firebase modules work normally.

## Firebase console checklist

1. Authentication → Sign-in method:
   - Enable Anonymous.
   - Enable Email/Password.
2. Authentication → Settings → Authorized domains:
   - Add `localhost` if it is not already listed.
3. Firestore Database:
   - Create the database.
   - Publish the contents of `firestore.rules` in the Rules tab.
4. Authentication → Users:
   - Add your admin Email/Password user.
   - Copy its UID.
5. Firestore → Data:
   - Create collection `admins`.
   - Create a document whose Document ID is exactly your Authentication UID.
   - Add field `role` (string) = `admin`.
6. Open `ABRIR ADMIN.bat` and sign in.

## Collections used

- `admins/{uid}`
- `transmissions/{autoId}`
- `thoughts/{autoId}`
- `echo_notifications/{autoId}`

## Important

The Firebase Web App config in `firebase-config.js` is public client configuration, not an administrator password. Access is protected by Firebase Authentication and Firestore Security Rules.

## Indexes

This test build sorts the small public/admin lists in the browser, so you do not need to create Firestore composite indexes just to test the system.

## V7 — CONTROL NODE Linux UI
O `admin.html` foi redesenhado para usar a mesma linguagem visual do Noah OS / MIRROR-07.

Funções do CONTROL NODE:
- moderar TRANSMISSIONS: aprovar, rejeitar e arquivar;
- criar, editar, salvar como rascunho, publicar e excluir THOUGHTS;
- criar, ativar/desativar e excluir transmissões do E.C.H.O.;
- SYSTEM STATUS com contadores e informações da sessão;
- broadcasts E.C.H.O. ativos criados pelo admin podem aparecer em tempo real no MIRROR público aberto em outro navegador.


## v8
Corrige a janela de autenticação que permanecia visível após login bem-sucedido no CONTROL NODE.

## V9 — Transmission Reader
- OPEN abre a transmissão completa em uma janela do CONTROL NODE antes da moderação.
- A mensagem completa preserva quebras de linha e permite rolagem para textos longos.
- Transmissões podem ser excluídas permanentemente em qualquer status, inclusive APPROVED.
- Ao excluir uma transmissão APPROVED, ela desaparece do SIGNAL público pelo listener em tempo real.


## v10 — SIGNAL simplificado
- O visitante não escolhe mais categoria de transmissão.
- Toda nova mensagem usa internamente o tipo `MESSAGE`, preservando compatibilidade com as regras atuais do Firestore.
- Texto do SIGNAL foi reescrito como agradecimento à comunidade e convite para comentar o RP ou deixar mensagens para o criador/personagem.
- O PUBLIC RELAY mostra todas as entradas como `SIGNAL`, sem expor categorias.
