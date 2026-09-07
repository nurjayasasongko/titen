export const lessons = [
  {
    id: 'secrets',
    number: 1,
    title: 'Nobody ever sends the password',
    question: 'If my password never crosses the network, what does the server actually check?',
    idea: [
      'Kerberos is built out of one move repeated: I encrypt something with a key only I could have, and you decrypt it with a key only you could have. Nothing secret is ever transmitted — only things that are encrypted with a secret.',
      'Every account in the domain has a key derived from its password, and the domain controller holds a copy of all of them. That is the uncomfortable part people skip past: the KDC can impersonate anyone, because it knows everyone’s key. It is not a referee standing between you and the service; it is the vault.',
      'The service you are connecting to is the opposite. It knows exactly one key — its own. It never contacts the domain controller to ask whether you are allowed in. It simply tries to decrypt the ticket you hand it, and if that works, the ticket must have been issued by something that knew the service’s key.',
    ],
    takeaway:
      'The service trusts your ticket because only the KDC could have encrypted it with the service’s own key. That single fact is what the whole protocol rests on — and what Kerberoasting takes apart.',
    gotcha:
      'Because the service never phones home, disabling an account does not invalidate tickets already issued for it. A ticket is good until it expires, whatever the directory says afterwards.',
  },
  {
    id: 'tgt',
    number: 2,
    title: 'Getting a TGT — the AS exchange',
    question: 'What is a TGT, and why can I not read my own one?',
    idea: [
      'You start by proving you know your password once, in a way the KDC can check: you encrypt the current timestamp with your key and send it along. That is pre-authentication. The KDC decrypts it with its copy of your key, sees a sensible time, and believes you.',
      'What comes back is a ticket-granting ticket. It is encrypted with the krbtgt account’s key, which you will never have — so you carry it around as an opaque blob. That is deliberate: the TGT contains who you are and which groups you are in, and if you could read it you could edit it.',
      'From then on you stop using your password. Every later request presents the TGT instead, which is why the domain controller sees one 4768 for you in the morning and a long tail of 4769s for the rest of the day.',
    ],
    takeaway:
      'A TGT is a sealed statement from the KDC saying “this is who they are”, encrypted so that only the KDC can open it. You hold it; you cannot read it.',
    gotcha:
      'If an account is set to “Do not require Kerberos preauthentication”, the KDC will hand back an encrypted blob to anyone who asks for it — no proof required. That blob is crackable offline, which is AS-REP roasting. It shows in event 4768 as Pre-Authentication Type 0.',
  },
  {
    id: 'ticket',
    number: 3,
    title: 'Getting a service ticket — and who it is sealed for',
    question: 'The KDC gave me a ticket for a database I have never used. Why?',
    idea: [
      'When you want to reach a service, you present your TGT and name the service by its SPN. The KDC checks one thing: that your TGT is valid. It does not check whether you have any business talking to that service — authorisation is the service’s job, later, using the group memberships inside the ticket.',
      'The ticket that comes back has two halves. One is encrypted with a session key you can read. The other is the ticket itself, encrypted with the key of the account the service runs as — so you carry it, hand it over, and the service opens it.',
      'Read that second half again slowly. The domain controller has just handed you something encrypted with a service account’s password-derived key, on request, because you asked politely. If that account is a user account with a human-chosen password, you are now holding an offline password cracking target.',
    ],
    takeaway:
      'Any domain user can request a service ticket for any SPN, and the reply is encrypted with that service account’s key. That is not a bug — it is how the protocol has to work.',
    gotcha:
      'The request is indistinguishable from normal work. A 4769 for a service you have never used looks exactly like a 4769 for one you use daily: same event, same Status 0x0. Only the encryption type, the volume and the identity of the service account give it away.',
  },
  {
    id: 'kerberoast',
    number: 4,
    title: 'Kerberoasting',
    question: 'So how does asking for a ticket turn into someone’s password?',
    idea: [
      'Enumerate every account in the directory that has an SPN and is a user account rather than a computer. Ask the KDC for a service ticket for each one, specifically requesting RC4. Save the replies. Walk away from the network entirely and start guessing passwords against them on your own hardware.',
      'RC4 matters because of how the key is built. With RC4-HMAC the key is the account’s NT hash — a single MD4 of the password — so one guess costs one hash. With AES the key comes out of PBKDF2 with 4096 iterations, so the same guess costs four thousand times as much. Nothing else about the attack changes; only the arithmetic.',
      'Which is why the attack is really a directory hygiene problem wearing a protocol costume. It only works against accounts whose passwords a person chose, and only those accounts have SPNs because someone once installed a service the quick way.',
    ],
    takeaway:
      'Kerberoasting needs three things at once: an SPN on a user account, a password a human picked, and RC4 available. Remove any one and it stops being viable.',
    gotcha:
      'No part of the attack is noisy on its own. The requests succeed, nothing fails to authenticate, and the cracking happens on a machine you do not own and cannot see. If you are waiting for a failed logon to tell you, nothing will ever arrive.',
  },
  {
    id: 'detect',
    number: 5,
    title: 'Catching it, and making it pointless',
    question: 'If it all looks like normal traffic, what am I supposed to alert on?',
    idea: [
      'On the shape rather than the event. One account asking for many different service tickets in a short window is unusual for a human. Microsoft’s own guidance for 4769 is to monitor for a ticket encryption type other than 0x11 and 0x12, and RC4 requests are what the tooling asks for by default.',
      'Then there is the trap you can set. Create a service account nobody uses, give it an SPN, a long random password, and no permissions anywhere — a honeypot. No legitimate process will ever request a ticket for it, so a single 4769 naming that account is worth an alert on its own, with no threshold and no tuning.',
      'But detection is the consolation prize. The real answer is to make the tickets not worth cracking: move service accounts to group managed service accounts, where the domain picks a 240-character password and rotates it, and turn RC4 off so the tickets that do get taken are protected by AES.',
    ],
    takeaway:
      'Detect on volume and on encryption type, and plant a honeypot SPN for a signal that needs no tuning. Then fix it properly with gMSAs and AES so the answer stops mattering.',
    gotcha:
      'Turning RC4 off across a domain breaks anything that still needs it, and you will not find out from a lab. Check the ticket encryption types actually in use in your own 4769 traffic first — the answer is usually a small number of ancient systems.',
  },
]
