'use strict';
require('dotenv').config();
const axios = require('axios');
const dateFns = require('date-fns');
const BootBot = require('bootbot');
const payloads = require('./constants/payloads');

const formatDateTime = date => dateFns.format(new Date(date), 'dd/MM/yyyy hh:mm aaaa');

const bot = new BootBot({
  accessToken: process.env.FB_ACCESS_TOKEN,
  verifyToken: 'VERIFY_TOKEN',
  appSecret: process.env.FB_APP_SECRET
});

bot.setGreetingText(
  '¡Hola! Soy LibroBot!'
);

bot.setPersistentMenu([
  {
    locale: 'default',
    call_to_actions: [
      {
        title: 'Todas las Actividades',
        type: 'postback',
        payload: payloads.SHOW_ALL_ACTIVITIES,
      },
      {
        title: 'Mis actividades',
        type: 'postback',
        payload: payloads.SHOW_MY_ACTIVITIES,
      },
    ]
  }
]);

bot.on(`postback:${payloads.SHOW_ALL_ACTIVITIES}`, async (payload, chat) => {
  const response = await axios.get(`https://vialibro-api.herokuapp.com/events`);

  if (!response.data.length) {
    await chat.say('¡No tenemos nuevas actividades en este momento!');
  } else {
    await chat.say('Estas son todas las actividades que tenemos:');
    response.data.forEach(async (activity) => {

      await chat.say({
        text: `Nombre: ${activity.name}\nDescripción: ${activity.description}\nFecha de inicio: ${formatDateTime(activity.start)}\nFecha de fin: ${formatDateTime(activity.end)}`,
        buttons: [
          {
            type: 'postback',
            title: 'Deseo registrarme',
            payload: `${payloads.SIGN_UP_TO_ACTIVITY}_${activity.key}`,
          },
        ],
      });
    });
  }
});

bot.on(`postback:${payloads.SHOW_MY_ACTIVITIES}`, async (payload, chat) => {
  await chat.say('Mostrar mis actividades');
});

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
  const { id: psid } = payload.sender;

  const response = await axios.get(`https://vialibro-api.herokuapp.com/volunteers/${psid}`);

  if (response.data === '') {
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
  } else {
    await chat.say('Hola nuevamente! Ya estas registrado en Via Libro! Puedes explorar el menu de opciones para ver las actividades y demás :)!');
  }
});

bot.on(`postback:${payloads.REGISTER}`, async (payload, chat) => {
  await chat.conversation(convo => {
    askName(convo);
  });
});

bot.on('postback', async (payload, chat) => {
  const re = /^SIGN_UP_TO_ACTIVITY_(.+)/i;
  const buttonPayload = payload.postback.payload;
  const match = buttonPayload.match(re);

  if (match) {
    const activityKey = match[1];

    await chat.say({
      text: '¿Estás seguro que deseas registrarte? Es muy importante tu compromiso con la actividad.',
      buttons: [
        {
          type: 'postback',
          title: 'Sí, confirmo!',
          payload: `${payloads.CONFIRM_SIGN_UP_TO_ACTIVITY}_${activityKey}`,
        },
        {
          type: 'postback',
          title: 'No estoy muy seguro',
          payload: payloads.DECLINE_SIGN_UP_TO_ACTIVITY,
        },
      ],
    });
  }
});

bot.on('postback', async (payload, chat) => {
  const re = /^CONFIRM_SIGN_UP_TO_ACTIVITY_(.+)/i;
  const buttonPayload = payload.postback.payload;
  const match = buttonPayload.match(re);

  if (match) {
    const activityKey = match[1];

    const { id: psid } = payload.sender;

    try {
      await axios.post('https://vialibro-api.herokuapp.com/volunteers', {
        activity: {
          key: activityKey
        },
        volunteer: {
          psId: psid,
        },
        status: 'Draft',
      });

      await chat.say('¡Muchas gracias por registrarte!');
    } catch (e) {
      console.error('There was an error registering to activity: ', e);
      await convo.say('Hubo un error registrandote a la actividad, intentalo nuevamente!');
    }
  }
});

bot.on(`postback:${payloads.DECLINE_SIGN_UP_TO_ACTIVITY}`, async (payload, chat) => {
  await chat.say('No hay problema, siempre puedes ir al menu para registrarte en nuestras actividades disponibles');
});

bot.start(process.env.PORT || 3000);
