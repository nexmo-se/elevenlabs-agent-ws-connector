# Vonage API - ElevenLabs Conversational AI Connector

You may use this Connector server application to connect voice calls managed by a Vonage Voice API application or a Vonage Video API client to ElevenLabs' Speech-to-Speech Conversational AI Agents.

Voice calls may be inbound/outbound from/to PSTN (cell phones, landline phones, fixed phones), SIP connections/trunks using [Standard SIP trunks](https://developer.vonage.com/en/sip/overview) or [Programmable SIP Trunks](https://developer.vonage.com/en/voice/voice-api/concepts/programmable-sip), [Audio WebRTC](https://developer.vonage.com/en/vonage-client-sdk/overview) clients (iOS/Android/JavaScript), [Video WebRTC](https://tokbox.com/developer/sdks) clients (iOS/Android/React Native/JavaScript/Windows/macOS/Linux).

## About this Connector code

See the diagram in this repository for an overview of the solution architecture.

This connector makes use of the [WebSockets feature](https://developer.vonage.com/en/voice/voice-api/concepts/websockets) of Vonage Voice API.</br>
When a voice call is established, the peer Voice API application triggers a WebSocket connection to this Connector application then streams audio in both directions between the voice call and ElevenLabs Conversational AI. 

You may deploy this [sample Voice API application](https://github.com/nexmo-se/voice-to-ai-engines) to use this Connector code to bi-directionally stream audio between voice calls and ElevenLabs' Speech-to-Speech Conversational AI Agents with LLMs.

## Set up

### Get your information from ElevenLabs

Sign up with or log in to [ElevenLabs](https://elevenlabs.io/app).</br>

Create or use an existing ElevenLabs API key (under My Account / API Keys),</br>
take note of it (as it will be needed as **`ELEVENLABS_API_KEY`** in the next section).</br>

Go to Conversational AI / Agents,</br>
select an existing agent or create a new agent,</br>
go to ... / Copy Agent ID (as it will be needed as **`ELEVENLABS_AGENT_ID`** in the next section).

### Local deployment

#### Ngrok

For a `local deployment`, you may use ngrok (an Internet tunneling service) for both this Connector application and the [Voice API application](https://github.com/nexmo-se/voice-to-ai-engines) with [multiple ngrok endpoints](https://ngrok.com/docs/agent/config/v3/#multiple-endpoints).

To do that, [install ngrok](https://ngrok.com/downloads).</br>
Log in or sign up with [ngrok](https://ngrok.com/), from the ngrok web UI menu, follow the **Setup and Installation** guide.

Set up two domains, one to forward to the local port 6000 (as this Connector application will be listening on port 6000), the other one to the local port 8000 for the [Voice API application](https://github.com/nexmo-se/voice-to-ai-engines).

Start ngrok to start both tunnels that forward to local ports 6000 and 8000,</br>
please take note of the ngrok **Enpoint URL** that forwards to local port 6000 as it will be needed when setting the [Voice API application](https://github.com/nexmo-se/voice-to-ai-engines),
that URL looks like:</br>
`xxxxxxxx.ngrok.xxx` (for ngrok), `myserver.mycompany.com:32000`  (as **`PROCESSOR_SERVER`** in the .env file of the [Voice API application](https://github.com/nexmo-se/voice-to-ai-engines)),</br>
no `port` is necessary with ngrok as public host name,</br>
that host name to specify must not have leading protocol text such as https://, wss://, nor trailing /.

Copy the `.env.example` file over to a new file called `.env`:
```bash
cp .env.example .env 
```

Update the argument of the parameter **`ELEVENLABS_API_KEY`** in .env file<br>

Update the arguments of the following parameters as needed per your use case:</br>
**`ELEVENLABS_API_KEY`**</br>
**`ELEVENLABS_AGENT_ID`**</br>

You may update the argument of the parameter:</br>
**`ELEVENLABS_VOICE_ID`** (see this [article](https://help.elevenlabs.io/hc/en-us/articles/14599760033937-How-do-I-find-my-voices-ID-of-my-voices-via-the-website-and-through-the-API))</br>

#### Node.js - This Connector application

Have Node.js installed on your system, this application has been tested with Node.js version 18.19<br>

Install node modules with the command:<br>
 ```bash
npm install
```

Launch the application:<br>
```bash
node elevenlabs-agent-ws-connector.cjs
```

Default local (not public!) of this Connector server application server `port` is: 6000.

#### Sample Voice API application

Set up the sample peer Voice API application per the instructions in its [repository](https://github.com/nexmo-se/voice-to-ai-engines).

Call in to the phone number as set up in that application to interact with the ElevenLabs Speech-to-Speech Conversational AI Agent.

Or using the instructions in the [sample peer Voice API application](https://github.com/nexmo-se/voice-to-ai-engines), you may initiate an outbound call and interact with the ElevenLabs Speech-to-Speech Conversational AI Agent.

#### Your existing Voice API application

Instead of using the [sample peer Voice API application](https://github.com/nexmo-se/voice-to-ai-engines), you may instead update and use your existing Voice API application to connect voice calls via [WebSockets](https://developer.vonage.com/en/voice/voice-api/concepts/websockets) to this Connector Application and interact with the ElevenLabs Speech-to-Speech Conversational AI Agent.

### Cloud deployment

Instructions on how to deploy both this Connector application as well as the peer Voice API application to [Vonage Cloud Runtime](https://developer.vonage.com/en/vonage-cloud-runtime/getting-started/technical-details) serverless infrastructure will be posted here soon.

## Additional resources

If you have questions, join our [Community Slack](https://developer.vonage.com/community/slack) or message us on [X](https://twitter.com/VonageDev?adobe_mc=MCMID%3D61117212728348884173699984659581708157%7CMCORGID%3DA8833BC75245AF9E0A490D4D%2540AdobeOrg%7CTS%3D1740259490).
