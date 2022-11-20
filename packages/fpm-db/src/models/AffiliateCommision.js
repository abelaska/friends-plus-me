import { registerModel, Schema, SchemaObjectId } from '../db';

var AffiliateCommision = new Schema({
  mbsy: String, // profile.affiliate.partnerId
  paid: { type: Number, default: 0 }, // celkova suma vyplacenych komisi
  owed: { type: Number, default: 0 }, // celkova suma urcena k vyplaceni
  approve: { type: Number, default: 0 }, // prozatim neschvalena suma komisi
  uids: [SchemaObjectId], // seznam uzivatelu, ktere partner privedl
  commisions: [
    {
      // seznam ziskanych komisi
      tm: { type: Date, default: Date.now }, // cas ziskani komise
      approved: { type: Boolean, default: false }, // true pokud je komise schvalena, false pokud ne
      paid: { type: Boolean, default: false }, // true pokud je komise vyplacena, false pokud ne
      tx: String, // transactions._id
      campaign: String, // affiliate campaign
      revenue: Number, // transaction.amount
      commision: Number, // first = 0.05*revenue, next = 0.03*revenue
      uid: SchemaObjectId // profile.owner._id
    }
  ]
});

AffiliateCommision.index(
  {
    mbsy: 1
  },
  { unique: true }
);

AffiliateCommision.index(
  {
    mbsy: 1,
    pids: 1
  },
  { unique: true }
);

AffiliateCommision.index(
  {
    mbsy: 1,
    'commisions.tx': 1
  },
  { unique: true }
);

AffiliateCommision.index(
  {
    'commisions.tx': 1
  },
  { unique: true }
);

export default registerModel('AffiliateCommision', AffiliateCommision);
