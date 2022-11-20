/*jshint node: true */
"use strict";

const config = require("@fpm/config");
const log = require("@fpm/logging").default;
const {
	dbUpdatedCount,
	dbNotUpdated,
	Profile,
	Sequence,
	AffiliateCommision,
	Transaction,
} = require("@fpm/db");

exports.signup = function signup(profile, callback) {
	// nove vytvareny uzivatel {is_deactivated:true}
	Sequence.nextAffiliate(
		function (data) {
			var partnerId = data.hash,
				url = config.get("http:ui:url") + "/partner/" + partnerId,
				affiliate = {
					partnerId: partnerId,
					url: url,
				},
				$set = {
					"affiliate.partnerId": partnerId,
					"affiliate.url": url,
				};

			Profile.update(
				{ _id: profile._id },
				{ $set: $set },
				function (err, updated) {
					if (err || dbNotUpdated(updated)) {
						log.error("Failed to assign affiliate partnership to profile", {
							profileId: profile._i.toString(),
							partnerId: partnerId,
							url: url,
							error: err || "Profile record not updated",
						});
						return callback(
							err || { error: { message: "Failed to update profile record" } },
						);
					}

					log.info("Affiliate partnership successfully assigned to profile", {
						profileId: profile._id.toString(),
						partnerId: partnerId,
						url: url,
					});

					profile.affiliate = affiliate;

					callback(null, profile);
				},
			);
		},
		function (err) {
			log.error("Failed to get new affiliate partner sequence", {
				error: err,
			});
			callback(
				err || {
					error: { message: "Failed to get new affiliate partner sequence" },
				},
			);
		},
	);
};

exports.payment = function payment(
	profile,
	owner,
	tx,
	premiumManager,
	callback,
) {
	var affRef = profile.affiliate && profile.affiliate.referrer,
		mbsy = affRef && affRef.mbsy,
		uid = owner._id,
		revenue = tx.amount,
		txId = tx._id.toString(),
		campaignId = affRef && affRef.campaignId,
		referrer = {
			campaignId: campaignId,
			mbsy: mbsy,
		};

	if (!mbsy || !campaignId) {
		return callback(null, false);
	}

	Profile.findOne(
		{
			"affiliate.partnerId": mbsy,
		},
		"_id plan",
		function (err, referrerProfile) {
			if (err || !referrerProfile) {
				log.error("Failed to find affiliate referrer profile", {
					mbsy: mbsy,
					error: err,
				});
				return callback(err);
			}

			var isPAYWYU = referrerProfile.plan.name === "PAYWYU";
			var isApproved = isPAYWYU;
			var isNotApproved = !isApproved;

			AffiliateCommision.findOne({ mbsy: mbsy, uids: uid }, function (err, c) {
				if (err) {
					log.error("Failed to find affiliate commision record", {
						mbsy: mbsy,
						uid: uid.toString(),
						error: err,
					});
					return callback(err);
				}

				var commision = 0,
					update = {};
				if (c) {
					commision = Math.floor(revenue * 0.03);
				} else {
					update.$addToSet = {
						uids: uid,
					};
					commision = Math.floor(revenue * 0.05);
				}
				if (isNotApproved) {
					update.$inc = {
						approve: commision,
					};
				}
				update.$push = {
					commisions: {
						tx: txId,
						approved: isApproved,
						campaign: campaignId,
						revenue: revenue,
						commision: commision,
						uid: uid,
					},
				};

				AffiliateCommision.update(
					{
						mbsy: mbsy,
						"commisions.tx": { $ne: txId },
					},
					update,
					{ upsert: true },
					function (err, updated) {
						if (err || dbNotUpdated(updated)) {
							if (err.code === 11000) {
								log.warn("Affiliate commision already exists", {
									mbsy: mbsy,
									update: JSON.stringify(update),
								});
								err = null;
							} else {
								log.error("Failed to create affiliate commision", {
									mbsy: mbsy,
									update: JSON.stringify(update),
									updated: updated && updated.result,
									error: err,
								});
							}
							return callback(err, dbUpdatedCount(updated) ? true : false);
						}

						if (commision <= 0) {
							return callback(err, dbUpdatedCount(updated) ? true : false);
						}

						if (premiumManager && isPAYWYU && isApproved) {
							premiumManager.creditAffiliate(
								{
									commision: commision,
									tx: tx.id.toString(),
								},
								profile,
								function (err) {
									if (err) {
										log.error("Failed to credit affiliate payment", {
											mbsy: mbsy,
											referrer: referrer,
											commision: commision,
											txId: tx._id.toString(),
											error: err,
										});
									} else {
										log.info("Credited affiliate payment", {
											mbsy: mbsy,
											referrer: referrer,
											commision: commision,
											txId: tx._id.toString(),
										});
									}
								},
							);
						}

						// ulozit do transakce castku rezervovanou pro affiliate
						Transaction.update(
							{ _id: tx._id },
							{
								$set: {
									affiliate: {
										//approved: config.get('affiliate:autoApproveCommision') ? true : false,
										approved: isApproved,
										referrer: referrer,
										commision: commision,
									},
								},
							},
							function (err, updated) {
								if (err || dbNotUpdated(updated)) {
									log.error(
										"Failed to assign affiliate commision to transaction",
										{
											txId: tx._id.toString(),
											commision: commision,
											referrer: referrer,
											error: err,
										},
									);
									err = err || {
										error: {
											message:
												"Failed to assign affiliate commision to transaction " +
												tx._id.toString(),
											commision: commision,
											referrer: referrer,
										},
									};
								} else {
									log.info(
										"Affiliate commision successfully assigned to the transaction",
										{
											txId: tx._id.toString(),
											commision: commision,
											referrer: referrer,
										},
									);
								}

								callback(err, dbUpdatedCount(updated) ? true : false);
							},
						);
					},
				);
			});
		},
	);
};

/*payment({
  affiliate: {
    referrer: {
      campaignId: '13235',
      mbsy: '37MZ'
    }
  }
}, {
  _id: 'igorovo-interni-id',
  email: 'igor@nekde.cz',
  fname: 'Igor',
  lname: 'Někde'
}, {
  _id: 'txid'+new Date().valueOf(),
  amount: 2800
}, function(err, data) {
  console.log('err',err,'data',data ? JSON.stringify(data,null,2) : data);

  var commisionFixed = Math.floor(data.response.data.referring_ambassador.commission*100);
  console.log('commisionFixed',commisionFixed);
})*/

/*signup({
  email: 'ab@gmail.com',
  uid: 'internal_uid',
  first_name: 'Alois',
  last_name: 'Bělaška',
  email_new_ambassador: 1,
  auto_create: 1
}, function(err, data) {
  console.log('err',err,'data',data ? JSON.stringify(data,null,2) : data);

  var partnerId,
      memorable_url = data.response.data.ambassador.memorable_url,
      partnerIdRegEx = /^http:\/\/mbsy\.co\/loysoft\/(.+)$/;

  if (partnerIdRegEx.test(memorable_url)) {
    partnerId = memorable_url.match(partnerIdRegEx)[1];
    console.log('BBB',partnerId,'https://getambassador.com/c/ambassador/'+partnerId+'/dashboard')
    5967685
  } else {
    console.log('AAAA');
  }
})*/
