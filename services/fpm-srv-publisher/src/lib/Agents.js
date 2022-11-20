/* jshint node: true, esversion: 6 */

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const HttpAgent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;

var cache = {};

function createAgent(name, overrideSecure) {
	var options = config.get('agents:'+name);

	if (!options) {
		throw new Error('Configration for agent '+name+' not found');
	}
	if ((options.secure === null || options.secure === undefined) && (overrideSecure ===  null || overrideSecure === undefined)) {
		throw new Error('Configration for agent '+name+' is missing "secure" option');
	}

	var AgentClass = overrideSecure || options.secure ? HttpsAgent : HttpAgent,
	    agent = new AgentClass(options);

	return agent;
}

function getAgent(name, overrideSecure) {
	var agent = cache[name];
	if (!agent) {
		agent = createAgent(name, overrideSecure);
		if (agent) {
			cache[name] = agent;
		}
	}
	return agent;
}

module.exports = getAgent;