// @flow

export type NetworkType = {
  code: number,
  name: string,
  defaultHashtagGroups?: Array<string>
};

export type AccountType = {
  code: number,
  name: string
};

const types = {
  network: {
    google: {
      code: 0,
      name: 'Google+'
    },
    twitter: {
      code: 1,
      name: 'Twitter',
      defaultHashtagGroups: ['t']
    },
    facebook: {
      code: 2,
      name: 'Facebook',
      defaultHashtagGroups: ['f']
    },
    linkedin: {
      code: 3,
      name: 'Linkedin',
      defaultHashtagGroups: ['l']
    },
    tumblr: {
      code: 4,
      name: 'Tumblr',
      defaultHashtagGroups: ['u']
    },
    appnet: {
      code: 5,
      name: 'APP.NET',
      defaultHashtagGroups: ['a']
    },
    pinterest: {
      code: 6,
      name: 'Pinterest',
      defaultHashtagGroups: ['p']
    },
    instagram: {
      code: 7,
      name: 'Instagram',
      defaultHashtagGroups: ['i']
    }
  },

  account: {
    profile: {
      code: 0,
      name: 'Profile'
    },
    page: {
      code: 1,
      name: 'Page'
    },
    group: {
      code: 2,
      name: 'Group'
    },
    blog: {
      code: 3,
      name: 'Blog'
    },
    privblog: {
      code: 4,
      name: 'Private Blog'
    },
    community: {
      code: 5,
      name: 'Community'
    },
    collection: {
      code: 6,
      name: 'Collection'
    },
    board: {
      code: 7,
      name: 'Board'
    },
    circle: {
      code: 8,
      name: 'Circle'
    }
  },

  hookable: [],
  premiumCodes: [],
  publishableOnlyByExtension: [],

  createCode(networkCode: number, accountCode: number): number {
    // eslint-disable-next-line no-mixed-operators
    return networkCode * 10000 + accountCode;
  },

  createCodeByName(networkName: string, accountName: string): number {
    return types.createCode(types.network[networkName].code, types.account[accountName].code);
  },

  isNetwork(code: number, network: string | number): boolean {
    const n = types.networkByCode(Math.floor(code / 10000));
    return (
      (n && (typeof network === 'string' ? types.networkTypeName(n.code) === network : n.code === network)) || false
    );
  },

  codeToNetworkAndAccount(code: number): Object {
    const network = types.networkByCode(Math.floor(code / 10000));
    const account = types.accountByCode(code % 10000);
    return {
      network: network && {
        name: types.networkName(network.code),
        typeName: types.networkTypeName(network.code),
        code: network.code
      },
      account: account && {
        name: types.accountName(account.code),
        typeName: types.accountTypeName(account.code),
        code: account.code
      }
    };
  },

  findByCode(source: Object, code: number): ?Object {
    // eslint-disable-next-line no-restricted-syntax
    for (const key in source) {
      if (source[key].code === code) {
        return source[key];
      }
    }
    return null;
  },

  networkByCode(networkCode: number): ?NetworkType {
    return types.findByCode(types.network, networkCode);
  },

  accountByCode(accountCode: number): ?AccountType {
    return types.findByCode(types.account, accountCode);
  },

  networkTypeName(networkCode: number): ?string {
    // eslint-disable-next-line no-restricted-syntax
    for (const key in types.network) {
      if (types.network[key].code === networkCode) {
        return key;
      }
    }
    return null;
  },

  accountTypeName(accountCode: number): ?string {
    // eslint-disable-next-line no-restricted-syntax
    for (const key in types.account) {
      if (types.account[key].code === accountCode) {
        return key;
      }
    }
    return null;
  },

  networkName(networkCode: number): ?string {
    const { name } = types.findByCode(types.network, networkCode) || {};
    return name;
  },

  accountName(accountCode: number): ?string {
    const { name } = types.findByCode(types.account, accountCode) || {};
    return name;
  }
};

types.publishableOnlyByExtension.push(types.createCodeByName('google', 'circle'));
types.publishableOnlyByExtension.push(types.createCodeByName('google', 'profile'));
types.publishableOnlyByExtension.push(types.createCodeByName('google', 'community'));
types.publishableOnlyByExtension.push(types.createCodeByName('google', 'collection'));

types.premiumCodes = [
  types.createCodeByName('google', 'profile'),
  types.createCodeByName('google', 'page'),
  types.createCodeByName('facebook', 'profile'),
  types.createCodeByName('facebook', 'page'),
  types.createCodeByName('facebook', 'group'),
  types.createCodeByName('linkedin', 'profile'),
  types.createCodeByName('linkedin', 'page'),
  types.createCodeByName('linkedin', 'group'),
  types.createCodeByName('twitter', 'profile'),
  types.createCodeByName('tumblr', 'profile'),
  types.createCodeByName('pinterest', 'profile')
];

types.hookable = [
  types.createCodeByName('google', 'profile'),
  types.createCodeByName('google', 'page'),
  types.createCodeByName('facebook', 'page')
];

module.exports = types;
