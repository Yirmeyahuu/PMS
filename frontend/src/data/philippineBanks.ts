export interface PhilippineBank {
  code: string;
  name: string;
  shortName: string;
  color: string;
  logoUrl: string;
}

export const PHILIPPINE_BANKS: PhilippineBank[] = [
  {
    code: 'BDO',
    name: 'BDO Unibank',
    shortName: 'BDO',
    color: '#003DA5',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/BDO_Unibank_%28logo%29.svg/200px-BDO_Unibank_%28logo%29.svg.png',
  },
  {
    code: 'METROBANK',
    name: 'Metropolitan Bank & Trust Company',
    shortName: 'Metrobank',
    color: '#6B2D8B',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Metrobank_logo.svg/200px-Metrobank_logo.svg.png',
  },
  {
    code: 'BPI',
    name: 'Bank of the Philippine Islands',
    shortName: 'BPI',
    color: '#C41230',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Bank_of_the_Philippine_Islands_logo.svg/200px-Bank_of_the_Philippine_Islands_logo.svg.png',
  },
  {
    code: 'LANDBANK',
    name: 'Land Bank of the Philippines',
    shortName: 'LandBank',
    color: '#006B3F',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c6/Land_Bank_of_the_Philippines_%28logo%29.svg/200px-Land_Bank_of_the_Philippines_%28logo%29.svg.png',
  },
  {
    code: 'PNB',
    name: 'Philippine National Bank',
    shortName: 'PNB',
    color: '#003DA5',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/67/Philippine_National_Bank_logo.svg/200px-Philippine_National_Bank_logo.svg.png',
  },
  {
    code: 'SECURITY',
    name: 'Security Bank',
    shortName: 'Security Bank',
    color: '#00A651',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/fb/Security_Bank_Logo.svg/200px-Security_Bank_Logo.svg.png',
  },
  {
    code: 'CHINABANK',
    name: 'China Banking Corporation',
    shortName: 'Chinabank',
    color: '#D4212C',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/00/China_Banking_Corporation_logo.svg/200px-China_Banking_Corporation_logo.svg.png',
  },
  {
    code: 'UNIONBANK',
    name: 'Union Bank of the Philippines',
    shortName: 'UnionBank',
    color: '#F26522',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/UnionBank_of_the_Philippines_%28logo%29.svg/200px-UnionBank_of_the_Philippines_%28logo%29.svg.png',
  },
  {
    code: 'RCBC',
    name: 'Rizal Commercial Banking Corporation',
    shortName: 'RCBC',
    color: '#003DA5',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c1/RCBC_logo.svg/200px-RCBC_logo.svg.png',
  },
  {
    code: 'EASTWEST',
    name: 'East West Banking Corporation',
    shortName: 'EastWest Bank',
    color: '#1B3A6B',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a5/EastWest_Bank_logo.svg/200px-EastWest_Bank_logo.svg.png',
  },
  {
    code: 'DBP',
    name: 'Development Bank of the Philippines',
    shortName: 'DBP',
    color: '#003DA5',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/40/Development_Bank_of_the_Philippines.svg/200px-Development_Bank_of_the_Philippines.svg.png',
  },
  {
    code: 'AUB',
    name: 'Asia United Bank',
    shortName: 'AUB',
    color: '#C41230',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/af/Asia_United_Bank_logo.svg/200px-Asia_United_Bank_logo.svg.png',
  },
];

export const BANK_MAP = Object.fromEntries(
  PHILIPPINE_BANKS.map((b) => [b.code, b]),
) as Record<string, PhilippineBank>;

/** Returns bank info by code, or undefined if not found */
export const getBankByCode = (code: string): PhilippineBank | undefined => BANK_MAP[code];

/** Check if payment method requires bank selection */
export const requiresBankSelection = (method: string): boolean =>
  method === 'CREDIT_CARD' || method === 'DEBIT_CARD';
