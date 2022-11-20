import { registerModel, Schema, SchemaObjectId, Mixed } from '../db';

const Transaction = new Schema({
  tm: { type: Date, default: Date.now }, // cas vzniku zaznamu transakce
  type: String, // typ transakce CHARGE,FEE,PREPAY
  payedAt: Date, // cas uskutecneni platby
  updatedAt: Date, // cas posledni modifikace platby, napr. refund
  id: String, // identifikator prideleny platebni branou pri vzniku transakce
  paypalId: String, // identifikator paypal platebni transakce
  pid: SchemaObjectId, // profile._id
  desc: String, // popis transakce
  amount: Number, // castka
  fee: Number, // poplatek za transakci
  isAnnualPrepay: { type: Boolean, default: false }, // true pokud se jedna o platbu na 12 mesicu dopredu, alse pokud ne
  vatInc: Number, // procentualni hodnota DPH obsazena v amount
  subscr: Mixed, // kopie profiles.subscription z doby zapoceti zpracovani transakce
  recurring: Boolean, // true pokud se jedna o opakovanou platbu, false pokud se jedna o platbu prvni v ramci subscription

  faInvoiceUrl: String,
  faReconciledAt: { type: Date, default: null },

  btDisbursementDate: { type: Date, default: null },
  btSettlementBatchId: String, // braintree settlement batch id
  btSettlementFeeAmount: Number, // fixed braintree fee amount
  btSettlementAmount: Number, // fixed settled amount
  btSettlementCurrencyIsoCode: String, // settlement currency code (GBP)

  qb: {
    invoiceId: String, // quickbooks invoice id assigned to this transaction
    importedAt: { type: Date, default: null }, // when was the transaction imported to quickbooks, new Date(0) - Thu Jan 01 1970 01:00:00 GMT+0100 (CET) in case the should be ignored by quickbooks
    reconciledAt: { type: Date, default: null } // when was the transaction imported to quickbooks, new Date(0) - Thu Jan 01 1970 01:00:00 GMT+0100 (CET) in case the should be ignored by quickbooks
  },

  refunds: [
    {
      // seznam na transakci provedenych refundu
      tm: { type: Date, default: Date.now }, // cas vzniku refundu
      id: String, // identifikator prideleny platebni branou pri vzniku refundu
      desc: String, // popis refundu (duvod)
      amount: Number // refundovana castka
    }
  ],

  coupon: {
    // uplatneny slevovy kupon
    id: SchemaObjectId, // coupon._id
    discount: Number // uplatnena sleva
  },

  subject: {
    // fakturacni udaje z profiles.subject
    org: String, // nazev organizace
    vatId: String, // danovy identifikator DIC uzivatele
    billTo: String, // adresa organizace, vklada se do invoice
    country: String, // two-letter ISO country code http://userpage.chemie.fu-berlin.de/diverse/doc/ISO_3166.html
    qbCustomerId: String, // quickbooks customer id
    faContactUrl: String // freeagent contact URL
  },

  affiliate: {
    // informace o ucastnikovi affiliate programu
    referrer: {
      // informace o partnerovi, ktery privedl vlastnika tohoto profilu
      email: String, // getAmbassador partner email
      campaignId: String, // getAmbassador campaign ID
      mbsy: String // getAmbassador partner short code
    },
    approved: Boolean, // true-pokud je commision schvalena, false-pokud jeste neni
    commision: Number // fixed castka odpovidajici komisi partnerovi
  }
});

Transaction.index({ pid: 1 }, { unique: false });
Transaction.index({ pid: 1, payedAt: 1 }, { unique: false });
Transaction.index({ id: 1 }, { unique: false });
Transaction.index({ _id: 1, pid: 1 }, { unique: false });

// penezni hodnota DPH obsazena v amount
Transaction.virtual('vat').get(function () {
  return this.amount - this.net;
});

// cista hodnota transakce bez obsazene DPH
Transaction.virtual('net').get(function () {
  return this.vatInc ? Math.floor(this.amount * 100 / (100 + this.vatInc)) : this.amount;
});

export default registerModel('Transaction', Transaction);
