'use strict'

//-------------

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser')
const webSocket = require('ws');
const app = express();
require('express-ws')(app);

app.use(bodyParser.json());

const axios = require('axios');

const fsp = require('fs').promises;
const moment = require('moment');

// const axios = require('axios');

//---- CORS policy - Update this section as needed ----

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "OPTIONS,GET,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
  next();
});

//--- Record all audio ? --

let recordAllAudio = false;
if (process.env.RECORD_ALL_AUDIO == "true") { recordAllAudio = true };

//--- Streaming timer - Audio packets to Vonage ---

// const timer = 19; // in ms, actual timer duration is higher
const timer = 18; // in ms, actual timer duration is higher

//---- ElevenLabs TTS engine ----

const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
const elevenLabsAgentId = process.env.ELEVENLABS_AGENT_ID;
const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID;
const elevenLabsModel = process.env.ELEVENLABS_MODEL;

const elevenLabsInactivityTimer = 180; // in seconds, 180 max, default is 20
const elevenLabsKeepAliveTimer = 150000; // in milliseconds, must be less than elevenLabsInactivityTimer value

//--- Streaming timer calculation ---

let prevTime = Date.now();
let counter = 0;
let total = 0;
let cycles = 2000;

console.log('\n>>> Wait around', Math.round(cycles * timer / 1000), 'seconds to see the actual streaming timer average ...\n');

const streamTimer = setInterval ( () => {
    
    const timeNow = Date.now();
    const difference = timeNow - prevTime;
    total = total + difference;
    prevTime = timeNow;

    counter++;

    if (counter == cycles) { 
        clearInterval(streamTimer);
        console.log('\n>>> Average streaming timer (should be close to 20 AND under 20.000):', total / counter);
    };

}, timer);


//--- Websocket server (for WebSockets from Vonage Voice API platform) ---

app.ws('/socket', async (ws, req) => {

  //-- debug only --
  let ttsSeq = 0;

  //-----

  const peerUuid = req.query.peer_uuid;
  
  const webhookUrl = req.query.webhook_url;
  console.log('>>> webhookUrl:', webhookUrl);
  
  let elevenLabsTimer;

  console.log('>>> WebSocket from Vonage platform')
  console.log('>>> peer call uuid:', peerUuid);

  let wsVgOpen = true; // WebSocket to Vonage ready for binary audio payload?

  // let isDgPartialTranscript = false;
  // let dgTranscript = ""; 

  // let startSpeech = false;
  
  let dropTtsChunks = false;
  
  // let newResponseStart = '';  // first sentence of OpenAI new streamed responsse

  //-- audio recording files -- 
  const audioTo11lFileName = './recordings/' + peerUuid + '_rec_to_11l_' + moment(Date.now()).format('YYYY_MM_DD_HH_mm_ss_SSS') + '.raw'; // using local time
  const audioToVgFileName = './recordings/' + peerUuid + '_rec_to_vg_' + moment(Date.now()).format('YYYY_MM_DD_HH_mm_ss_SSS') + '.raw'; // using local time

  if (recordAllAudio) { 

    try {
      await fsp.writeFile(audioTo11lFileName, '');
    } catch(e) {
      console.log("Error creating file", audioTo11lFileName, e);
    }
    console.log('File created:', audioTo11lFileName);

    try {
      await fsp.writeFile(audioToVgFileName, '');
    } catch(e) {
      console.log("Error creating file", audioToVgFileName, e);
    }
    console.log('File created:', audioToVgFileName);

  }

//-- stream audio to VG --

  let payloadToVg = Buffer.alloc(0);
  let streamToVgIndex = 0;
  let lastTime = Date.now();
  let nowTime;

  //-

  const streamTimer = setInterval ( () => {

    if (payloadToVg.length != 0) {

      const streamToVgPacket = Buffer.from(payloadToVg).subarray(streamToVgIndex, streamToVgIndex + 640);  // 640-byte packet for linear16 / 16 kHz
      streamToVgIndex = streamToVgIndex + 640;

      if (streamToVgPacket.length != 0) {
        if (wsVgOpen && streamToVgPacket.length == 640) {
            nowTime = Date.now();
            
            // console.log('>> interval:', nowTime - lastTime, 's');
            process.stdout.write(".");
            
            ws.send(streamToVgPacket);
            lastTime = nowTime;

            if (recordAllAudio) {
              try {
                fsp.appendFile(audioToVgFileName, streamToVgPacket, 'binary');
              } catch(error) {
                console.log("error writing to file", audioToVg2FileName, error);
              }
            }  

        };
      } else {
        streamToVgIndex = streamToVgIndex - 640; // prevent index from increasing for ever as it is beyond buffer current length
      }

    } 

  }, timer);

  //-- ElevenLabs connection ---

  let ws11LabsOpen = false; // WebSocket to ElevenLabs ready for binary audio payload?

  // const elevenLabsWsUrl = "wss://api.elevenlabs.io/v1/text-to-speech/" + elevenLabsVoiceId + "/stream-input?model_id=" + elevenLabsModel + "&language_code=en&output_format=pcm_16000&auto_mode=true&inactivity_timeout=" + elevenLabsInactivityTimer;
  const elevenLabsWsUrl = "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=" + elevenLabsAgentId;

  const elevenLabsWs = new webSocket(elevenLabsWsUrl, {
    headers: { "xi-api-key": elevenLabsApiKey },
  });

  //--

  elevenLabsWs.on('error', async (event) => {
    console.log('>>> ElevenLabs WebSocket error:', event);
  }); 

  //--

  elevenLabsWs.on('open', async () => {
    console.log('>>> WebSocket to ElevenLabs opened');

    const initMessage = {
        "type": "conversation_initiation_client_data",
        "conversation_config_override": {
          "agent": {
            "prompt": {
              "prompt": "You are a helpful assistant."
            },
            "first_message": "Hi, I'm Aria from ElevenLabs support. How can I help you today?",
            "language": "en"
          },
          "tts": {
            "voice_id": elevenLabsVoiceId
          }
        }
        // "custom_llm_extra_body": {
        //   "temperature": 0.7,
        //   "max_tokens": 150
        // },
        // "dynamic_variables": {
        //   "user_name": "John",
        //   "account_type": "premium"
        // }
      };

    ws.send(JSON.stringify(initMessage));
    
    ws11LabsOpen = true;

    // elevenLabsTimer = setInterval ( () => {

    //   // send keepalive message
    //   if (ws11LabsOpen) {
    //     console.log('\n>>>', Date.now(), 'Sending keep alive to ElevenLabs');
    //     elevenLabsWs.send(JSON.stringify({text: " "}));
    //   }

    // }, elevenLabsKeepAliveTimer);

  });

  //--
      
  elevenLabsWs.on('message', async(msg) =>  {

    const data = JSON.parse(msg.toString());


    switch(data.type) {

    case 'audio':

      const newAudioPayloadToVg = Buffer.from(data.audio_event.audio_base_64, 'base64');

      console.log('\n>>>', Date.now(), 'Received audio payload from ElevenLabs:', newAudioPayloadToVg.length, 'bytes');

      // if (startSpeech) {
      //   dropTtsChunks = true;
      // }

      if (wsVgOpen) {

        // // console.log('\ndropTtsChunks:', dropTtsChunks);

        // if (dropTtsChunks) {

        //   const textArray = data.alignment.chars;

        //   // take first 15 chars or less
        //   const textLength = Math.min(textArray.length, 15);

        //   let receivedTtsText = '';

        //   for (let i = 0; i < textLength; i++) {
        //     receivedTtsText = receivedTtsText + textArray[i];
        //   }

        //   if (newResponseStart != '') {

        //     const compareLength = Math.min(receivedTtsText.length, newResponseStart.slice(0, textLength).length); // sometimes one string has extra trailing space character

        //     if ( receivedTtsText.slice(0, compareLength) == newResponseStart.slice(0, compareLength) ) {
        //       dropTtsChunks = false;
        //       payloadToVg = Buffer.concat([payloadToVg, newAudioPayloadToVg]);
        //     } 

        //   } 

        // } else {

        payloadToVg = Buffer.concat([payloadToVg, newAudioPayloadToVg]);
      
        // }

      }

      break;

    //---

    case 'user_transcript':

      axios.post(webhookUrl,  
        {
          "type": 'user_transcript',
          "transcript": data.user_transcription_event.user_transcript
        },
        {
        headers: {
          "Content-Type": 'application/json'
        }
      });

      console.log('\n', data);

      break;

    //---   

    case 'agent_response':

      axios.post(webhookUrl,  
        {
          "type": 'agent_response',
          "response": data.agent_response_event.agent_response
        },
        {
        headers: {
          "Content-Type": 'application/json'
        }
      });

      console.log('\n', data);

      break;

    //---  

    case 'interruption':
    
      // barge-in
      payloadToVg = Buffer.alloc(0);  // reset stream buffer to VG
      streamToVgIndex = 0;  

      break;

    //---  

    case 'ping':

      console.log('\n', data);

      if (ws11LabsOpen) {

        elevenLabsWs.send(JSON.stringify({
          type: "pong",
          event_id: data.ping_event.event_id
        }));

        // console.log('replied: { type: "pong", event_id:', data.ping_event.event_id, '}');

      }  

      break;


    //---
  
    
    default:

      console.log('\n', data); 

    }


    // if (data.isFinal) {
    //     // the generation is complete
    // }
    
    // if (data.normalizedAlignment) {
    //     // use the alignment info if needed
    // }

  });

  //--

  elevenLabsWs.on('close', async (msg) => {

    // clearInterval(elevenLabsTimer);
    
    ws11LabsOpen = false; // stop sending audio payload to 11L platform

    console.log('\n>>> ElevenLabs WebSocket closed')
  
  });

 
  //---------------

  ws.on('message', async (msg) => {
    
    if (typeof msg === "string") {
    
      console.log(">>> Vonage Websocket message:", msg);
    
    } else {

      if (ws11LabsOpen) {

        elevenLabsWs.send(JSON.stringify({
          user_audio_chunk: msg.toString('base64')
        }));

        if (recordAllAudio) {
          try {
            fsp.appendFile(audioTo11lFileName, msg, 'binary');
          } catch(error) {
            console.log("error writing to file", audioTo11lFileName, error);
          }
        } 
      
      } 

    }

  });

  //--

  ws.on('close', async () => {

    wsVgOpen = false;
    console.log("\n>>> Vonage WebSocket closed");

    elevenLabsWs.close(); // close WebSocket to ElevenLabs
  });

});

//--- If this application is hosted on VCR (Vonage Cloud Runtime) serverless infrastructure --------

app.get('/_/health', async(req, res) => {

  res.status(200).send('Ok');

});

//=========================================

const port = process.env.VCR_PORT || process.env.PORT || 6000;

app.listen(port, () => console.log(`Connector application listening on port ${port}`));

//------------

