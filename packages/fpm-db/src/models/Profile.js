import moment from 'moment-timezone';
import _ from 'underscore';
import { countries, Types, States } from '@fpm/constants';
import config from '@fpm/config';
import { registerModel, Schema, SchemaObjectId, Mixed } from '../db';

const ProfileSchema = new Schema({
  name: String, // nazev profilu

  created: {
    // cas vytvoreni profilu
    type: Date,
    default: Date.now
  },
  state: {
    // stav profilu
    type: Number,
    default: States.profile.enabled.code
  },

  // profile contact name and email
  contact: {
    name: String,
    email: String
  },

  deleted: Date, // cas smazani profilu
  deletedId: String, // puvodni hodnota _id zruseneho zaznamu profilu

  preset: String, // defaultni preset profilu google-growth || mirroring || google-growth-controlled || mirroring-controlled

  members: Mixed, /*          // seznam uzivatelu jez jsou cleny profilu
    {ROLE}: [{user._id},...]  // users._id list
  */
  invitations: Mixed, /*      // seznam pozvanek ke sprave profilu
    {id}: {                   // invitation id
      email:        String,   // invited email address
      role:         {type: String, default: 'manager'}, // nabizena role
      createdAt:    {type: Date, default: Date.now} // cas vytvoreni pozvanky
    }
  */
  affiliate: {
    // informace o ucastnikovi affiliate programu
    referrer: {
      // informace o partnerovi, ktery privedl vlastnika tohoto profilu
      campaignId: String, // getAmbassador campaign ID
      mbsy: String // getAmbassador partner short code
    },
    campaignId: String, // ID affiliate kampane
    partnerId: String, // ID partnera pridelene sluzbou getamassador.com
    url: String // URL kterou ma uzivatel sdilet pro ziskani komise
  },

  subject: {
    // popis subjektu
    org: String, // nazev organizace
    billTo: String, // adresa organizace, vklada se do invoice
    vatId: String, // danovy identifikator DIC uzivatele
    country: String, // two-letter ISO country code http://userpage.chemie.fu-berlin.de/diverse/doc/ISO_3166.html
    invoiceEmail: String, // to where to send invoices
    qbCustomerId: String, // quickbooks customer id
    faContactUrl: String // freeagent contact URL
  },

  plan: {
    // subscribed plan
    name: {
      // nazev planu uctu PAYWYU ,FREE, STANDARD, UNLIMITED, PERSONAL, STARTER, BASIC, PROFESSIONAL
      type: String,
      default: 'TRIAL'
    },
    interval: {
      // interval plateb MONTH, YEAR
      type: String,
      default: 'MONTH'
    },
    validFrom: {
      // aktivace planu
      type: Date,
      default: Date.now
    },
    validUntil: Date // cas po kterem jiz nema byt provadeno preposilani aktivit uctu
  },

  premium: {
    // informace o premiu
    metrics: {
      member: { type: Number, default: config.get('premium:trial:metrics:member') || 0 }, // dollar price per unit per month
      instagramQueue: { type: Number, default: config.get('premium:trial:metrics:instagramQueue') || 0 }, // dollar price per unit per month
      sourceAccount: { type: Number, default: config.get('premium:trial:metrics:sourceAccount') || 0 }, // dollar price per connected account per month
      connectedAccount: { type: Number, default: config.get('premium:trial:metrics:connectedAccount') || 0 }, // dollar price per connected account per month
      profile: { type: Number, default: config.get('premium:trial:metrics:profile') || 0 } // dollar price per profile per month
    }
  },

  subscription: {
    // subscription detail
    id: String, // identifikator subscription prirazeny platebni branou
    gw: String, // platebni brana PAYPAL,PAYMILL,BRAINTREE
    method: String, // Braintree peyment method: 'paypal','creditcard'
    balance: Number, // fixed balance zaporna hodnota odpovida prebytku, kladnou castku zakaznik dluzi
    amount: Number, // fixed cena subscription v USD
    plan: String, // nazev planu FREE, TRIAL, PAYUSE, PAYUSECUSTOM, ...
    interval: String, // jak casto je provadena platba MONTH,YEAR
    createdAt: Date, // cas vzniku subscription
    lastPay: Date, // cas posledni provedene platby
    nextPay: Date, // naplanovany cas pro dalsi opakovanou platebni transakci

    ipAddress: String, // user IP address

    forcedUnsubscr: Boolean, // true pokud je downgrade vynuceny ze strany Friends+Me, false pokud ne

    merchant: {
      merchantId: String, // braintree merchant id
      accountId: String // braintree mechant account id: 'friendsmeUSD','friendsmeAmexUSD'
    },

    customer: {
      // informace o zakaznikovi
      id: String // identifikator zakaznika prirazeny platebni branou (braintree.customerId,paymill.clientId,paypal.email)
    },

    paypal: {
      // informace o registrovanem braintree paypal uctu
      token: String, // token paypal uctu
      email: String // email paypal uctu
    },

    card: {
      // informace o registrovane platebni karte
      country: String, // credit card countryOfIssuance https://developers.braintreepayments.com/reference/response/credit-card/node#country_of_issuance
      token: String, // token platebni karty (braintree.token,paymill.payId)
      last4: String, // posledni 4 cisla karty (braintree.last4,paymill.payLast4)
      cardType: String, // typ karty: 'American Express','Carte Blanche','China UnionPay','Diners Club','Discover','JCB','Laser','Maestro','MasterCard','Solo','Switch','Visa','Unknown'
      expMonth: Number, // mesic expirace karty 1-12 (braintree.expMonth,paymill.payExpireMonth)
      expYear: Number // rok expirace karty (braintree.expYear,paymill.payExpireYear)
    },

    coupon: Mixed, // kopie slevoveho kuponu uplatneho na subscription

    addons: Mixed /* { // seznam addonu jez jsou soucastni subscription
      id:           {         // identifikator addonu
        count:      Number,   // pocet addonu
        amount:     Number    // fixed price za vsechny tyto addony
      }
    } */
  },

  routes: [
    {
      // repost routovani

      src: String, // accounts._id zdrojoveho uctu

      routeToDraft: Boolean, // true save nove posts as drafts only

      // custom hashtag destination groups
      chdg: [
        {
          override: Boolean, // true pokud ma byt seznam defaultnich uctu prepsan timto seznamem, false pokud ma byt seznam defaultnich uctu rozsiren o seznam techto uctu
          keep: Boolean, // pokud true tak jsou hashtagy v repostu ponechany, pokud false jsou odstraneny
          noshare: Boolean, // jedna se o noshare control hashtag
          hashtag: [String], // nazev custom hashtagu (lowercase)
          dst: [String] // seznam accounts._id cilovych uctu
        }
      ],

      // default destination group (is used only when no hashtag is used)
      ddg: [String] // accounts._id cilovych uctu
    }
  ],

  use: Mixed, /* vlastnosti uctu {
    system:                Number,  // verze systemu pro ktery je ucet aktivni
    twitterCards:          Boolean, // true pokud pro Twitter repost pouzit Twitter Cards, false pokud normalni repost
    hashtags:              Boolean, // true pokud pro planovani repostu zpracovat hashtagy ze zpravy, false pokud ne
    bitly:                 Boolean, // true pokud se ma pro zkracovani linku pouzit bit.ly
    pricing:               Boolean, // true pokud ma uzivatel zaplou podporu plateb, false pokud ne
    adaptiveFetchInterval: Boolean, // true pokud se ma pro ucet pouzit adaptivni algoritmus pro zmenu fetch intervalu, false pokud pouzit fixed fetch interval
    allowedGooglePages:    Number,  // -1=unlimited, kolik Google+ pages si muze uzivatel zaregistrovat
    repostsPerMonth:       Number,  // -1=unlimited, kolik repostu za mesic ma uzivatel povoleno
    maxAccounts:           Number,  // -1=unlimited, kolik uctu (accounts.length) ma uzivatel povoleno
  } */

  profiles: [
    {
      uid: String, // identifikator uctu prideleny socialni siti
      parentUid: String, // identifikator nadrazeneho uctu prideleny socialni siti
      email: String, // email assigned with this social profile
      image: String, // URL obrazku vlastnika uctu
      name: String, // jmeno uctu
      connectedAt: Date, // UTC cas prvniho pripojeni profilu
      reconnectedAt: Date, // UTC cas reconnect profilu
      network: Number, // typ socialni site (0=google+,1=twitter,2=facebook,3=linkedin)
      account: Number, // typ uctu (0=Profile,1=Page,2=Group)
      url: String, // URL socialni stranky uctu
      oauth: {
        // reconnect required if token == null || expiresAt.isBeforeNpw
        token: String, // access token || null if reconnect is required
        secret: String, // refresh token
        expiresAt: Date // cas expirace access tokenu, null=bez expirace
      },
      meta: {
        // Google+ Profile, it's not possible to publish via the Pages API for Google Apps accounts
        // only free accounts are allowed. Google+ team bulshit.        
        publishViaApi: Boolean
      }
    }
  ],

  accounts: [
    {
      // Common
      // _id:          String    // identifikator uctu
      socialProfileId: SchemaObjectId, // profile.profiles._id
      state: {
        // stav uctu (0-enabled,1-disabled,2-blocked,3-reconnect required)
        type: Number,
        default: States.account.enabled.code
      },
      stateUpdatedAt: Date, // UTC cas zmeny state uctu
      uid: String, // identifikator uctu prideleny socialni siti
      image: String, // URL obrazku vlastnika uctu
      name: String, // jmeno uctu
      fname: String, // jmeno
      lname: String, // prijmeni
      started: Date, // UTC cas registrace uctu v systemu
      reconnected: Date, // UTC cas posledniho reconnectu uctu
      network: Number, // typ socialni site (0=google+,1=twitter,2=facebook,3=linkedin)
      account: Number, // typ uctu (0=Profile,1=Page,2=Group)
      token: String, // access token
      secret: String, // access token secret
      expire: Date, // cas expirace access tokenu, null=bez expirace
      url: String, // URL socialni stranky uctu
      tagline: String, // tagline stranky
      dir: Number, // smer repostu 0-in,1-out,2-both
      subscribed: Boolean, // whether is the (FB) account subscribed so F+M will be receiving webhook notifications with every new post
      preset: {
        // defaultni preset profilu '' || custom || google-growth || mirroring || google-growth-controlled || mirroring-controlled
        type: String,
        default: 'mirroring'
      },

      blockedUntil: Date, // publikovani je blokovano do casu blockedUntil

      creator: SchemaObjectId, // users._id clena ktery vytvoril ucet
      members: Mixed, /* // seznam uzivatelu jez jsou specialni spravci uctu
        {ROLE}: [{user._id},...]// users._id list
      */
      category: {
        // Google+ Community Category
        id: String, // id kategorie
        name: String // jmeno kategorie
      },

      shortener: {
        // konfigurace zkracovace URL
        type: {
          // none, bitly, googl, fpmelink, fpmegoogl
          type: String,
          default: 'none'
        },
        bitly: {
          // da se zjistit pres http://bitly.com/a/your_api_key
          id: String, // id uctu
          name: String, // nazev uctu
          username: String, // bitly username
          apiKey: String, // bitly apikey
          token: String // OAuth2 access token, pokud je definovan pouziva se namisto apiKey
        },
        googl: {
          id: String, // id uctu
          name: String, // nazev uctu
          token: String, // OAuth2 access token
          secret: String // OAuth2 refresh token
        }
      },

      scheduling: {
        // planovani repostu
        tz: String, // Timezone ID
        schedules: [Mixed], // seznam scheduleru se seznamy naplanovanych casu v minutach od zacatku tydne

        week: Date, // prvni pondeli v mesici (UTC) ke kteremu se pricitaji _.flatten(schedules).sort()[offs]
        offs: {
          // index posledne pouziteho casu ze seznamu _.flatten(schedules).sort()
          type: Number,
          default: 0
        },

        // konfigurace repost schedulingu

        stype: {
          // Typ scheduleru pro reposty
          type: String,
          default: 'd' // t-times, d-delay
        },
        delay: {
          // Spozdeni repostu v sekundach
          type: Number,
          default: 0
        }

        // !!! OBSOLETE !!!
        // enabled:    {         // true repost scheduling is enabled, false disabled
        //   type:     Boolean,
        //   default:  true
        // }
      },

      ng: Boolean, // whether this account (queue) is next generation

      // Twitter
      twForceLink: Boolean, // true pokud publikovat link pouze jako link a ne jako photo post

      // Google+ Profile, it's not possible to publish via the Pages API for Google Apps accounts
      // only free accounts are allowed. Google+ team bulshit.
      publishViaApi: Boolean,

      // Google+ Profile, Google+ Page
      repCommunity: Boolean, // true repost community posts, false ignore community posts

      // Google+ Profile, Google+ Page, Facebook Page
      parentUid: String, // uid uctu vlastniciho stranku (hlavne kvuli refreshToken)

      // FB Profile, FB Page -  // true pokud vlozit do message Facebook repostu backlink na repostovanou Google+ activitu
      // Linkedin Profile -     // true pokud vzdy na konec statusu doplnit odkaz na originalni Google+ aktivitu, false pokud nevynucovat vlozeni odkazu
      // Twitter Profile -      // true pokud vzdy na konec statusu doplnit odkaz na originalni Google+ aktivitu, false pokud nevynucovat vlozeni odkazu
      appendLink: Boolean,

      // do vysledne zpravy pripojit prvni, posledni nebo zadny nalezeny hashtag
      appendHashtag: {
        // 'first','last',false
        type: String,
        default: 'first'
      },

      // Facebook Profile, Facebook Page
      noBackLink: Boolean, // false pokud doplnit nakonec textu click-to-read-mo.re odkaz na G+ post, true pokud odkaz nedoplnovat

      // Facebook Profile, Facebook Page
      albumId: String, // identifikator Facebook Timeline Photos foto alba, fotky ukladane sem nejsou groupovany dohromady

      // Twitter Profile
      limitMsgLen: Boolean, // true pokud limitovat delku Twitter statusu na 250 znaku, false pokud limitovat delku na standardnich 280 znaku

      // Facebook Profile, Facebook Page
      photoAsLink: Boolean, // true pokud repostovat photo jako link, false pokud repostovat jako photo

      // Facebook, Linkedin Profile
      privacy: String // komu ma byt prispevek viditelny: linkedin(anyone,connections-only), facebook(EVERYONE, ALL_FRIENDS, FRIENDS_OF_FRIENDS, SELF)
    }
  ]
});

ProfileSchema.index(
  {
    'plan.name': 1
  },
  { unique: false }
);

ProfileSchema.index(
  {
    'accounts.members.manager': 1
  },
  { unique: false, sparse: true }
);

ProfileSchema.index(
  {
    'accounts.members.amanager': 1
  },
  { unique: false, sparse: true }
);

ProfileSchema.index(
  {
    'members.manager': 1
  },
  { unique: false, sparse: true }
);

ProfileSchema.index(
  {
    'members.amanager': 1
  },
  { unique: false, sparse: true }
);

ProfileSchema.index(
  {
    'subscription.id': 1
  },
  { unique: false, sparse: true }
);

ProfileSchema.index(
  {
    'accounts.uid': 1,
    'accounts.network': 1
  },
  { unique: false }
);

ProfileSchema.index(
  {
    'accounts.parentUid': 1,
    'accounts.network': 1
  },
  { unique: false }
);

ProfileSchema.index(
  {
    _id: 1,
    'accounts._id': 1
  },
  { unique: false }
);

ProfileSchema.index(
  {
    'accounts._id': 1
  },
  { unique: false }
);

const premiumProfilesCounter = premiumProfilesCache => p => {
  const code = Types.createCode(p.network, p.account);
  if (Types.premiumCodes.indexOf(code) > -1) {
    premiumProfilesCache[`${code}:${p.uid}`] = 1;
  }
};

ProfileSchema.virtual('premiumProfilesCount').get(function() {
  const premiumProfilesCache = {};
  const counter = premiumProfilesCounter(premiumProfilesCache);
  this.profiles.forEach(counter);
  this.accounts.forEach(counter);
  return Object.values(premiumProfilesCache).length;
});

// returns: true||false
ProfileSchema.virtual('isAffiliateTrackable').get(function() {
  return this.affiliate && this.affiliate.referrer && this.affiliate.referrer.campaignId && this.affiliate.referrer.mbsy
    ? true
    : false;
});

// returns: true||false
ProfileSchema.virtual('isFromEU').get(function() {
  return this.subject && countries.isEU(this.subject.country) ? true : false;
});

// returns: true||false
ProfileSchema.virtual('isVatPayer').get(function() {
  return this.subject && this.subject.vatId ? true : false;
});

// returns: true||false
ProfileSchema.virtual('pricesShouldContainVat').get(function() {
  const isHomeCountry = this.subject.country === config.get('subscriptions:homeCountryCode');

  // in case loysoft limited is NOT VAT or VAT MOSS registered
  return false;

  // in case loysoft limited is NOT registered to VAT MOSS and VAT registered
  // return (isHomeCountry || (this.isFromEU && !this.isVatPayer));

  // in case loysoft limited is registered to VAT MOSS
  // return (this.isFromEU && !this.isVatPayer && !isHomeCountry);
});

// returns: true||false
ProfileSchema.virtual('isSubscribed').get(function() {
  return this.subscription && this.subscription.id ? true : false;
});

ProfileSchema.virtual('ownerId').get(function() {
  return this.members && this.members.owner && this.members.owner.length ? this.members.owner[0] : null;
});

// returns: BRAINTREE||PAYMILL||PAYPAL||null
ProfileSchema.virtual('subscriptionType').get(function() {
  return this.isSubscribed ? this.subscription.gw : null;
});

// returns: Number||undefined
ProfileSchema.virtual('subscriptionAmount').get(function() {
  return this.isSubscribed ? this.subscription.amount : null;
});

// returns: subscription interval: MONTH||YEAR||null
ProfileSchema.virtual('subscriptionInterval').get(function() {
  return this.isSubscribed ? this.subscription.interval : null;
});

// returns: subscription interval in months
ProfileSchema.virtual('subscriptionIntervalMonths').get(function() {
  switch (this.subscriptionInterval) {
    case 'MONTH':
      return 1;
    case 'YEAR':
      return 12;
  }
  return 0;
});

ProfileSchema.virtual('isAnotherAccountAllowed').get(function() {
  return this.use
    ? /*jshint -W041*/
      this.use.maxAccounts === undefined ||
      this.use.maxAccounts === null ||
      this.use.maxAccounts === -1 ||
      this.use.maxAccounts > (this.accounts ? this.accounts.length : 0)
      ? true
      : false
    : true;
});

ProfileSchema.virtual('isAnotherAccountDisallowed').get(function() {
  return !this.isAnotherAccountAllowed;
});

ProfileSchema.methods.includeVat = function(vatMoss) {
  // od 1.11.2020 by se mela vracet 0% protoze uz neni loysoft limited VAT registered
  return 0;
  // od 1.10.2020 by se mela vracet UK VAT 20%
  // return this.pricesShouldContainVat ? 20 : 0;
  // pred 1.10.2020
  // return this.pricesShouldContainVat ? vatMoss.getVatRate(this.subject.country) : 0;
};

ProfileSchema.methods.owner = function() {
  return this.members && this.members.owner && this.members.owner.length ? this.members.owner[0] : null;
};

ProfileSchema.methods.membersCount = function() {
  return (
    (this.members &&
      _.chain([
        this.members.owner || [],
        this.members.manager || [],
        this.members.amanager || [],
        this.members.contributor || []
      ])
        .flatten()
        .uniq()
        .value().length) ||
    0
  );
};

ProfileSchema.methods.canUserManageProfile = function(user) {
  const allowedUsers = ((this.members && this.members.owner) || [])
    .concat((this.members && this.members.manager) || [])
    .map(i => i.toString());
  return allowedUsers.indexOf(user._id.toString()) > -1;
};

ProfileSchema.methods.canUserManageAccount = function(user, account) {
  const allowedUsers = ((account && account.members && account.members.manager) || []).map(i => i.toString());
  return allowedUsers.indexOf(user._id.toString()) > -1;
};

ProfileSchema.methods.usersWhoCanPublishToAccount = function(account) {
  return _.chain([
    (this.members && this.members.owner) || [],
    (this.members && this.members.manager) || [],
    (account && account.members && account.members.manager) || []
  ])
    .flatten()
    .map(function(id) {
      return id.valueOf().toString();
    })
    .uniq()
    .value();
};

ProfileSchema.methods.accountPresetIs = function() /*account, ...*/ {
  var args = Array.prototype.slice.call(arguments),
    account = args.shift(),
    preset = account && account.preset;
  return _.contains(args, preset);
};

ProfileSchema.methods.presetIs = function() {
  var preset = this.preset || 'google-growth',
    args = Array.prototype.slice.call(arguments);
  return _.contains(args, preset);
};

ProfileSchema.methods.isAnotherAccountAllowedByTypeName = function(networkName, accountName) {
  var network = this.use && this.use.network && networkName ? this.use.network[networkName] : null,
    networkLimit = network ? network.limit : null,
    accountLimit = network && accountName && network[accountName] ? network[accountName].limit : null,
    /*jshint -W041*/
    isNetworkAllowed =
      networkLimit === undefined || networkLimit === null || networkLimit === -1
        ? true
        : networkLimit > this.countAccountsByNetwork(Types.network[networkName].code),
    isAccountAllowed =
      accountLimit === undefined || accountLimit === null || accountLimit === -1
        ? true
        : accountLimit > this.countAccountsByType(Types.network[networkName].code, Types.account[accountName].code);
  return this.isAnotherAccountAllowed && isNetworkAllowed && isAccountAllowed ? true : false;
};

ProfileSchema.methods.isAnotherAccountDisallowedByTypeName = function(networkName, accountName) {
  return !this.isAnotherAccountAllowedByTypeName(networkName, accountName);
};

ProfileSchema.virtual('planValidUntilDate').get(function() {
  return moment.utc(this.plan.validUntil).format('YYYY-MM-DD');
});

ProfileSchema.virtual('planExpiresIn').get(function() {
  return moment.utc(this.plan.validUntil).fromNow();
});

ProfileSchema.methods.isActiveAccount = function(account) {
  /*jshint -W041*/
  return account &&
  this.isAccountEnabled(account) &&
  ((account.token && account.token.length > 0) || account.parentUid) &&
  (account.expire === undefined || account.expire === null || (account.expire && moment.utc().diff(account.expire) < 0))
    ? true
    : false;
};

ProfileSchema.methods.findAccountForPublishing = function(account) {
  var viaAccount = account.parentUid ? null : account;
  if (!viaAccount && this.accounts.length > 0) {
    var a;
    for (var i = 0; i < this.accounts.length; i++) {
      a = this.accounts[i];
      if (a.network === account.network && a.uid === account.parentUid) {
        viaAccount = a;
        break;
      }
    }
  }
  return viaAccount;
};

ProfileSchema.methods.findAccountByAccount = function(account) {
  return this.findAccount(account.network, account.account, account.uid);
};

ProfileSchema.methods.findAccount = function(networkCode, accountCode, uid) {
  var a,
    account = null;
  if (this.accounts.length > 0) {
    for (var i = 0; i < this.accounts.length; i++) {
      a = this.accounts[i];
      if (a.network === networkCode && (a.account === accountCode || accountCode === null) && a.uid === uid) {
        account = a;
        break;
      }
    }
  }
  return account;
};

ProfileSchema.methods.findAccountById = function(accountId) {
  if (this.accounts.length > 0) {
    for (var i = 0; i < this.accounts.length; i++) {
      if (this.accounts[i]._id.toString() === accountId) {
        return this.accounts[i];
      }
    }
  }
  return null;
};

ProfileSchema.methods.findFirstAccountByType = function(networkCode, accountCode) {
  var a = null;
  if (this.accounts && this.accounts.length > 0) {
    for (var i = 0; i < this.accounts.length; i++) {
      a = this.accounts[i];
      if (a.network === networkCode && a.account === accountCode) {
        break;
      } else {
        a = null;
      }
    }
  }
  return a;
};

ProfileSchema.methods.findAccountsByType = function(networkCode, accountCode) {
  var a,
    as = [];
  if (this.accounts && this.accounts.length > 0) {
    for (var i = 0; i < this.accounts.length; i++) {
      a = this.accounts[i];
      if (a.network === networkCode && a.account === accountCode) {
        as.push(a);
      }
    }
  }
  return as;
};

ProfileSchema.methods.findProfileAccountRoutes = function(account) {
  var r = null;
  if (this.routes && this.routes.length > 0) {
    for (var i = 0; i < this.routes.length; i++) {
      r = this.routes[i];
      if (r.src === account._id.toString()) {
        break;
      } else {
        r = null;
      }
    }
  }
  return r;
};

ProfileSchema.methods.countAccountsByType = function(networkCode, accountCode) {
  var cnt = 0;
  if (this.accounts && this.accounts.length > 0) {
    this.accounts.forEach(function(a) {
      if (a.network === networkCode && a.account === accountCode) {
        cnt++;
      }
    });
  }
  return cnt;
};

ProfileSchema.methods.countActiveAccountsByType = function(networkCode, accountCode) {
  var cnt = 0;
  if (this.accounts && this.accounts.length > 0) {
    this.accounts.forEach(
      function(a) {
        if (!this.isAccountBlocked(a) && a.network === networkCode && a.account === accountCode) {
          cnt++;
        }
      }.bind(this)
    );
  }
  return cnt;
};

ProfileSchema.methods.countAccountsByNetwork = function(networkCode) {
  var cnt = 0;
  if (this.accounts && this.accounts.length > 0) {
    this.accounts.forEach(function(a) {
      if (a.network === networkCode) {
        cnt++;
      }
    });
  }
  return cnt;
};

ProfileSchema.methods.countActiveAccountsByNetwork = function(networkCode) {
  var cnt = 0;
  if (this.accounts && this.accounts.length > 0) {
    this.accounts.forEach(
      function(a) {
        if (!this.isAccountBlocked(a) && a.network === networkCode) {
          cnt++;
        }
      }.bind(this)
    );
  }
  return cnt;
};

ProfileSchema.methods.isGoogleAccount = function(account) {
  return account && account.network === Types.network.google.code;
};

ProfileSchema.methods.assignAccountToAccountRoute = function(route, account) {
  var i,
    add,
    defaultHashtagGroups = Types.networkByCode(account.network).defaultHashtagGroups;

  if (route.ddg) {
    route.ddg.push(account._id.toString());
  } else {
    route.ddg = [account._id.toString()];
  }

  if (route.chdg && route.chdg.length && defaultHashtagGroups && defaultHashtagGroups.length) {
    // pridat sit pouze do skupin, ktere se skladaji pouze s defaultnich hashtagu
    route.chdg.forEach(function(r) {
      add = false;
      for (i = 0; i < defaultHashtagGroups.length; i++) {
        if (_.contains(r.hashtag, defaultHashtagGroups[i])) {
          add = true;
          break;
        }
      }
      if (add) {
        r.dst.push(account._id.toString());
      }
    });
  }
};

ProfileSchema.methods.updateRoute = function(route) {
  var r,
    add = true;

  if (this.routes) {
    for (var i = 0; i < this.routes.length; i++) {
      r = this.routes[i];
      if (r.src === route.src) {
        r.routeToDraft = !!route.routeToDraft;
        r.ddg = route.ddg;
        r.chdg = route.chdg;
        add = false;
        break;
      }
    }
  } else {
    this.routes = [];
  }
  if (add) {
    this.routes.push(route);
  }
};

ProfileSchema.methods.accountPossibleRouteDestinations = function(account) {
  var dsts = [],
    route = this.findAccountRoute(account);
  if (route) {
    dsts = route.ddg || [];
    if (route.chdg && route.chdg.length > 0) {
      route.chdg.forEach(function(chdg) {
        dsts = dsts.concat(chdg.dst || []);
      });
    }
  }
  return dsts;
};

ProfileSchema.methods.accountDestinationsByHashtags = function(account, hashtags, ignoreDDG) {
  var i,
    j,
    hashtagFound,
    chdg,
    noshare,
    dsts = [],
    route = (account && this.findAccountRoute(account)) || null,
    hts = _.map(hashtags || [], function(ht) {
      return ht.toLowerCase();
    });

  if (route) {
    if (route.chdg && route.chdg.length > 0) {
      for (j = 0; j < route.chdg.length; j++) {
        chdg = route.chdg[j];

        hashtagFound = false;

        if (chdg.hashtag && chdg.hashtag.length > 0) {
          for (i = 0; i < chdg.hashtag.length; i++) {
            if (_.contains(hts, chdg.hashtag[i].toLowerCase())) {
              if (chdg.override || chdg.noshare) {
                ignoreDDG = true;
              }
              noshare = chdg.noshare || false;
              hashtagFound = true;
              break;
            }
          }
        }

        if (hashtagFound) {
          if (noshare) {
            dsts = [];
            break;
          } else {
            dsts = dsts.concat(chdg.dst || []);
          }
        }
      }

      dsts = _.uniq(dsts);
    }

    if (!ignoreDDG) {
      dsts = _.uniq(dsts.concat(route.ddg || []));
    }

    // odstran pripadnou chybu, kdy je ucet cilovy a zdrojovy zaroven
    if (dsts.length) {
      dsts = _.without(dsts, account._id.toString());
    }

    if (dsts.length) {
      var newDsts = [];

      dsts.forEach(
        function(dst) {
          var a = this.findAccountById(dst);
          if (a && (a.state === States.account.enabled.code || a.state === States.account.reconnectRequired.code)) {
            newDsts.push(dst);
          }
        }.bind(this)
      );

      dsts = newDsts;
    }
  }
  return dsts;
};

ProfileSchema.methods.isAccountRoutable = function(account) {
  return this.accountPossibleRouteDestinations(account).length > 0 ? true : false;
};

ProfileSchema.methods.isAccountEnabled = function(account) {
  return account.state === States.account.enabled.code ? true : false;
};

ProfileSchema.methods.isAccountDisabled = function(account) {
  return account.state === States.account.disabled.code ? true : false;
};

ProfileSchema.methods.isAccountBlocked = function(account) {
  return account.state === States.account.blocked.code ? true : false;
};

ProfileSchema.methods.findRouteBySrc = function(src) {
  if (this.routes) {
    for (var i = 0; i < this.routes.length; i++) {
      if (this.routes[i].src === src.toString()) {
        return this.routes[i];
      }
    }
  }
  return null;
};

ProfileSchema.methods.findAccountRoute = function(account) {
  if (this.routes) {
    for (var i = 0; i < this.routes.length; i++) {
      if (this.routes[i].src === account._id.toString()) {
        return this.routes[i];
      }
    }
  }
  return null;
};

ProfileSchema.methods.findAccountHashtagsToRemove = function(account) {
  var removeHashtags = [],
    route = this.findAccountRoute(account);
  if (route && route.chdg && route.chdg.length > 0) {
    route.chdg.forEach(function(chdg) {
      if (!chdg.keep && chdg.hashtag && chdg.hashtag.length > 0) {
        removeHashtags = removeHashtags.concat(chdg.hashtag);
      }
    });
  }
  return removeHashtags;
};

function removeItemFromArray(array, id, matchCallback) {
  if (array) {
    var i,
      cb =
        matchCallback ||
        function(o) {
          return o;
        };
    for (i = 0; i < array.length; i++) {
      if (cb(array[i]).toString() === id) {
        array.splice(i, 1);
        return true;
      }
    }
  }
  return false;
}

ProfileSchema.methods.blockAccount = function(account) {
  account.state = States.account.blocked.code;
  account.stateUpdatedAt = moment.utc().toDate();
};

ProfileSchema.methods.disableAccount = function(account) {
  account.state = States.account.disabled.code;
  account.stateUpdatedAt = moment.utc().toDate();
};

ProfileSchema.methods.enableAccount = function(account) {
  account.state = States.account.enabled.code;
  account.stateUpdatedAt = moment.utc().toDate();
};

ProfileSchema.methods.removeAccount = function(id) {
  id = id.toString();

  var remove = this.findAccountById(id) ? true : false;
  if (remove) {
    // odstranit account ze vsech rout a pripadne odstranit i prazdne routy

    this.routes = _.filter(this.routes, function(r) {
      if (r.src.toString() === id) {
        return false;
      } else {
        removeItemFromArray(r.ddg, id);

        if (r.chdg) {
          r.chdg.forEach(function(c) {
            removeItemFromArray(c.dst, id);
          });
        }

        return true;
      }
    });

    this.accounts = _.filter(this.accounts, function(account) {
      return account._id.toString() === id ? false : true;
    });

    this.markModified('accounts');
    this.markModified('routes');
  }

  return remove;
};

ProfileSchema.static('newAccountRouteWizard', function(accountId, callback) {
  this.findOne(
    { 'accounts._id': accountId },
    'accounts preset routes',
    function(err, profile) {
      if (profile) {
        // callback(null, profile.routes);

        var route,
          account = profile.findAccountById(accountId.toString());

        // if (profile.presetIs('google-growth','mirroring')) {
        //   if (profile.isGoogleAccount(account)) {
        //     // pripoj existujici ne-google ucty k tomuto google uctu
        //     if ((route = profile.findProfileAccountRoutes(account))) {
        //       profile.accounts.forEach(function(account) {
        //         if (!profile.isGoogleAccount(account)) {
        //           route.allowed.push(accountId.toString());
        //           profile.assignAccountToAccountRoute(route, account);
        //           profile.updateRoute(route);
        //         }
        //       }.bind(this));
        //     }
        //   } else {
        //     profile.accounts.forEach(function(gaccount) {
        //       if (profile.isGoogleAccount(gaccount) && (route = profile.findProfileAccountRoutes(gaccount))) {
        //         route.allowed.push(accountId.toString());
        //         profile.assignAccountToAccountRoute(route, account);
        //         profile.updateRoute(route);
        //       }
        //     }.bind(this));
        //   }
        // }
        // profile.save(function(err, profile) {
        //   if (profile) {
        //     callback(null, profile.routes);
        //   } else {
        //     callback(err);
        //   }
        // });

        // extend routing only in case 1 and only 1 google account is connected
        if (
          account &&
          profile.countAccountsByNetwork(account.network) === 1 &&
          profile.countAccountsByNetwork(Types.network.google.code) ===
            (account.network === Types.network.google.code ? 0 : 1)
        ) {
          if (profile.isGoogleAccount(account)) {
            if (profile.accounts.length > 1) {
              // pripoj existujici ucty k tomuto prvnimu google uctu
              if ((route = profile.findProfileAccountRoutes(account))) {
                profile.accounts.forEach(
                  function(account) {
                    if (!profile.isGoogleAccount(account)) {
                      profile.assignAccountToAccountRoute(route, account);
                    }
                  }.bind(this)
                );
              }
            }
          } else {
            // pokud je uz pripojeny jeden (a pouze jeden) google ucet, tak k nemu pripoj tento novy ucet
            var googleAccount =
              profile.findFirstAccountByType(Types.network.google.code, Types.account.profile.code) ||
              profile.findFirstAccountByType(Types.network.google.code, Types.account.page.code);
            if (googleAccount && (route = profile.findProfileAccountRoutes(googleAccount))) {
              profile.assignAccountToAccountRoute(route, account);
            }
          }
        }
        if (route) {
          profile.updateRoute(route);
          profile.save(function(err, profile) {
            if (profile) {
              callback(null, profile.routes);
            } else {
              callback(err);
            }
          });
        } else {
          callback(null, profile.routes);
        }
      } else {
        callback(err);
      }
    }.bind(this)
  );
});

export const Profile = registerModel('Profile', ProfileSchema);
export const DeletedProfile = registerModel('DeletedProfile', ProfileSchema);
