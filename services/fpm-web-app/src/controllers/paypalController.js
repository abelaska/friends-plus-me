/* jshint node: true */

const log = require("@fpm/logging").default;
const ipn = require("paypal-ipn");
const PayPalPG = require("../lib/paygateways/PayPal");

module.exports = ({ router, customerLifecycle, profileManager }) => {
	/* router.get('/1/paypal/callback/success/:token/:data', function(req, res) {
    console.log('Paypal Success Token/Data Callback',req.params.token,req.params.data);
    res.redirect(config.get('http:api:url')+'/1/paypal/callback/success/'+req.params.data+'?fpmetoken='+req.params.token);
  });

  router.get('/1/paypal/callback/success/:data', tools.tokenRequired, function(req, res) {
    // TODO aktivace paypal planu a overeni tokenu predaneho z paypalu
    console.log('Paypal Success Data Callback',req.params.data);
    res.redirect(config.get('http:ui:url')+'/profile');
    //?auth=XXX.XXX.XXX&amp;form_charset=UTF-8
  }); */

	router.post("/1/paypal/ipn/callback", (req, res) => {
		// natvrdo odeslani navratoveho kodu
		res.status(200).end();

		const ipnData = req.body;

		ipn.verify(ipnData, (err, msg) => {
			if (err) {
				log.error("Failed to verify PayPal IPN notification.", {
					ipnData,
					error: msg,
				});
			} else {
				new PayPalPG({ customerLifecycle, profileManager }).webhook(
					ipnData,
					(err2) => {
						if (err2) {
							log.error("Failed to process PayPal IPN webhook", {
								error: err2,
							});
						}
					},
				);
			}
		});
	});
};
