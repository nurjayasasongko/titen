/**
 * The candidate passwords each account type invites. The whole point of the
 * crack scene is that you can *see* the difference between a ring of things a
 * human might pick and a 240-character string the domain generated.
 */
export const wordlists = {
  user: {
    label: 'svc_sql — a human picked this in 2019',
    guesses: [
      'Password1', 'Summer2019', 'Company123', 'Welcome1', 'Sql@dmin',
      'Passw0rd!', 'Autumn2019', 'Server2019', 'Db_Admin1', 'Sql2019!',
    ],
    // the guess in the list that is actually the password
    hitIndex: 8,
    real: 'Db_Admin1',
  },
  computer: {
    label: 'FS01$ — Windows generated this, rotates every 30 days',
    guesses: [
      'ⁿ7¤Kd9!vQ2…', '‹mZ0$xR8pL…', '¥3Wc°eB6tN…', 'jF!2¬oH5uY…', '9pX@wK3zD…',
    ],
    hitIndex: -1,
    real: '120 random characters',
  },
  gmsa: {
    label: 'gmsa_report$ — the domain manages and rotates this',
    guesses: [
      '⟠4h$Zx…240ch', '∆9!kQr…240ch', '◊2¥Wm…240ch', '≈7@pLd…240ch', 'ⱷ5°Nv…240ch',
    ],
    hitIndex: -1,
    real: '240 random characters',
  },
}
