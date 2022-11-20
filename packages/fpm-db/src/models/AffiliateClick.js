import { registerModel, Schema, Mixed } from '../db';

var AffiliateClick = new Schema(
  {
    mbsy: String, // profile.affiliate.partnerId
    clicks: Mixed /* // celkovy pocet kliknuti
    YYYYMMDD: {counter}
  */,
    leads: Mixed /* // pocet kliknuti nove zaevidovanych uzivatelu
    YYYYMMDD: {counter}
  */
  },
  {
    versionKey: false
  }
);

AffiliateClick.index(
  {
    mbsy: 1
  },
  { unique: true }
);

export default registerModel('AffiliateClick', AffiliateClick);
