import { registerModel, Schema } from '../db';

const VatRate = new Schema({
  country: String, // two-letter ISO country code http://userpage.chemie.fu-berlin.de/diverse/doc/ISO_3166.html
  rate: Number,
  updatedAt: Date
});

VatRate.index({ country: 1 }, { unique: true });

export default registerModel('VatRate', VatRate);
