/* eslint import/no-extraneous-dependencies: "off", global-require: "off", import/no-dynamic-require: "off", no-multi-assign: "off", no-unused-vars: "off", no-mixed-operators: "off" */

import test from "ava";
import { SSOInvalidSessionIdError } from "../SSOError";
import SSOSessionManager from "../SSOSessionManager";

const sess = new SSOSessionManager({
	redisConfig: {},
	sessionKey: "XXX",
});

test.before("init session", async () => {
	await sess.init();
});

// test('prepare testing session key', async t => {
//   const encryptedSessionKey = await sess.kms.encrypt('TESTKEY');
//   t.truthy(encryptedSessionKey);
// });

test("encrypt and decrypt data", async (t) => {
	const plain = "session";
	const encrypted = sess.encryptSession(plain);
	t.truthy(encrypted);
	const decrypted = sess.decryptSession(encrypted);
	t.truthy(decrypted);
	t.is(decrypted, plain);
});

test("encrypt and decrypt session id", async (t) => {
	const encryptedSessionId = sess.encryptSessionId("session id");
	t.truthy(encryptedSessionId);
	const plainSessionId = sess.decryptSessionId(encryptedSessionId);
	t.is(plainSessionId, "session id");
});

test("decrypt invalid session id", async (t) => {
	const encryptedSessionId = sess.encryptSessionId("session id");
	t.truthy(encryptedSessionId);
	try {
		sess.decryptSessionId(`invalid${encryptedSessionId}`);
		t.fail("should have failed");
	} catch (e) {
		t.truthy(e instanceof SSOInvalidSessionIdError);
	}
	try {
		const plain = Buffer.from(encryptedSessionId, "base64").fill("0", 0, 1);
		const decrypted = sess.decryptSessionId(plain.toString("base64"));
		t.fail("should have failed");
	} catch (e) {
		t.truthy(e instanceof SSOInvalidSessionIdError);
	}
});

test("generate new plain session id", async (t) => {
	const newSessionId = sess.newSessionId();
	t.truthy(newSessionId);
});

test("set new session with timeout", async (t) => {
	const session = { a: "b" };
	const newSessionId = sess.newSessionId();
	t.truthy(newSessionId);
	const reply = await sess.set(newSessionId, session, { ttl: 60 });
	t.is(reply, "OK");
	const fndSess = await sess.get(newSessionId);
	t.truthy(fndSess);
	t.deepEqual(fndSess, session);
});

test("set new session without timeout", async (t) => {
	const session = { a: "b" };
	const newSessionId = sess.newSessionId();
	t.truthy(newSessionId);
	const reply = await sess.set(newSessionId, session, { ttl: -1 });
	t.is(reply, "OK");
	const fndSess = await sess.get(newSessionId);
	t.truthy(fndSess);
	t.deepEqual(fndSess, session);
});

test("set new session for removal", async (t) => {
	const session = { a: "b" };
	const newSessionId = sess.newSessionId();
	t.truthy(newSessionId);
	let reply = await sess.set(newSessionId, session, { ttl: -1 });
	t.is(reply, "OK");
	let fndSess = await sess.get(newSessionId);
	t.truthy(fndSess);
	t.deepEqual(fndSess, session);
	reply = await sess.set(newSessionId, null, { ttl: -1 });
	t.is(reply, 1);
	fndSess = await sess.get(newSessionId);
	t.falsy(fndSess);
	reply = await sess.set(newSessionId, null, { ttl: -1 });
	t.is(reply, 0);
});

test("get unknown session with invalid id", async (t) => {
	try {
		await sess.get(`unknown:session:${new Date().valueOf()}`);
		t.fail("should have failed");
	} catch (e) {
		t.truthy(e instanceof SSOInvalidSessionIdError);
	}
});

test("get unknown session", async (t) => {
	t.falsy(await sess.get(sess.newSessionId()));
});
