/*jshint -W106*/
"use strict";

angular.module("fpmApp").controller("ProfilePayPalSuccessCtrl", [
	"$scope",
	"$location",
	"$state",
	"Google",
	function ($scope, $location, $state, Google) {
		$scope.Google = Google;

		if ($location.absUrl().indexOf("merchantRet.x=") > 0) {
			// ?merchantRet.x=Return+To+Merchant&auth=XXX.XXX.XXX&form_charset=UTF-8#/premium/paypal/success
			$state.go("profiles.pid.billing", { pid: Google.profile._id });
		}
	},
]);
