'use strict';
require('dotenv').config();
const axios = require('axios');
const BootBot = require('bootbot');
const payloads = require('./constants/payloads');

const bot = new BootBot({
  accessToken: process.env.FB_ACCESS_TOKEN,
  verifyToken: 'VERIFY_TOKEN',
  appSecret: process.env.FB_APP_SECRET
});

bot.setGreetingText(
  '¡Hola! Soy LibroBot!'
);

const askOccupation = (convo) => {
  convo.ask(`¿Cuál es tu ocupación?`, async (payload, convo, data) => {
    const text = payload.message.text;
    convo.set('occupation', text);

    await convo.say(`Gracias por brindarnos todos tus datos!`);

    const name = convo.get('name');
    const email = convo.get('email');
    const birthdate = convo.get('birthdate');
    const phone = convo.get('phone');
    const gender = convo.get('gender');
    const district = convo.get('district');
    const occupation = convo.get('occupation');

    await convo.say(`Esta es la información que guardaremos:
    - Nombre: ${name}
    - Email: ${email}
    - Fecha de nacimiento: ${birthdate}
    - Celular: ${phone}
    - Sexo: ${gender}
    - Distrito: ${district}
    - Ocupación: ${occupation}
    `);

    try {
      const { id: psid } = payload.sender;

      await axios.post('https://vialibro-api.herokuapp.com/volunteers', {
        psId: psid,
        name,
        email,
        birthDate: JSON.stringify(new Date(birthdate)),
        phone,
        gender,
        district,
        occupation,
      });

      console.log('Registration complete!');
    } catch (e) {
      console.error('There was an error creating the user: ', e);
      await convo.say('Hubo un error registrando tus datos, intentalo nuevamente!');
    }

    convo.end();
  });
};

const askDistrict = (convo) => {
  convo.ask(`¿En qué distrito vives?`, (payload, convo, data) => {
    const text = payload.message.text;
    convo.set('district', text);
    askOccupation(convo);
  });
};

const askGender = (convo) => {
  convo.ask({
    text: '¿Cuál es tu sexo?',
    quickReplies: ['Masculino', 'Femenino', 'Prefiero no especificar']
  }, (payload, convo, data) => {
    const text = payload.message.text;
    convo.set('gender', text);
    askDistrict(convo);
  });
};

const askPhone = (convo) => {
  convo.ask(`¿Cuál es tu número de celular?`, (payload, convo, data) => {
    const text = payload.message.text;
    convo.set('phone', text);
    askGender(convo);
  });
};

const askBirthdate = (convo) => {
  convo.ask(`Ahora necesitamos tu fecha de nacimiento (dd/mm/yyyy)`, (payload, convo, data) => {
    const text = payload.message.text;
    convo.set('birthdate', text);
    askPhone(convo)
  });
};

const askEmail = (convo) => {
  convo.ask(`¿Cual es tu correo electrónico?`, (payload, convo, data) => {
    const text = payload.message.text;
    convo.set('email', text);
    askBirthdate(convo);
  });
};

const askName = (convo) => {
  convo.ask(`Primero brindanos tu nombre completo :)`, async (payload, convo, data) => {
    const text = payload.message.text;
    convo.set('name', text);
    await convo.say(`Hola ${text}!`);
    askEmail(convo);
  });
};

bot.setGetStartedButton(async (payload, chat) => {
  await chat.say({
    text: 'Información acerca de Via Libro. Pulsa este boton para registrarte!',
    buttons: [
      {
        type: 'postback',
        title: 'Registrarme!',
        payload: payloads.REGISTER,
      },
    ]
  });
});

bot.on(`postback:${payloads.REGISTER}`, async (payload, chat) => {
  console.log('Super Updated');

  chat.conversation(convo => {
    askName(convo);
  });
});

bot.start(process.env.PORT || 3000);
