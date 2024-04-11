import * as jose from 'jose';

/* body for testing
{
  "registration": "",
  "action": "relay_message",
  "message": "this is a test message, ya hear?"
}
*/

/*
  Send a message to an FCM registration
  - create an access token (JWT)
  - call the FCM v1 api endpoint

  TODO: using topic registrations or otherwise facilitating seamless messaging
  TODO: cache or otherwise store the access token instead of getting a new one every time
  */


const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://puff.pages.dev',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

function cors(statusCode) {
  return {
    headers: corsHeaders,
    status: statusCode
  };
}


export default {
  async fetch(request, env, ctx) {

    const allowedOrigins = ['https://puff.pages.dev'];
    const origin = request.headers.get('Origin');
    console.log('Origin:', origin);
    if (!origin || !allowedOrigins.includes(origin)) {
      return new Response('Forbidden', cors(403));
    }
    
    const config = JSON.parse(env.PUFF_FCM_CONFIG);

    let body;
    try {
      body = await request.json();
    } catch(err) {
      console.error(err);
    }

    if (!body) {
      return new Response("Body must be json.", cors(400));
    }

    const accessToken = await getAccessToken(config);
    if (!body.registration) {
      return new Response("Body must include a registration token.", cors(400));
    }

    switch(body.action) {
      case "relay_message":
        if (!body.message || body.message === null) {
          return new Response("Body did not include a message.", cors(400));
        }
        let res = await sendMessage(body.registration, body.message, accessToken);
        console.log('sendMessage result:', res);
        return new Response(res + "", cors(200));

      case "store_registration":
        // TODO: secure username-token storage
        // the problem is you could have multiple registration tokens
        // i visited in chrome and safari and got two different ones
        // do we keep a list of registration tokens for the given username?
        // there are 'device groups' https://firebase.google.com/docs/cloud-messaging/js/device-group
        // seems worth a try. any time a user gets a new registration token, we add it to their device group
        

        await env.NAMESPACE.put("cat", body.registration);
        return new Response("donezo", cors(200));

      default:
        return new Response("No valid action in body.", cors(400));
    }
  }
}

// mint our own JWT access token using the json key from FCM
// use jose lib for help with the JWT signature
async function getAccessToken(config) {
  const issuer = config.client_email;
  const private_key =  config.private_key;
  
  const payload = {
      iss: issuer,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://www.googleapis.com/oauth2/v4/token',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
      iat: Math.floor(Date.now() / 1000),
  };
  
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' }) // Specify the signing algorithm
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(await jose.importPKCS8(private_key, 'RS256')); // Sign the JWT with the private key
  
  const response = await fetch('https://www.googleapis.com/oauth2/v4/token', {
    method: 'POST',
    // for some reason only urlencoded works headers: { 'Authorization': `Bearer ${jwt}` }
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(jwt)}`,
});
  
  if (!response.ok) {
      console.log('FAILED TO RETRIEVE TOKEN:', response);
      throw new Error(`Failed to retrieve token: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

async function sendMessage(destination, message, accessToken) {
  var headers = new Headers();
  headers.append("Authorization", `Bearer ${accessToken}`);
  headers.append("Content-Type", "application/json");
  
  var raw = JSON.stringify({
    message: {
      token: destination,
      data: {
        message: message
      }
      // note - the below is also valid in lieu of "data" field
      // notification: {
      //   title: "FCM Message",
      //   body: JSON.stringify({
      //     message: message
      //   })
      // }
    }
  });
  
  var requestOptions = {
    method: 'POST',
    headers: headers,
    body: raw,
    redirect: 'follow'
  };
  
  const result = await fetch("https://fcm.googleapis.com/v1/projects/puff-push/messages:send", requestOptions)
    .then(response => response.text())
    .catch(error => console.log('error', error));

  return result;
}