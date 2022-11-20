import { registerModel, Schema, SchemaObjectId } from '../db';

var Coupon = new Schema({
  campaignId: SchemaObjectId, // DiscountCampaign._id slevova kampan
  discountId: SchemaObjectId, // DiscountCampaign.discounts._id konkretni sleva kampane
  userId: SchemaObjectId, // User._id uzivatele uplatnujiciho slevu
  pid: SchemaObjectId, // Profile._id pro ktery je sleva uplatnovana
  planInterval: String, // "{plan}:{interval}" pro ktery byl kupon uplatnen
  email: String, // email uzivatele, ktery muze kupon uplatnit nebo uplatnil
  code: String, // kod kuponu
  type: String, // typ slevy 'percent','fixed'
  recurring: Boolean, // true pokud se jedna o opakovanou slevu, false pokud pouze o jednorazovou slevu
  discount: Number, // hodnota slevy, procento nebo fixni hodnota slevy v dolarech
  appliedDiscount: Number, // financni hodnota aplikovane slevy, ex. 10 pro $10
  validUntil: Date, // cas ukonceni platnosti kuponu nebo null pokud je casova platnost neomezena
  created: { type: Date, default: Date.now }, // cas vzniku kuponu
  applied: Date // cas kdy byl kupon uplatnen
});

Coupon.index(
  {
    campaignId: 1,
    pid: 1
  },
  { unique: true, sparse: true }
);

Coupon.index(
  {
    code: 1,
    pid: 1
  },
  { unique: true, sparse: true }
);

Coupon.index(
  {
    campaignId: 1,
    userId: 1
  },
  { unique: true, sparse: true }
);

export default registerModel('Coupon', Coupon);
