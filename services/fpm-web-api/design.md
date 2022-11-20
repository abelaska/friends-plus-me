FORMAT: 1A
HOST: https://api.friendsplus.me/

# Friends+Me API

Friends+Me provides API to manage your account resources such as teams, queues, posts and drafts.

The Friends+Me API allows you to build applications that interact with Friends+Me in more complex ways than the integrations we provide out of the box.

## Basics

The API consists of HTTP RPC-style functions, all of the form https://api.friendsplus.me/FUNCTION.

All functions must be called using HTTPS. Arguments can be passed as GET or POST params, or a mix. The response contains a JSON object, which will always contain a top-level boolean property `ok`, indicating success or failure. For failure results, the `error` property will contain a short machine-readable error code. In the case of problematic calls that could still be completed successfully, `ok` will be true.

```
{
    "ok": true,
    "stuff": "This is good"
}
```

```
{
    "ok": false,
    "error": "something_bad"
}
```

Other properties are defined in the documentation for the relevant function.

### Output JSON formatting

You can add parameter `pretty` with value `true` to the request url, data output will include line breaks and indentation to make it more readable.

If set to `false` or not present, unnecessary whitespace is removed, reducing the size of the response. Defaults to `false`.

### Appending Scopes

As you make API requests, a X-OAuth-Scopes HTTP header will be returned with every response indicating which scopes the calling token currently has:

```
X-OAuth-Scopes: identity.basic,identity.email,identity.avatar
```

## API Rate Limits

### Per User or Per Application

Rate limiting of the API is primarily on a per-user basis, more accurately described, per-user limit is applied if access token is used.

Per-user limit is 200 API requests per 100 seconds.

When using application-only authentication ([oauth.*](#reference/oauth) functions), rate limits are determined globally for the entire application. This limit is considered completely separately from per-user limits.

Per-application limit is 1000 API requests per 100 seconds.

### HTTP-based APIs

Use the HTTP headers in order to understand where the application is at for a given rate limit, on the method that was just utilized. Every response contains these headers.

* `x-rate-limit-limit` - the rate limit ceiling for that given endpoint
* `x-rate-limit-remaining` - the number of requests left for the 100 second or 24 hour window
* `x-rate-limit-reset` - the remaining window before the rate limit resets, in UTC [epoch seconds](http://en.wikipedia.org/wiki/Unix_time)

For example:

```
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 499
X-RateLimit-Reset: 1392815263

{
  "foo": "bar"
}
```

If you go over these limits when using our HTTP based APIs, Friends+Me will start returning a `HTTP 429 Too Many Requests` error, a `Retry-After` header containing the number of seconds until you can retry and error body:

```
HTTP/1.1 429 TOO MANY REQUESTS
Content-Type: application/json
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1392815263
Retry-After: 50

{
    ok: false,
    error: 'rate_limit',
    error_description: `Rate limit "user" exceeded, retry in 50 seconds`
}
```

### Other functionality

We reserve the right to rate limit other functionality to prevent abuse, spam, denial-of-service attacks, or other security issues. Where possible we'll return a descriptive error message, but the nature of this type of rate limiting often prevents us from providing more information.

## Pagination

### Paginating through collections

Throughout the Friends+Me platform you'll often encounter collections of things. Lists of teams. Arrays of queues.

Very few of these collections are paginated today. Instead, you're likely to receive everything in the collection. Some collections are enormous and instead of receiving all of it, you'll receive it truncated instead, for example posts.

#### Timeline functions

These functions are more positional than page oriented and allow you to navigate through time with `oldest`, `latest`, and a special `inclusive` parameter.

#### Traditional paging

These functions use some form of archaic numeric-based `page` and `count` or other limiting parameters.

## Using OAuth 2.0

OAuth 2.0 is a protocol that lets your app request authorization to private details in a user's Friends+Me account without getting their password.

You'll need to [register your app](https://developers.friendsplus.me/apps) before getting started. A registered app is assigned a unique Client ID and Client Secret which will be used in the OAuth flow. The Client Secret should not be shared.

Friends+Me uses OAuth 2.0's [authorization code grant](https://tools.ietf.org/html/rfc6749#section-4.1) and [refresh token grant](https://tools.ietf.org/html/rfc6749#section-1.5) to issue access tokens on behalf of users.

### Step 1 - Authorization

Your web or mobile app should redirect users to the following URL:

`https://api.friendsplus.me/oauth.authorize`

The following values should be passed as GET parameters:

+ Parameters
    + `client_id`: CLIENT_ID (string) - Your application's Client ID.
    + `scope`: admin offline (string) - The scopes which you want to request authorization for. These must be separated by a space. You can request any scopes supported by the Friends+Me API (for example, read, write, ...). Include **offline** to get a refresh token.
    + `response_type`: code (string) - Indicates to Friends+Me which OAuth 2.0 flow you want to perform. Use **code** for Authorization Code Grant Flow.
    + `redirect_uri`: https://myapp.com/callback (URL, required) - The URL to which Friends+Me will redirect the browser after authorization has been granted by the user.
    + `state`: RANDOM_STATE (string,optional) - An opaque value the clients adds to the initial request that Friends+Me includes when redirecting the back to the client. This value must be used by the client to prevent CSRF attacks.
    + `prompt` (string,optional) - prompt control.
        + **prompt=consent** will force users to provide consent, even if they have an existing user grant for that client and requested scopes.
        + **prompt=none** is a workaround to improve user experience. This will not display the login dialog or the consent dialog. In addition to that if you call /oauth.authorize from a hidden iframe and extract the new access token from the parent frame, then the user will not see the redirects happening.

### Step 2 - Token Issuing

If the user authorizes your app, Friends+Me will redirect back to your specified `redirect_uri` with a temporary `code` in a code GET parameter, as well as a `state` parameter if you provided one in the previous step. If the states don't match, the request may have been created by a third party and you should abort the process.

**Authorization codes may only be exchanged once.**

If all is well, exchange the authorization code for an access token using the oauth.access API function.

`https://api.friendsplus.me/oauth.access`

+ Parameters
    + `client_id`: CLIENT_ID (string) - Your application's Client ID.
    + `client_secret`: CLIENT_SECRET (string) - Your application's Client Secret.
    + `code`: AUTHORIZATION_CODE (string) - The Authorization Code received from the initial /oauth.authorize call.
    + `redirect_uri`: https://myapp.com/callback (string) - This is required only if it was set at the GET /oauth.authorize endpoint. The values must match.

You'll receive a JSON response containing an `access_token` and `refresh_token` (among other details):

```
{
    "ok": true,
    "access_token": "eyJ...MoQ",
    "refresh_token":"GEbRxBN...edjnXbL",
    "expires_in": 86400,
    "token_type": "Bearer"
}
```

You can then use this token to call API functions on behalf of the user. The token will continue functioning until the installing user either revokes the token and/or uninstalls your application.

### Step 2a - Denied Requests

If the user denies your request, Friends+Me redirects back to your `redirect_uri` with an `error` parameter.

`https://myapp.com/callback?error=access_denied&error_description=User%20did%20not%20authorize%20the%20request`

Applications should handle this condition appropriately.

### Tokens

Authenticate your API requests by providing a bearer token, which identifies a single user.

Tokens should be passed in all API calls as a parameter called `access_token`.

Default lifetime of access token is 1 hour.

Refresh tokens never expire and can be revoked using function oauth.revoke if necessary.

**Treat tokens with care.** Never share tokens with other users or applications. Do not publish tokens in public code repositories.

### Scopes

| Scope                 | Short Description |
|-----------------------|-------------------|
| `admin`               | Administer your user account
| `drafts`              | Access and modify your drafts
| `drafts.read`         | Access information about your drafts
| `drafts.write`        | Modify your drafts
| `identity`            | Confirm your identity, email and avatar
| `identity.basic`      | Confirm your identity
| `identity.email`      | View your email address
| `identity.avatar`     | View your Friends+Me avatar
| `users.read`          | Access your team’s profile information
| `users.read.email`    | View email addresses of people on your team
| `users.write`         | Modify your profile information
| `teams`               | Access and modify your teams
| `teams.read`          | Access information about your teams
| `teams.write`         | Modify your teams
| `posts`               | Access, modify and schedule your posts
| `posts.read`          | Access information about your posts
| `posts.write`         | Modify your posts
| `posts.schedule`      | Schedule posts to a queue
| `queues`              | Access and modify your queues
| `queues.history`      | Access historic content in your queue
| `queues.read`         | Access information about your queues
| `queues.write`        | Modify your queues

# Group oauth

## oauth.authorize [GET /oauth.authorize{?redirect_uri,state,client_id,response_type,scope,prompt}]

The authorization code grant should be very familiar if you’ve ever signed into a web app using your Facebook or Google account.

To get a refresh token, you must include the `offline` scope when you initiate an authentication request through the authorize endpoint.

The client will redirect the user to the authorization server, user will be asked to login to the authorization server and approve the client.

If the user approves the client they will be redirected from the authorization server to the client’s redirect URI with the following parameters in the query string:

* **code** with the authorization code
* **state** with the state parameter sent in the original request. You should compare this value with the value stored in the user’s session to ensure the authorization code obtained is in response to requests made by this client rather than another client application.

+ Parameters
    + `client_id`: `CLIENT_ID` (string, required) - Your application's Client ID.
    + `scope`: `admin offline` (string, optional) - The scopes which you want to request authorization for. These must be separated by a space. You can request any scopes supported by the Friends+Me API (for example, read, write, ...). Include **offline** to get a refresh token.
        + Default: `admin offline`
    + `response_type`: code (string, required) - Indicates to Friends+Me which OAuth 2.0 flow you want to perform. Use **code** for Authorization Code Grant Flow.
    + `redirect_uri`: `https://myapp.com/callback` (URL, required) - The URL to which Friends+Me will redirect the browser after authorization has been granted by the user.
    + `state`: `RANDOM_STATE` (string, optional) - An opaque value the clients adds to the initial request that Friends+Me includes when redirecting the back to the client. This value must be used by the client to prevent CSRF attacks.
    + `prompt` (string, optional) - prompt control.
        + **prompt=consent** will force users to provide consent, even if they have an existing user grant for that client and requested scopes.
        + **prompt=none** is a workaround to improve user experience. This will not display the login dialog or the consent dialog. In addition to that if you call /oauth.authorize from a hidden iframe and extract the new access token from the parent frame, then the user will not see the redirects happening.

+ Request User approves the client
    + Parameters
        + `client_id`: `CLIENT_ID`
+ Response 302

    + Headers

            Location: https://myapp.com/callback?code=AUTHORIZATION_CODE&state=RANDOM_STATE

+ Request User rejects the client
    + Parameters
        + `client_id`: `CLIENT_ID`
+ Response 302

    + Headers

            Location: https://myapp.com/callback?error=access_denied&error_description=User%20did%20not%20authorize%20the%20request&state=STATE

## oauth.deauthorize [GET /oauth.deauthorize{?access_token}]

Deauthorize your client for the user, revoke the client.

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string, required) - Authentication token.

+ Response 200 (application/json)
    + Attributes (Deauthorize Response)

    + Body

            {
                "ok": true,
                "deauthorized": true
            }

## oauth.access [GET /oauth.access{?client_id,client_secret,code,redirect_uri}]

**Authorization Code Grant Flow** This is the OAuth 2.0 grant that regular web apps utilize in order to access an API. Use this endpoint to exchange an Authorization Code for access and refresh tokens.

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `user_inactive`    | Authentication token is for a deleted user.
| `user_not_found`   | Authentication token user not found.
| `internal_error`   | Internal error.

+ Parameters
    + `client_id`: `CLIENT_ID` (string, required) - Your application's Client ID.
    + `client_secret`: `CLIENT_SECRET` (string, required) - Your application's Client Secret.
    + `code`: `AUTHORIZATION_CODE` (string, required) - The Authorization Code received from the initial /oauth.authorize call.
    + `redirect_uri`: `https://myapp.com/callback` (string, required) - This is required only if it was set at the GET /oauth.authorize endpoint. The values must match.

+ Response 200 (application/json)
    + Attributes (Authorization Code Grant Response)

    + Body

            {
                "ok": true,
                "access_token": "eyJ...MoQ",
                "refresh_token":"GEbRxBN...edjnXbL",
                "expires_in": 86400,
                "token_type": "Bearer"
            }

## oauth.token [GET /oauth.token{?client_id,client_secret,refresh_token}]

**Refresh Token Grant** Use this endpoint to refresh an access token, using the refresh token you got during authorization.

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `internal_error`   | Internal error.

+ Parameters
    + `client_id`: `CLIENT_ID` (string, required) - Your application's Client ID.
    + `client_secret`: `CLIENT_SECRET` (string, required) - Your application's Client Secret.
    + `refresh_token`: `REFRESH_TOKEN` (string, required) - The refresh token to use.

+ Response 200 (application/json)
    + Attributes (Refresh Token Grant Response)

    + Body

            {
                "ok": true,
                "access_token": "eyJ...MoQ",
                "expires_in": 86400,
                "scope": "admin offline",
                "token_type": "Bearer"
            }

## oauth.revoke [GET /oauth.revoke{?client_id,client_secret,refresh_token}]

Since refresh tokens never expire, you need to have a way to invalidate them in case they are compromised or you no longer need them. You can do use using this function.

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `internal_error`   | Internal error.

+ Parameters
    + `client_id`: `CLIENT_ID` (string, required) - Your application's Client ID.
    + `client_secret`: `CLIENT_SECRET` (string, required) - Your application's Client Secret.
    + `refresh_token`: `REFRESH_TOKEN` (string, required) - The refresh token you want to revoke.

+ Response 200 (application/json)
    + Attributes (Refresh Token Revoke Response)

    + Body

            {
                "ok": true,
                "revoked": true
            }

# Group api

## api.test [GET /api.test{?foo,error}]

This function helps you test your calling code.

### Response

The response includes any supplied arguments:

```
{
    "ok": true,
    "args": {
        "foo": "bar"
    }
}
```

If called with an `error` argument an error response is returned:

```
{
    "ok": false,
    "error": "my_error",
    "args": {
        "error": "my_error"
    }
}
```

+ Parameters
    + `error`: `my_error` (string, optional) - Error response to return
    + `foo`: `bar` (string, optional) - Example property to return

+ Response 200 (application/json)
    + Attributes (Response)

    + Body

            {
                "ok": false,
                "error": "my_error",
                "args": {
                    "foo": "bar",
                    "error": "my_error"
                }
            }

# Group users

## users.identity [GET /users.identity{?access_token}]

Get a user's identity.

After your Friends+Me app is awarded an identity token through Sign in with Friends+Me, use this function to retrieve a user's identity.

The returned fields depend on any additional authorization scopes you've requested, `identity.avatar` and `identity.email`.

This function may only be used by tokens with the `identity.basic` scope, as provided in the Sign in with Friends+Me process.

### Expected scopes

`identity.basic`

### Optional scopes

`identity` `identity.email` `identity.avatar`

### Response

You will receive at a minimum the following information:

```
{
    "ok": true,
    "user": {
        "user_id": "53ed091db33c30ef172172ed",
        "name": "Alois Bělaška"
    }
}
```

### Authorization scopes

In addition, you can request access to additional profile fields by adding the following authorization scopes to your OAuth request:

`identity.email` provides the team member's email address, if available:

```
{
    "ok": true,
    "user": {
        "user_id": "53ed091db33c30ef172172ed",
        "name": "Alois Bělaška",
        "email": "alois@domain.com"
    }
}
```

`identity.avatar` yield the team member's avatar images.

```
{
    "ok": true,
    "user": {
        "user_id": "53ed091db33c30ef172172ed",
        "name": "Alois Bělaška",
        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
    }
}
```

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `user_inactive`    | Authentication token is for a deleted user.
| `user_not_found`   | Authentication token user not found.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `identity.basic`

+ Response 200 (application/json)
    + Attributes (User Identity Response)

    + Body

            {
                "ok": true,
                "user": {
                    "user_id": "53ed091db33c30ef172172ed",
                    "name": "Alois Bělaška"
                }
            }

## users.info [GET /users.info{?access_token,user}]

Gets information about a user / team member.

### Expected scopes

`users.read`

### Optional scopes

`users.read.email`

### Response

You will receive at a minimum the following information:

```
{
    "ok": true,
    "user": {
        "user_id": "53ed091db33c30ef172172ed",
        "created": 1502951493,
        "name": "Alois Bělaška",
        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
    }
}
```

### Authorization scopes

In addition, you can request access to additional profile fields by adding the following authorization scopes to your OAuth request:

`users.read.email` provides the team member's email address, if available:

```
{
    "ok": true,
    "user": {
        "user_id": "53ed091db33c30ef172172ed",
        "created": 1502951493,
        "name": "Alois Bělaška",
        "email": "alois@domain.com",
        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
    }
}
```

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `access_denied`    | Access denied.
| `user_inactive`    | Authentication token is for a deleted user.
| `user_not_found`   | Value passed for `user` was invalid.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `users.read`
    + `user`: 53ed091db33c30ef172172ed (string) - User to get info on

+ Response 200 (application/json)
    + Attributes (User Info Response)

    + Body

            {
                "ok": true,
                "user": {
                    "user_id": "53ed091db33c30ef172172ed",
                    "created": 1502951493,
                    "name": "Alois Bělaška",
                    "email": "alois@domain.com",
                    "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                }
            }

# Group teams

## teams.list [GET /teams.list{?access_token,exclude_members,exclude_queues}]

Lists teams and queues that the calling user has access to.

### Expected scopes

`teams.read`

### Optional scopes

`teams`


### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `user_inactive`    | Authentication token is for a deleted user.
| `user_not_found`   | Authentication token user not found.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `teams.read`
    + `exclude_members`: false (boolean, optional) - Exlude the `members` from each `team`
        + Default: false
    + `exclude_queues`: false (boolean, optional) - Exlude the `queues` from each `team`
        + Default: false

+ Response 200 (application/json)
    + Attributes (Teams Response)

    + Body

            {
                "ok": true,
                "teams": [
                    {
                        "team_id": "539c5b8bfb1d60bf42125524",
                        "created": 1502951493,
                        "name": "Social Team",
                        "members": [
                            {
                                "user_id": "53ed091db33c30ef172172ed",
                                "name": "Alois Bělaška",
                                "role": "owner",
                                "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                            },
                            {
                                "user_id": "53ed091db33c30ef172172ee",
                                "name": "John Doe",
                                "role": "tmanager",
                                "avatar": "https://lh3.googleusercontent.com/image/-n-0L5nvI570/AAAAAAAAAAI/AAAAAAAAAAA/V0sHAqXP4pk/s50/photo.jpg"
                            }
                        ],
                        "queues": [
                            {
                                "queue_id": "53ed091db33c30ef172172ef",
                                "created": 1502951493,
                                "created_by": {
                                    "user_id": "53ed091db33c30ef172172ed",
                                    "name": "Alois Bělaška",
                                    "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                                },
                                "name": "Friends+Me",
                                "state": "enabled",
                                "picture": "https://lh3.googleusercontent.com/-dHBGGCq7AD4/AAAAAAAAAAI/AAAAAAAACps/jezO8o02B4Y/photo.jpg?sz=50",
                                "service": {
                                    "type": "google",
                                    "category": "page",
                                    "id": "105750980959577516811",
                                    "url": "https://plus.google.com/+FriendsPlusMe"
                                },
                                "scheduling": {
                                    "timezone": "Europe/Prague",
                                    "schedules": [
                                        {
                                            "days": ["mon", "tue"],
                                            "times": ["10:35", "12:45", "20:30"]
                                        }
                                    ]
                                },
                                "size": 28
                            },
                            {
                                "queue_id": "53ed091db33c30ef172172f0",
                                "created": 1502951573,
                                "created_by": {
                                    "user_id": "53ed091db33c30ef172172ed",
                                    "name": "Alois Bělaška",
                                    "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                                },
                                "name": "Friends+Me",
                                "state": "enabled",
                                "picture": "https://graph.facebook.com/207434606051711/picture?type=small",
                                "service": {
                                    "type": "facebook",
                                    "category": "page",
                                    "id": "207434606051711",
                                    "url": "https://www.facebook.com/207434606051711"
                                },
                                "scheduling": {
                                    "timezone": "Europe/Prague",
                                    "schedules": [
                                        {
                                            "days": ["mon", "tue"],
                                            "times": ["10:35", "12:45", "20:30"]
                                        }
                                    ]
                                },
                                "size": 8
                            }
                        ]
                    }
                ]
            }

## teams.info [GET /teams.info{?access_token,team}]

Gets information about a team.

### Expected scopes

`teams.read`

### Optional scopes

`teams`


### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `access_denied`    | Access denied.
| `user_not_found`   | Authentication token user not found.
| `team_not_found`   | Requested team not found.
| `user_inactive`    | Authentication token is for a deleted user.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `teams.read`
    + `team`: 539c5b8bfb1d60bf42125524 (string) - Team to get info on

+ Response 200 (application/json)
    + Attributes (Team Response)

    + Body

            {
                "ok": true,
                "team": {
                    "team_id": "539c5b8bfb1d60bf42125524",
                    "created": 1502951493,
                    "name": "Social Team",
                    "members": [
                        {
                            "user_id": "53ed091db33c30ef172172ed",
                            "name": "Alois Bělaška",
                            "role": "owner",
                            "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                        },
                        {
                            "user_id": "53ed091db33c30ef172172ee",
                            "name": "John Doe",
                            "role": "tmanager",
                            "avatar": "https://lh3.googleusercontent.com/image/-n-0L5nvI570/AAAAAAAAAAI/AAAAAAAAAAA/V0sHAqXP4pk/s50/photo.jpg"
                        }
                    ],
                    "queues": [
                        {
                            "queue_id": "53ed091db33c30ef172172ef",
                            "created": 1502951493,
                            "created_by": {
                                "user_id": "53ed091db33c30ef172172ed",
                                "name": "Alois Bělaška",
                                "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                            },
                            "name": "Friends+Me",
                            "state": "enabled",
                            "picture": "https://lh3.googleusercontent.com/-dHBGGCq7AD4/AAAAAAAAAAI/AAAAAAAACps/jezO8o02B4Y/photo.jpg?sz=50",
                            "service": {
                                "type": "google",
                                "category": "page",
                                "id": "105750980959577516811",
                                "url": "https://plus.google.com/+FriendsPlusMe"
                            },
                            "scheduling": {
                                "timezone": "Europe/Prague",
                                "schedules": [
                                    {
                                        "days": ["mon", "tue"],
                                        "times": ["10:35", "12:45", "20:30"]
                                    }
                                ]
                            },
                            "size": 28
                        },
                        {
                            "queue_id": "53ed091db33c30ef172172f0",
                            "created": 1502951573,
                            "created_by": {
                                "user_id": "53ed091db33c30ef172172ed",
                                "name": "Alois Bělaška",
                                "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                            },
                            "name": "Friends+Me",
                            "state": "enabled",
                            "picture": "https://graph.facebook.com/207434606051711/picture?type=small",
                            "service": {
                                "type": "facebook",
                                "category": "page",
                                "id": "207434606051711",
                                "url": "https://www.facebook.com/207434606051711"
                            },
                            "scheduling": {
                                "timezone": "Europe/Prague",
                                "schedules": [
                                    {
                                        "days": ["mon", "tue"],
                                        "times": ["10:35", "12:45", "20:30"]
                                    }
                                ]
                            },
                            "size": 8
                        }
                    ]
                }
            }

# Group queues

## queues.list [GET /queues.list{?access_token,team}]

Lists queues that the calling user has access to.

### Expected scopes

`queues.read`

### Optional scopes

`queues`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `access_denied`    | Access denied.
| `user_not_found`   | Authentication token user not found.
| `team_not_found`   | Requested team not found.
| `user_inactive`    | Authentication token is for a deleted user.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `queues.read`
    + `team`: 539c5b8bfb1d60bf42125524 (string, optional) - List this team queues or list all queues available to this user if this parameter is not set.

+ Response 200 (application/json)
    + Attributes (Queues Response)

    + Body

            {
                "ok": true,
                "queues": [
                    {
                        "queue_id": "53ed091db33c30ef172172ef",
                        "created": 1502951493,
                        "created_by": {
                            "user_id": "53ed091db33c30ef172172ed",
                            "name": "Alois Bělaška",
                            "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                        },
                        "name": "Friends+Me",
                        "state": "enabled",
                        "picture": "https://lh3.googleusercontent.com/-dHBGGCq7AD4/AAAAAAAAAAI/AAAAAAAACps/jezO8o02B4Y/photo.jpg?sz=50",
                        "service": {
                            "type": "google",
                            "category": "page",
                            "id": "105750980959577516811",
                            "url": "https://plus.google.com/+FriendsPlusMe"
                        },
                        "scheduling": {
                            "timezone": "Europe/Prague",
                            "schedules": [
                                {
                                    "days": ["mon", "tue"],
                                    "times": ["10:35", "12:45", "20:30"]
                                }
                            ]
                        },
                        "size": 28
                    },
                    {
                        "queue_id": "53ed091db33c30ef172172f0",
                        "created": 1502951573,
                        "created_by": {
                            "user_id": "53ed091db33c30ef172172ed",
                            "name": "Alois Bělaška",
                            "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                        },
                        "name": "Friends+Me",
                        "state": "enabled",
                        "picture": "https://graph.facebook.com/207434606051711/picture?type=small",
                        "service": {
                            "type": "facebook",
                            "category": "page",
                            "id": "207434606051711",
                            "url": "https://www.facebook.com/207434606051711"
                        },
                        "scheduling": {
                            "timezone": "Europe/Prague",
                            "schedules": [
                                {
                                    "days": ["mon", "tue"],
                                    "times": ["10:35", "12:45", "20:30"]
                                }
                            ]
                        },
                        "size": 8
                    }
                ]
            }

## queues.info [GET /queues.info{?access_token,queue}]

Gets information about a queue.

### Expected scopes

`queues.read`

### Optional scopes

`queues`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `access_denied`    | Access denied.
| `queue_not_found`  | Requested queue not found.
| `user_not_found`   | Authentication token user not found.
| `user_inactive`    | Authentication token is for a deleted user.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `queues.read`
    + `queue`: 53ed091db33c30ef172172ef (string) - Queue to get info on

+ Response 200 (application/json)
    + Attributes (Queue Response)

    + Body

            {
                "ok": true,
                "queue": {
                    "queue_id": "53ed091db33c30ef172172ef",
                    "created": 1502951493,
                    "created_by": {
                        "user_id": "53ed091db33c30ef172172ed",
                        "name": "Alois Bělaška",
                        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                    },
                    "name": "Friends+Me",
                    "state": "enabled",
                    "picture": "https://lh3.googleusercontent.com/-dHBGGCq7AD4/AAAAAAAAAAI/AAAAAAAACps/jezO8o02B4Y/photo.jpg?sz=50",
                    "service": {
                        "type": "google",
                        "category": "page",
                        "id": "105750980959577516811",
                        "url": "https://plus.google.com/+FriendsPlusMe"
                    },
                    "scheduling": {
                        "timezone": "Europe/Prague",
                        "schedules": [
                            {
                                "days": ["mon", "tue"],
                                "times": ["10:35", "12:45", "20:30"]
                            }
                        ]
                    },
                    "size": 28
                }
            }

## queues.updateScheduling [POST /queues.updateScheduling{?access_token,queue}]

Update a queue scheduling.

### Expected scopes

`queues.write`

### Optional scopes

`queues`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `access_denied`    | Access denied.
| `queue_not_found`  | Requested queue not found.
| `user_not_found`   | Authentication token user not found.
| `user_inactive`    | Authentication token is for a deleted user.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `queues.write`
    + `queue`: 53ed091db33c30ef172172ef (string) - Queue to update

+ Request
    + Attributes (Queue Update Scheduling Request)

    + Body

            {
                "timezone": "Europe/Berlin",
                "schedules": [
                    {
                        "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
                        "times": ["9:25", "23:30"]
                    }
                ]
            }

+ Response 200 (application/json)
    + Attributes (Queue Response)

    + Body

            {
                "ok": true,
                "queue": {
                    "queue_id": "53ed091db33c30ef172172ef",
                    "created": 1502951493,
                    "created_by": {
                        "user_id": "53ed091db33c30ef172172ed",
                        "name": "Alois Bělaška",
                        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                    },
                    "name": "Friends+Me",
                    "state": "enabled",
                    "picture": "https://lh3.googleusercontent.com/-dHBGGCq7AD4/AAAAAAAAAAI/AAAAAAAACps/jezO8o02B4Y/photo.jpg?sz=50",
                    "service": {
                        "type": "google",
                        "category": "page",
                        "id": "105750980959577516811",
                        "url": "https://plus.google.com/+FriendsPlusMe"
                    },
                    "scheduling": {
                        "timezone": "Europe/Berlin",
                        "schedules": [
                            {
                                "days": ["mon", "fri"],
                                "times": ["9:25", "23:30"]
                            }
                        ]
                    },
                    "size": 28
                }
            }

## queues.history [GET /queues.history{?access_token,queue,count,inclusive,latest,oldest}]

Fetches history of published posts from a queue.

This function returns a portion of posts from the specified queue. To read the entire history for a queue, call the function with no `latest` or `oldest` arguments, and then continue paging using the instructions below.

`latest` or `oldest` arguments refer to posts completed_at timestamp;

The `posts` array up to 100 posts between `latest` and `oldest`. If there were more than 100 posts between those two points, then `has_more` will be true.

If a post has the same `completed_at` as `latest` or `oldest` it will not be included in the list, unless `inclusive` is true. This allows a client to fetch all posts in a hole in queue history, by calling queues.history with `latest` set to the oldest post they have after the hole, and `oldest` to the latest post they have before the hole. If the response includes `has_more` then the client can make another call, using the `completed_at` value of the final posts as the `latest` param to get the next page of posts.

If there are more than 100 posts between the two timestamps then the posts returned are the ones closest to `latest`. In most cases an application will want the most recent posts and will page backward from there. If `oldest` is provided but not `latest` then the posts returned are those closest to `oldest`, allowing you to page forward through history if desired.

### Expected scopes

`queues.history`

### Optional scopes

`queues`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error               | Description |
|---------------------|-------------|
| `access_denied`     | Access denied.
| `queue_not_found`   | Requested queue not found.
| `user_not_found`    | Authentication token user not found.
| `user_inactive`     | Authentication token is for a deleted user.
| `invalid_ts_latest` | Value passed for `latest` was invalid
| `invalid_ts_oldest` | Value passed for `oldest` was invalid
| `not_authed`        | No authentication token provided.
| `invalid_auth`      | Invalid authentication token.
| `missing_arg`       | The function was not passed all required argument(s).
| `internal_error`    | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `queues.history`
    + `queue`: 53ed091db33c30ef172172ef (string) - List this queue published posts or list all queues available to this user if this parameter is not set.
    + `count`: 100 (number, optional) - Number of posts to return, between 1 and 1000.
        + Default: 100
    + `inclusive`: true (boolean, optional) - Include posts with latest or oldest timestamp in results.
        + Default: false
    + `latest`: 1502987260 (number, optional) - End of time range of posts to include in results.
        + Default: now
    + `oldest`: 0 (number, optional) - Start of time range of posts to include in results.
        + Default: 0

+ Response 200 (application/json)
    + Attributes (Posts Timeline Response)

    + Body

            {
                "ok": true,
                "latest": 1482570010,
                "has_more": false,
                "posts": [
                    {
                        "post_id": "5995521a055975000ff26000",
                        "queue_id": "53ed091db33c30ef172172ef",
                        "team_id": "539c5b8bfb1d60bf42125524",
                        "created": 1477052640,
                        "created_by": {
                            "user_id": "53ed091db33c30ef172172ed",
                            "name": "Alois Bělaška",
                            "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                        },
                        "publish_at": 1482570000,
                        "completed_at": 1482570010,
                        "html": "<p><b>We have a Christmas gift for you!</b></p><p></p><p>Our very first mobile application (Android, iOS) that will enable you to publish / schedule / share posts from your mobile devices.</p><p></p><p><b>iOS Apple Store</b> - https://itunes.apple.com/us/app/friends+me/id1164926573?ls=1&mt=8</p><p></p><p><b>Android Play Store</b> - https://play.google.com/store/apps/details?id=me.friendsplus&utm_campaign=googleplus</p><p></p><p>It is a very basic application at the moment and we'll keep adding more and more features until it's a fully featured alternative to our web application.</p><p></p><p><b>Merry Christmas Everyone and Happy New Year!</b></p>",
                        "state": "published",
                        "url": "https://plus.google.com/+FriendsPlusMe/posts/8JsAbmwxxuv",
                        "attachments": [
                            {
                                "type": "link",
                                "description" : "We have a Christmas gift for you! Our very first mobile application (Android, iOS) that will enable you to publish / schedule / share posts…",
                                "title" : "Friends+Me Mobile App as a Christmas Gift!",
                                "url" : "https://blog.friendsplus.me/friends-me-mobile-app-as-a-christmas-gift-73d29d533e8f",
                                "picture": {
                                    "content_type" : "image/jpeg",
                                    "height" : 566,
                                    "width" : 1060,
                                    "url" : "https://2.bp.blogspot.com/-ZcBaeMW-F5I/WFzc6vgjf7I/AAAAAAADlBc/8_8VRFc3efYbUHMsySNQVCwcpHp2TkD_QCLcB/w1060-h556-p-rw/Friends%252BMe%2B-%2BPF%2B2017.png"
                                }
                            }
                        ]
                    }
                ]
            }

# Group posts

## posts.list [GET /posts.list{?access_token,team,queue,count,inclusive,latest,oldest}]

Fetches list of scheduled posts from a queue or team.

This function returns a portion of scheduled posts from the specified queue or team. To read the entire list for a queue or a team, call the function with no `latest` or `oldest` arguments, and then continue paging using the instructions below.

`latest` or `oldest` arguments refer to posts `publish_at` timestamp;

The `posts` array up to 100 posts between `latest` and `oldest`. If there were more than 100 posts between those two points, then `has_more` will be true.

If a post has the same `publish_at` as `latest` or `oldest` it will not be included in the list, unless `inclusive` is true. This allows a client to fetch all posts in a hole, by calling posts.list with `latest` set to the oldest post they have after the hole, and `oldest` to the latest post they have before the hole. If the response includes `has_more` then the client can make another call, using the `publish_at` value of the final posts as the `latest` param to get the next page of posts.

If there are more than 100 posts between the two timestamps then the posts returned are the ones closest to `latest`. In most cases an application will want the most recent posts and will page forward from there. If `oldest` is provided but not `latest` then the posts returned are those closest to `oldest`, allowing you to page forward through the list if desired.

### Expected scopes

`posts.read`

### Optional scopes

`posts`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error               | Description |
|---------------------|-------------|
| `access_denied`     | Access denied.
| `queue_not_found`   | Requested queue not found.
| `team_not_found`    | Requested team not found.
| `user_not_found`    | Authentication token user not found.
| `user_inactive`     | Authentication token is for a deleted user.
| `invalid_ts_latest` | Value passed for `latest` was invalid
| `invalid_ts_oldest` | Value passed for `oldest` was invalid
| `not_authed`        | No authentication token provided.
| `invalid_auth`      | Invalid authentication token.
| `missing_arg`       | The function was not passed all required argument(s).
| `internal_error`    | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `posts.read`
    + `queue`: 53ed091db33c30ef172172ef (string, optional) - List this queue scheduled posts, parameter `team` must be set if `queue` is not present.
    + `team`: 539c5b8bfb1d60bf42125524 (string, optional) - List this team scheduled posts, parameter `queue` must be set if `team` is not present.
    + `count`: 100 (number, optional) - Number of posts to return, between 1 and 1000.
        + Default: 100
    + `inclusive`: true (boolean, optional) - Include posts with latest or oldest timestamp in results.
        + Default: false
    + `latest`: 1515106000 (number, optional) - End of time range of posts to include in results.
        + Default: 30 days into the future
    + `oldest`: 0 (number, optional) - Start of time range of posts to include in results.
        + Default: 0

+ Response 200 (application/json)
    + Attributes (Posts Queue Response)

    + Body

            {
                "ok": true,
                "latest": 1514106000,
                "has_more": false,
                "posts": [
                    {
                        "post_id": "5995521a055975000ff26080",
                        "queue_id": "53ed091db33c30ef172172ef",
                        "team_id": "539c5b8bfb1d60bf42125524",
                        "created": 1502959448,
                        "created_by": {
                            "user_id": "53ed091db33c30ef172172ed",
                            "name": "Alois Bělaška",
                            "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                        },
                        "publish_at": 1514106000,
                        "html": "<p>Merry Christmas Everyone!</p>",
                        "state": "scheduled",
                        "attachments": [
                            {
                                "type": "link",
                                "description" : "Publish at the right time, reach more customers and increase engagement. The right cross-promotion, content management and scheduling solution for you. Ramp Up Sales!",
                                "title" : "Friends+Me - Share to ANYWHERE. Because sharing is caring.",
                                "url" : "https://friendsplus.me",
                                "picture": {
                                    "content_type" : "image/jpeg",
                                    "height" : 827,
                                    "width" : 1280,
                                    "url" : "https://lh3.googleusercontent.com/S3I41DrddGBWTqwgmrXv0-6b7zzeNBE73e3e_-HsMfK4Sk5NNjvaOQacCJeyUOuGXAfWeqi30Hnu1UgcI32adtIr2Ib8"
                                }
                            }
                        ]
                    }
                ]
            }

## posts.info [GET /posts.info{?access_token,post}]

Gets information about a post.

### Expected scopes

`posts.read`

### Optional scopes

`posts`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `access_denied`    | Access denied.
| `post_not_found`   | Requested post not found.
| `user_not_found`   | Authentication token user not found.
| `user_inactive`    | Authentication token is for a deleted user.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `posts.read`
    + `post`: 5995521a055975000ff26080 (string) - Post to get info on

+ Response 200 (application/json)
    + Attributes (Post Response)

    + Body

            {
                "ok": true,
                "post": {
                    "post_id": "5995521a055975000ff26080",
                    "queue_id": "53ed091db33c30ef172172ef",
                    "team_id": "539c5b8bfb1d60bf42125524",
                    "created": 1502959448,
                    "created_by": {
                        "user_id": "53ed091db33c30ef172172ed",
                        "name": "Alois Bělaška",
                        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                    },
                    "publish_at": 1514106000,
                    "html": "<p>Merry Christmas Everyone!</p>",
                    "state": "scheduled",
                    "attachments": [
                        {
                            "type": "link",
                            "description" : "Publish at the right time, reach more customers and increase engagement. The right cross-promotion, content management and scheduling solution for you. Ramp Up Sales!",
                            "title" : "Friends+Me - Share to ANYWHERE. Because sharing is caring.",
                            "url" : "https://friendsplus.me",
                            "picture": {
                                "content_type" : "image/jpeg",
                                "height" : 827,
                                "width" : 1280,
                                "url" : "https://lh3.googleusercontent.com/S3I41DrddGBWTqwgmrXv0-6b7zzeNBE73e3e_-HsMfK4Sk5NNjvaOQacCJeyUOuGXAfWeqi30Hnu1UgcI32adtIr2Ib8"
                            }
                        }
                    ]
                }
            }

## posts.preview [POST /posts.preview{?access_token}]

Create a post preview.

Html value of the request `html` property is checked.

Link, request `link` property, is checked, crawled and link preview is generated, if present within the request.

Request `pictures` property is checked and pictures crawled if present within the request.

### Expected scopes

`posts.write` `drafts.write`

### Optional scopes

`posts` `drafts`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `access_denied`    | Access denied.
| `user_not_found`   | Authentication token user not found.
| `user_inactive`    | Authentication token is for a deleted user.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string, required) - Authentication token. **Requires scope:** `posts.write`

+ Request
    + Attributes (Post Create Request)

    + Body

            {
                "html": "<p>Merry Christmas Everyone!</p>",
                "link": "https://friendsplus.me"
            }

+ Response 200 (application/json)
    + Attributes (Post Preview Response)

    + Body

            {
                "ok": true,
                "post": {
                    "html": "<p>Merry Christmas Everyone!</p>",
                    "attachments": [
                        {
                            "type": "link",
                            "description" : "Publish at the right time, reach more customers and increase engagement. The right cross-promotion, content management and scheduling solution for you. Ramp Up Sales!",
                            "title" : "Friends+Me - Share to ANYWHERE. Because sharing is caring.",
                            "url" : "https://friendsplus.me",
                            "picture": {
                                "content_type" : "image/jpeg",
                                "height" : 827,
                                "width" : 1280,
                                "url" : "https://lh3.googleusercontent.com/S3I41DrddGBWTqwgmrXv0-6b7zzeNBE73e3e_-HsMfK4Sk5NNjvaOQacCJeyUOuGXAfWeqi30Hnu1UgcI32adtIr2Ib8"
                            },
                            "pictures": [
                                {
                                    "content_type" : "image/jpeg",
                                    "height" : 827,
                                    "width" : 1280,
                                    "url" : "https://lh3.googleusercontent.com/S3I41DrddGBWTqwgmrXv0-6b7zzeNBE73e3e_-HsMfK4Sk5NNjvaOQacCJeyUOuGXAfWeqi30Hnu1UgcI32adtIr2Ib8"
                                }
                            ]
                        }
                    ]
                }
            }

## posts.create [POST /posts.create{?access_token,queue,schedule,publish_at,no_channeling}]

Create and schedule a post.

### Expected scopes

`posts.schedule`

### Optional scopes

`posts`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `access_denied`    | Access denied.
| `queue_not_found`  | Requested queue not found.
| `queue_blocked`    | Destination queue of this post is blocked.
| `queue_size_limit` | Queue size limit reached.
| `user_not_found`   | Authentication token user not found.
| `user_inactive`    | Authentication token is for a deleted user.
| `invalid_request`  | The function was passed invalid request or argument(s).
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string, required) - Authentication token. **Requires scope:** `posts.schedule`
    + `queue`: 53ed091db33c30ef172172ef (string, required) - Queue for which should be this post scheduled.
    + `schedule`: at (Post Schedule, optional) - Which type of scheduler should be used. The post can be published `now` or `at` time specified by `publish_at` parameter or added to the queue as a `first` or `last` to be published, meaning to the begin or the end of the queue.
        + Default: now
    + `publish_at`: 1514106000 (number, optional) - When should be the post published (unix timestamp).
    + `no_channeling`: true (boolean, optional) - Disable post channeling, post will not be cross-promoted to other queues. Used only for scheduling of Google+ posts at the moment.
        + Default: true

+ Request
    + Attributes (Post Create Request)

    + Body

            {
                "html": "<p>Merry Christmas Everyone!</p>",
                "link": "https://friendsplus.me"
            }

+ Response 200 (application/json)
    + Attributes (Post Create Response)

    + Body

            {
                "ok": true,
                "html_shortened": false,
                "post": {
                    "post_id": "5995521a055975000ff26080",
                    "queue_id": "53ed091db33c30ef172172ef",
                    "team_id": "539c5b8bfb1d60bf42125524",
                    "created": 1502959448,
                    "created_by": {
                        "user_id": "53ed091db33c30ef172172ed",
                        "name": "Alois Bělaška",
                        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                    },
                    "publish_at": 1514106000,
                    "html": "<p>Merry Christmas Everyone!</p>",
                    "state": "scheduled",
                    "attachments": [
                        {
                            "type": "link",
                            "description" : "Publish at the right time, reach more customers and increase engagement. The right cross-promotion, content management and scheduling solution for you. Ramp Up Sales!",
                            "title" : "Friends+Me - Share to ANYWHERE. Because sharing is caring.",
                            "url" : "https://friendsplus.me",
                            "picture": {
                                "content_type" : "image/jpeg",
                                "height" : 827,
                                "width" : 1280,
                                "url" : "https://lh3.googleusercontent.com/S3I41DrddGBWTqwgmrXv0-6b7zzeNBE73e3e_-HsMfK4Sk5NNjvaOQacCJeyUOuGXAfWeqi30Hnu1UgcI32adtIr2Ib8"
                            }
                        }

                    ]
                }
            }

## posts.update [POST /posts.update{?access_token,post}]

Update scheduled or failed posts.

It is possible to update only posts that are not in `published` state.

Attached link will be removed if the request property `link` is set to `null` and link will not be updated in any way if the `link` property is not present within the request.

And the same applies for the `pictures` property, attached pictures will be removed if the request `pictures` property is set to `null` and pictures will not be updated in any way if the `pictures` property is not present within the request.

### Expected scopes

`posts.write`

### Optional scopes

`posts`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error                | Description |
|----------------------|-------------|
| `access_denied`      | Access denied.
| `invalid_post_state` | Requested post is in invalid state, `published` in this case.
| `post_not_found`     | Requested post not found.
| `user_not_found`     | Authentication token user not found.
| `user_inactive`      | Authentication token is for a deleted user.
| `not_authed`         | No authentication token provided.
| `invalid_auth`       | Invalid authentication token.
| `missing_arg`        | The function was not passed all required argument(s).
| `internal_error`     | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `posts.write`
    + `post`: 5995521a055975000ff26080 (string) - Post to update

+ Request
    + Attributes (Post Update Request)

    + Body

            {
                "html": "<p>Merry Christmas Everyone And Happy New Year</p>"
            }

+ Response 200 (application/json)
    + Attributes (Post Update Response)

    + Body

            {
                "ok": true,
                "post": {
                    "post_id": "5995521a055975000ff26080",
                    "queue_id": "53ed091db33c30ef172172ef",
                    "team_id": "539c5b8bfb1d60bf42125524",
                    "created": 1502959448,
                    "created_by": {
                        "user_id": "53ed091db33c30ef172172ed",
                        "name": "Alois Bělaška",
                        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                    },
                    "publish_at": 1514106000,
                    "html": "<p>Merry Christmas Everyone And Happy New Year</p>",
                    "state": "scheduled",
                    "attachments": [
                        {
                            "type": "link",
                            "description" : "Publish at the right time, reach more customers and increase engagement. The right cross-promotion, content management and scheduling solution for you. Ramp Up Sales!",
                            "title" : "Friends+Me - Share to ANYWHERE. Because sharing is caring.",
                            "url" : "https://friendsplus.me",
                            "pictures": {
                                "content_type" : "image/jpeg",
                                "height" : 827,
                                "width" : 1280,
                                "url" : "https://lh3.googleusercontent.com/S3I41DrddGBWTqwgmrXv0-6b7zzeNBE73e3e_-HsMfK4Sk5NNjvaOQacCJeyUOuGXAfWeqi30Hnu1UgcI32adtIr2Ib8"
                            }
                        }

                    ]
                }
            }

## posts.reschedule [GET /posts.reschedule{?access_token,post,schedule,publish_at}]

Re-schedule a scheduled post.

It is possible to re-schedule only posts in `scheduled` state.

### Expected scopes

`posts.schedule`

### Optional scopes

`posts`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error                | Description |
|----------------------|-------------|
| `access_denied`      | Access denied.
| `invalid_post_state` | Requested post is in invalid state, not in `scheduled` in this case.
| `post_not_found`     | Requested post not found.
| `queue_blocked`      | Destination queue of this post is blocked.
| `user_not_found`     | Authentication token user not found.
| `user_inactive`      | Authentication token is for a deleted user.
| `invalid_request`    | The function was passed invalid request or argument(s).
| `not_authed`         | No authentication token provided.
| `invalid_auth`       | Invalid authentication token.
| `missing_arg`        | The function was not passed all required argument(s).
| `internal_error`     | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `posts.schedule`
    + `post`: 5995521a055975000ff26080 (string) - Post to re-schedule
    + `schedule`: at (Post Schedule, optional) - Which type of scheduler should be used. The post can be published `now` or `at` time specified by `publish_at` parameter or added to the queue as a `first` or `last` to be published, meaning to the begin or the end of the queue.
        + Default: now
    + `publish_at`: 1514106000 (number, optional) - When should be the post published (unix timestamp).

+ Response 200 (application/json)
    + Attributes (Post Reschedule Response)

    + Body

            {
                "ok": true,
                "post": {
                    "post_id": "5995521a055975000ff26080",
                    "queue_id": "53ed091db33c30ef172172ef",
                    "team_id": "539c5b8bfb1d60bf42125524",
                    "created": 1502959448,
                    "created_by": {
                        "user_id": "53ed091db33c30ef172172ed",
                        "name": "Alois Bělaška",
                        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                    },
                    "publish_at": 1514106000,
                    "html": "<p>Merry Christmas Everyone!</p>",
                    "state": "scheduled",
                    "attachments": [
                        {
                            "type": "link",
                            "description" : "Publish at the right time, reach more customers and increase engagement. The right cross-promotion, content management and scheduling solution for you. Ramp Up Sales!",
                            "title" : "Friends+Me - Share to ANYWHERE. Because sharing is caring.",
                            "url" : "https://friendsplus.me",
                            "pictures": {
                                "content_type" : "image/jpeg",
                                "height" : 827,
                                "width" : 1280,
                                "url" : "https://lh3.googleusercontent.com/S3I41DrddGBWTqwgmrXv0-6b7zzeNBE73e3e_-HsMfK4Sk5NNjvaOQacCJeyUOuGXAfWeqi30Hnu1UgcI32adtIr2Ib8"
                            }
                        }

                    ]
                }
            }

## posts.delete [GET /posts.delete{?access_token,post}]

Delete a post no matter the posts state.

Property `deleted` will be false and `ok` will be true if the post is not found.

### Expected scopes

`posts.write`

### Optional scopes

`posts`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `access_denied`    | Access denied.
| `post_not_found`   | Requested post not found.
| `user_not_found`   | Authentication token user not found.
| `user_inactive`    | Authentication token is for a deleted user.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `posts.write`
    + `post`: 5995521a055975000ff26080 (string) - Post to delete

+ Response 200 (application/json)
    + Attributes (Post Delete Response)

    + Body

            {
                "ok": true,
                "deleted": true
            }

# Group drafts

## drafts.list [GET /drafts.list{?access_token,team,count,inclusive,latest,oldest}]

Fetches list of drafts.

This function returns a portion of drafts. To read the entire list, call the function with no `latest` or `oldest` arguments, and then continue paging using the instructions below.

`latest` or `oldest` arguments refer to drafts `modified` timestamp;

The `drafts` array up to 100 drafts between `latest` and `oldest`. If there were more than 100 drafts between those two points, then `has_more` will be true.

If a draft has the same `modified` as `latest` or `oldest` it will not be included in the list, unless `inclusive` is true. This allows a client to fetch all drafts in a hole, by calling drafts.list with `latest` set to the oldest draft they have after the hole, and `oldest` to the latest draft they have before the hole. If the response includes `has_more` then the client can make another call, using the `publish_at` value of the final drafts as the `latest` param to get the next page of drafts.

If there are more than 100 drafts between the two timestamps then the drafts returned are the ones closest to `latest`. In most cases an application will want the most recent drafts and will page forward from there. If `oldest` is provided but not `latest` then the drafts returned are those closest to `oldest`, allowing you to page forward through the queue if desired.

### Expected scopes

`drafts.read`

### Optional scopes

`drafts`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error               | Description |
|---------------------|-------------|
| `access_denied`     | Access denied.
| `user_not_found`    | Authentication token user not found.
| `user_inactive`     | Authentication token is for a deleted user.
| `team_not_found`    | Requested team not found.
| `invalid_ts_latest` | Value passed for `latest` was invalid
| `invalid_ts_oldest` | Value passed for `oldest` was invalid
| `not_authed`        | No authentication token provided.
| `invalid_auth`      | Invalid authentication token.
| `missing_arg`       | The function was not passed all required argument(s).
| `internal_error`    | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `drafts.read`
    + `team`: 539c5b8bfb1d60bf42125524 (string, required) - List this team drafts.
    + `count`: 100 (number, optional) - Number of drafts to return, between 1 and 1000.
        + Default: 100
    + `inclusive`: true (boolean, optional) - Include drafts with latest or oldest timestamp in results.
        + Default: false
    + `latest`: 1515106000 (number, optional) - End of time range of drafts to include in results.
        + Default: Now
    + `oldest`: 0 (number, optional) - Start of time range of drafts to include in results.
        + Default: 0

+ Response 200 (application/json)
    + Attributes (Drafts Response)

    + Body

            {
                "ok": true,
                "latest": 1502969448,
                "has_more": false,
                "drafts": [
                    {
                        "draft_id": "5995531a055975000ff260c0",
                        "created": 1502959448,
                        "created_by": {
                            "user_id": "53ed091db33c30ef172172ed",
                            "name": "Alois Bělaška",
                            "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                        },
                        "modified": 1502969448,
                        "modified_by": {
                            "user_id": "53ed091db33c30ef172172ed",
                            "name": "Alois Bělaška",
                            "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                        },
                        "html": "<p>Merry Christmas Everyone!</p>",
                        "attachments": [
                            {
                                "type": "link",
                                "description" : "Publish at the right time, reach more customers and increase engagement. The right cross-promotion, content management and scheduling solution for you. Ramp Up Sales!",
                                "title" : "Friends+Me - Share to ANYWHERE. Because sharing is caring.",
                                "url" : "https://friendsplus.me",
                                "picture": {
                                    "content_type" : "image/jpeg",
                                    "height" : 827,
                                    "width" : 1280,
                                    "url" : "https://lh3.googleusercontent.com/S3I41DrddGBWTqwgmrXv0-6b7zzeNBE73e3e_-HsMfK4Sk5NNjvaOQacCJeyUOuGXAfWeqi30Hnu1UgcI32adtIr2Ib8"
                                }
                            }

                        ]
                    }
                ]
            }

## drafts.info [GET /drafts.info{?access_token,draft}]

Gets information about a draft.

### Expected scopes

`drafts.read`

### Optional scopes

`drafts`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `access_denied`    | Access denied.
| `draft_not_found`  | Requested draft not found.
| `user_not_found`   | Authentication token user not found.
| `user_inactive`    | Authentication token is for a deleted user.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `drafts.read`
    + `draft`: 5995531a055975000ff260c0 (string) - Draft to get info on

+ Response 200 (application/json)
    + Attributes (Draft Response)

    + Body

            {
                "ok": true,
                "draft": {
                    "draft_id": "5995531a055975000ff260c0",
                    "created": 1502959448,
                    "created_by": {
                        "user_id": "53ed091db33c30ef172172ed",
                        "name": "Alois Bělaška",
                        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                    },
                    "modified": 1502969448,
                    "modified_by": {
                        "user_id": "53ed091db33c30ef172172ed",
                        "name": "Alois Bělaška",
                        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                    },
                    "html": "<p>Merry Christmas Everyone!</p>",
                    "attachments": [
                        {
                            "type": "link",
                            "description" : "Publish at the right time, reach more customers and increase engagement. The right cross-promotion, content management and scheduling solution for you. Ramp Up Sales!",
                            "title" : "Friends+Me - Share to ANYWHERE. Because sharing is caring.",
                            "url" : "https://friendsplus.me",
                            "picture": {
                                "content_type" : "image/jpeg",
                                "height" : 827,
                                "width" : 1280,
                                "url" : "https://lh3.googleusercontent.com/S3I41DrddGBWTqwgmrXv0-6b7zzeNBE73e3e_-HsMfK4Sk5NNjvaOQacCJeyUOuGXAfWeqi30Hnu1UgcI32adtIr2Ib8"
                            }
                        }
                    ]
                }
            }

## drafts.create [POST /drafts.create{?access_token,team}]

Create a draft.

### Expected scopes

`drafts.write`

### Optional scopes

`drafts`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `access_denied`    | Access denied.
| `team_not_found`   | Requested team not found.
| `user_not_found`   | Authentication token user not found.
| `user_inactive`    | Authentication token is for a deleted user.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `drafts.write`
    + `team`: 539c5b8bfb1d60bf42125524 (string, required) - Create a draft for this team.

+ Request
    + Attributes (Draft Create Request)

    + Body

            {
                "html": "<p>Merry Christmas Everyone!</p>",
                "link": "https://friendsplus.me"
            }

+ Response 200 (application/json)
    + Attributes (Draft Create Response)

    + Body

            {
                "ok": true,
                "draft": {
                    "draft_id": "5995531a055975000ff260c0",
                    "created": 1502959448,
                    "created_by": {
                        "user_id": "53ed091db33c30ef172172ed",
                        "name": "Alois Bělaška",
                        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                    },
                    "modified": 1502969448,
                    "modified_by": {
                        "user_id": "53ed091db33c30ef172172ed",
                        "name": "Alois Bělaška",
                        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                    },
                    "html": "<p>Merry Christmas Everyone!</p>",
                    "attachments": [
                        {
                            "type": "link",
                            "description" : "Publish at the right time, reach more customers and increase engagement. The right cross-promotion, content management and scheduling solution for you. Ramp Up Sales!",
                            "title" : "Friends+Me - Share to ANYWHERE. Because sharing is caring.",
                            "url" : "https://friendsplus.me",
                            "picture": {
                                "content_type" : "image/jpeg",
                                "height" : 827,
                                "width" : 1280,
                                "url" : "https://lh3.googleusercontent.com/S3I41DrddGBWTqwgmrXv0-6b7zzeNBE73e3e_-HsMfK4Sk5NNjvaOQacCJeyUOuGXAfWeqi30Hnu1UgcI32adtIr2Ib8"
                            }
                        }

                    ]
                }
            }

## drafts.update [POST /drafts.update{?access_token,draft}]

Update a draft.

Attached link will be removed if the request property `link` is set to `null` and link will not be updated in any way if the `link` property is not present within the request.

And the same applies for the `pictures` property, attached pictures will be removed if the request `pictures` property is set to `null` and pictures will not be updated in any way if the `pictures` property is not present within the request.

### Expected scopes

`drafts.write`

### Optional scopes

`drafts`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `access_denied`    | Access denied.
| `draft_not_found`  | Requested draft not found.
| `user_not_found`   | Authentication token user not found.
| `user_inactive`    | Authentication token is for a deleted user.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `drafts.write`
    + `draft`: 5995531a055975000ff260c0 (string) - Draft to update

+ Request
    + Attributes (Draft Update Request)

    + Body

            {
                "html": "<p>Merry Christmas Everyone And Happy New Year</p>"
            }

+ Response 200 (application/json)
    + Attributes (Draft Update Response)

    + Body

            {
                "ok": true,
                "draft": {
                    "draft_id": "5995531a055975000ff260c0",
                    "created": 1502959448,
                    "created_by": {
                        "user_id": "53ed091db33c30ef172172ed",
                        "name": "Alois Bělaška",
                        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                    },
                    "modified": 1502969448,
                    "modified_by": {
                        "user_id": "53ed091db33c30ef172172ed",
                        "name": "Alois Bělaška",
                        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                    },
                    "html": "<p>Merry Christmas Everyone And Happy New Year</p>",
                    "attachments": [
                        {
                            "type": "link",
                            "description" : "Publish at the right time, reach more customers and increase engagement. The right cross-promotion, content management and scheduling solution for you. Ramp Up Sales!",
                            "title" : "Friends+Me - Share to ANYWHERE. Because sharing is caring.",
                            "url" : "https://friendsplus.me",
                            "picture": {
                                "content_type" : "image/jpeg",
                                "height" : 827,
                                "width" : 1280,
                                "url" : "https://lh3.googleusercontent.com/S3I41DrddGBWTqwgmrXv0-6b7zzeNBE73e3e_-HsMfK4Sk5NNjvaOQacCJeyUOuGXAfWeqi30Hnu1UgcI32adtIr2Ib8"
                            }
                        }
                    ]
                }
            }

## drafts.schedule [GET /drafts.schedule{?access_token,draft,queue,schedule,publish_at,no_channeling}]

Schedule a draft.

Original draft is deleted after new post is created and scheduled.

### Expected scopes

`posts.schedule`

### Optional scopes

`posts`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `access_denied`    | Access denied.
| `draft_not_found`  | Requested draft not found.
| `queue_not_found`  | Requested queue not found.
| `queue_blocked`    | Destination queue of this post is blocked.
| `queue_size_limit` | Queue size limit reached.
| `user_not_found`   | Authentication token user not found.
| `user_inactive`    | Authentication token is for a deleted user.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `posts.schedule`
    + `draft`: 5995531a055975000ff260c0 (string, required) - Draft to schedule
    + `queue`: 53ed091db33c30ef172172ef (string, required) - Queue for which should be this draft scheduled.
    + `schedule`: at (Post Schedule, optional) - Which type of scheduler should be used. The draft can be published `now` or `at` time specified by `publish_at` parameter or added to the queue as a `first` or `last` to be published, meaning to the begin or the end of the queue.
    + `publish_at`: 1514106000 (number, optional) - When should be the draft published (unix timestamp).
    + `no_channeling`: true (boolean, optional) - Disable post channeling, post will not be cross-promoted to other queues. Used only for scheduling of Google+ posts at the moment.
        + Default: true

+ Response 200 (application/json)
    + Attributes (Draft Schedule Response)

    + Body

            {
                "ok": true,
                "html_shortened": false,
                "post": {
                    "post_id": "5995521a055975000ff26080",
                    "queue_id": "53ed091db33c30ef172172ef",
                    "team_id": "539c5b8bfb1d60bf42125524",
                    "created": 1502959448,
                    "created_by": {
                        "user_id": "53ed091db33c30ef172172ed",
                        "name": "Alois Bělaška",
                        "avatar": "https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg"
                    },
                    "publish_at": 1514106000,
                    "html": "<p>Merry Christmas Everyone!</p>",
                    "state": "scheduled",
                    "attachments": [
                        {
                            "type": "link",
                            "description" : "Publish at the right time, reach more customers and increase engagement. The right cross-promotion, content management and scheduling solution for you. Ramp Up Sales!",
                            "title" : "Friends+Me - Share to ANYWHERE. Because sharing is caring.",
                            "url" : "https://friendsplus.me",
                            "picture": {
                                "content_type" : "image/jpeg",
                                "height" : 827,
                                "width" : 1280,
                                "url" : "https://lh3.googleusercontent.com/S3I41DrddGBWTqwgmrXv0-6b7zzeNBE73e3e_-HsMfK4Sk5NNjvaOQacCJeyUOuGXAfWeqi30Hnu1UgcI32adtIr2Ib8"
                            }
                        }

                    ]
                }
            }

## drafts.delete [GET /drafts.delete{?access_token,draft}]

Delete a draft.

Property `deleted` will be false and `ok` will be true if the draft is not found.

### Expected scopes

`drafts.write`

### Optional scopes

`drafts`

### Errors

This table lists the expected errors that this function could return. However, other errors can be returned in the case where the service is down or other unexpected factors affect processing. Callers should always check the value of the `ok` property in the response.

| Error              | Description |
|--------------------|-------------|
| `access_denied`    | Access denied.
| `draft_not_found`  | Requested draft not found.
| `user_not_found`   | Authentication token user not found.
| `user_inactive`    | Authentication token is for a deleted user.
| `not_authed`       | No authentication token provided.
| `invalid_auth`     | Invalid authentication token.
| `missing_arg`      | The function was not passed all required argument(s).
| `internal_error`   | Internal error.

+ Parameters
    + `access_token`: `ACCESS_TOKEN` (string) - Authentication token. **Requires scope:** `drafts.write`
    + `draft`: 5995531a055975000ff260c0 (string) - Draft to delete

+ Response 200 (application/json)
    + Attributes (Draft Delete Response)

    + Body

            {
                "ok": true,
                "deleted": true
            }

# Data Structures

## URL (string)

## OAuth Grant Type (enum)

+ `authorization_code`
+ `refresh_token`

## User Identity (object)

+ `user_id` (string, required) - User identificator.
+ `name` (string, required) - User name.

## User Identity Email (object)

+ `email`: `alois@domain.com` (string, optional) - User email. Requires scope: `identity.email`.

## User Identity Avatar (object)

+ `avatar`: `https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg` (URL, optional) - User avatar. Requires scope: `identity.avatar`.

## User Identity Full (User Identity)

+ Include (User Identity Email)
+ Include (User Identity Avatar)

## User Reference (User Identity)

+ `avatar`: `https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50/photo.jpg` (URL, optional) - User avatar.

## User Basic (User Reference)

+ `created`: 1502951493 (number, required) - (unix timestamp).

## User Full (User Basic)

+ `email`: `alois@domain.com` (string, optional) - User email. Requires scope: `users.read.email`.

## Team Member Role (enum)

+ `owner` - Owner of the team.
+ `tmanager` - Team manager, manages entire team including all queues.
+ `qmanager` - Queue manager, manages only selected queues.
+ `contributor` - Contributor, can only create new, edit and delete their own drafts and is not allowed to schedule posts.

## Team Member (User Reference)

+ `role` (Team Member Role, required) - Member role.

## Team (object)

+ `team_id` (string, required) - Team identificator.
+ `created` (number, required) - (unix timestamp).
+ `name` (string, required) - Team name.
+ `members` (array[Team Member], optional) - List of team members.
+ `queues` (array[Queue], optional) - List of queues.

## Service Type (enum)

+ `facebook`
+ `google`
+ `twitter`
+ `linkedin`
+ `tumblr`
+ `pinterest`

## Service Category (enum)

+ `profile`
+ `page`
+ `blog`
+ `group`
+ `board`
+ `community`
+ `collection`

## Service (object)

+ `type` (Service Type, required) - Queue service name.
+ `category` (Service Category, required) - Queue service type.
+ `id` (string, required) - Queue service user identification.
+ `url` (URL, optional) - Queue service url.

## Queue Schedule Days (enum)

+ mon - Monday
+ tue - Tuesday
+ wed - Wednesday
+ thu - Thursday
+ fri - Friday
+ sat - Saturday
+ sun - Sunday

## Queue Schedule (object)

+ `days`: mon, tue (array[Queue Schedule Days], required) - Set of weekdays for which this schedule applies.
+ `times`: 10:35, 12:45 (array[string], required) - Set of times in 24-hour format, ex. 11:30, 20:25, ...

## Queue Scheduling (object)

+ `timezone`: Europe/Prague (string, required) - Time zone name. [List of tz database time zones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
+ `schedules` (array[Queue Schedule], required) - Set of schedules.

## Queue State (enum)

+ `enabled` - Queue is enabled.
+ `paused` - Queue is paused, no post will be published until stat is changed to enabled.
+ `blocked` - Queue is blocked, upgrade to premium is required.
+ `reconnect_required` - Queue is paused until reconnected.

## Queue (object)

+ `queue_id` (string, required) - Queue identificator.
+ `created` (number, required) - Date and time of creation (Unix timestamp).
+ `created_by` (User Reference, required) - User who created the post.
+ `reconnected` (number, optional) - Date and time of last reconnect (Unix timestamp).
+ `name` (string, required) - Queue name.
+ `state` (Queue State, required) - Queue state.
+ `picture` (URL, required) - Queue picture url.
+ `service` (Service, required) - Queue service name.
+ `scheduling` (Queue Scheduling, required) - Info about queue scheduling (time zone, schedules).
+ `size` (number, optional) - Queue size, number of posts scheduled to be published.

## Post State (enum)

+ `scheduled` - Post is scheduled.
+ `paused` - Post is paused and will not be published until state of destination queue changes.
+ `publishing` - Post is being published.
+ `published` - Post successfully published.
+ `failed` - Post failed to be published.

## Post Schedule (enum)

+ `at` - Publish at specified date and time.
+ `now` - Publish immediatelly.
+ `first` - Add to the top of the queue to be published first.
+ `last` - Add to the end of the queue to be published as the last one.

## Attachment Type (enum)

+ `link` - Link attachment.
+ `picture` - Picture attachment.

## Attachment (object)

+ `type` (Attachment Type, required) - Type of attachment.

## Picture (object)

+ `url` (URL, required) - Picture url.
+ `content_type` (string, optional) - Picture [MIME type](https://en.wikipedia.org/wiki/Media_type)
+ `width` (number, optional) - Width (pixels)
+ `height` (number, optional) - Height (pixels)

## Picture Attachment (Attachment)

+ Include (Picture)

## Link Attachment (Attachment)

+ `url` (URL, required) - Link url.
+ `title` (string, required) - Link preview title.
+ `description` (string, required) - Link preview short description.
+ `picture` (Picture, optional) - Link preview picture.
+ `pictures` (array[Picture], optional) - List of pictures crawled from the link url, available for link preview. This property is present only in post preview.

## Post Exchange (object)

+ `html` (string, required) - Post in html format, allowed tags p,b,i,s.
+ `link` (URL, optional) - Url of link to attach to the post. Property `pictures` will be ignored if `link` is set.
+ `picture` (URL, optional) - Url of picture that should be used for link preview. Property `picture` should be set only if `link` property is set too. WARNING, the picture must be listed in post preview returned by `posts.preview` function, some other picture will be used otherwise.
+ `pictures` (array[URL], optional) - Array of picture urls to attach to the post. Property `link` will be ignored if `pictures` is set.

## Post Content (object)

+ `html` (string, required) - Post in html format, allowed tags p,b,i,s.
+ `attachments` (array[Link Attachment, Picture Attachment], optional) - List of attachments (picture, link, ...).

## Post (Post Content)

+ `post_id` (string, required) - Post identificator.
+ `queue_id` (string, required) - Destination queue for which was the post scheduled.
+ `team_id` (string, required) - Team the destination queue is assigned to.
+ `created_by` (User Reference, required) - User who created the post.
+ `modified_by` (User Reference, optional) - User who last modified the post.
+ `created` (number, required) - When was the post created (unix timestamp).
+ `modified` (number, optional) - When was the post last modified (unix timestamp).
+ `publish_at` (number, required) - When should be the post published (unix timestamp).
+ `completed_at` (number, optional) - When was the post completed [published or abandoned] (unix timestamp).
+ `state` (Post State, required) - State of post.
+ `service` (Service, required) - Queue service name.
+ `url` (URL, optional) - Url of a successfully published post.

## Draft Exchange (object)

+ `html` (string, required) - Post in html format, allowed tags p,b,i,s.
+ `link` (URL, optional) - Url of link to attach to the post. Property `pictures` will be ignored if `link` is set.
+ `picture` (URL, optional) - Url of picture that should be used for link preview. Property `picture` should be set only if `link` property is set too. WARNING, the picture must be listed in post preview returned by `posts.preview` function, some other picture will be used otherwise.
+ `pictures` (array[URL], optional) - Array of picture urls to attach to the post. Property `link` will be ignored if `pictures` is set.

## Draft Content (object)

+ `html` (string, required) - Post in html format, allowed tags p,b,i,s.
+ `attachments` (array[Link Attachment, Picture Attachment], optional) - List of attachments (picture, link, ...).

## Draft (Draft Content)

+ `draft_id` (string, required) - Draft identificator.
+ `created_by` (User Reference, required) - User who created the draft.
+ `modified_by` (User Reference, optional) - User who last modified the draft.
+ `created` (number, required) - When was the draft created (unix timestamp).
+ `modified` (number, optional) - When was the draft last modified (unix timestamp).

## Response (object)

+ `ok` (boolean, required) - Indicates success or failure.

## Teams Response (Response)

+ `teams` (array[Team], required) - List of teams.

## Team Response (Response)

+ `team` (Team, optional) - Requested team info.

## Queues Response (Response)

+ `queues` (array[Queue], required) - List of queues.

## Queue Response (Response)

+ `queue` (Queue, optional) - Requested queue info.

## Deauthorize Response (Response)

+ `deauthorized` (boolean, required) - Whether the deautorization was successfull.

## Refresh Token Revoke Response (Response)

+ `revoked` (boolean, required) - Whether the revoke was successfull.

## Refresh Token Grant Response (Response)

+ `access_token`: "eyJ...MoQ" (string, required) - Newly generated access token.
+ `expires_in`: 86400 (number, required) - Access token time to live in seconds.
+ `scope`: `admin offline` (string, required) - Set of granted scopes.
+ `token_type`: Bearer (string, required) - Type of access token.

## Authorization Code Grant Response (Response)

+ `access_token`: `eyJ...MoQ` (string, required) - Generated access token.
+ `refresh_token`: `GEbRxBN...edjnXbL` (string, optional) - Generated refresh token.
+ `expires_in`: 86400 (number, required) - Access token time to live in seconds.
+ `token_type`: Bearer (string, required) - Type of access token.

## User Identity Response (Response)

+ `user` (User Identity Full, required) - Requested user identity.

## User Info Response (Response)

+ `user` (User Full, required) - Requested user info.

## Posts Timeline Response (Response)

+ `posts` (array[Post], required) - List of posts.
+ `latest`: 1482570010 (number, optional) - `completed_at` value of the latest post in the fetched list.
+ `has_more`: false (boolean, required) - `has_more` will be true if there is still more posts to fetch.

## Posts Queue Response (Response)

+ `posts` (array[Post], required) - List of posts.
+ `latest`: 1482570010 (number, optional) - `publish_at` value of the latest post in the fetched list.
+ `has_more`: false (boolean, required) - `has_more` will be true if there is still more posts to fetch.

## Post Response (Response)

+ `post` (Post, optional) - Requested post info.

## Post Delete Response (Response)

+ `deleted`: true (boolean, required) - Whether the post was deleted, false if the post was not found.

## Post Create Request (object)

+ Include (Post Exchange)

## Post Create Response (Response)

+ `html_shortened` (boolean, required) - Whether the html (message) was shortened because of the message limit enforced by the destination service (Facebook, Twitter, ...).
+ `post` (Post, required) - New post info.

## Post Update Request (object)

+ Include (Post Exchange)

## Post Update Response (Response)

+ `post` (Post, required) - Updated post info.

## Post Reschedule Response (Response)

+ `post` (Post, required) - Re-scheduled post info.

## Post Preview Response (Response)

+ `post` (Post Content, required) - Post preview.

## Queue Update Scheduling Request

+ Include (Queue Scheduling)

## Drafts Response (Response)

+ `drafts` (array[Draft], required) - List of drafts.
+ `latest`: 1482570010 (number, optional) - `modified` value of the latest draft in the fetched list.
+ `has_more`: false (boolean, required) - `has_more` will be true if there is still more drafts to fetch.

## Draft Response (Response)

+ `draft` (Draft, optional) - Requested draft info.

## Draft Preview Response (Response)

+ `draft` (Draft Content, required) - Draft preview.

## Draft Delete Response (Response)

+ `deleted`: true (boolean, required) - Whether the draft was deleted, false if the draft was not found.

## Draft Schedule Response (Response)

+ `post` (Post, required) - Scheduled post info.

## Draft Create Request (object)

+ Include (Draft Exchange)

## Draft Create Response (Response)

+ `draft` (Draft, required) - New draft info.

## Draft Update Request (object)

+ Include (Draft Exchange)

## Draft Update Response (Response)

+ `draft` (Draft, required) - Updated draft info.
