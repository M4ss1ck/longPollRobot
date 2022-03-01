import { Telegraf } from "telegraf";

const my_id = process.env.ADMIN_ID;
// hora en que arranca el bot
const inicio = performance.now();
// para las encuestas
let encuestas = [];

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.action("del", (ctx) => ctx.deleteMessage());

bot.command("ping", (ctx) => {
  const tiempo = elapsedTime(inicio);
  const botUsername = ctx.me;
  const botInfo = JSON.stringify(ctx.botInfo)
    .replace(/"/g, "")
    .replace(/,/g, ",\n");
  console.log(botInfo);
  ctx.reply(`[@${botUsername}] Tiempo activo: ${tiempo}`);
});

bot.command("info", async (ctx) => {
  //console.log(ctx);
  if (ctx.message.reply_to_message) {
    const msgInfo = JSON.stringify(ctx.message.reply_to_message)
      .replace(/"/g, " ")
      .replace(/,/g, ",\n")
      .replace(/{/g, "\n {");

    const text = "Información del mensaje:\n" + msgInfo;
    if (text.length < 4096) {
      ctx.replyWithHTML(text, {
        reply_to_message_id: ctx.message.reply_to_message.message_id,
      });
    } else {
      await ctx.replyWithHTML(text.substring(0, 4096), {
        reply_to_message_id: ctx.message.reply_to_message.message_id,
      });
      await ctx.replyWithHTML(text.substring(4096, text.length), {
        reply_to_message_id: ctx.message.reply_to_message.message_id,
      });
    }
  } else {
    ctx.replyWithHTML(
      "<code>/info</code> se usa respondiendo un mensaje. Tal vez prefieras usar /me"
    );
  }
});

// comando ayuda

bot.command(["start", "jelou"], (ctx) => {
  ctx.replyWithHTML(
    `<b>Hola, ${ctx.message.from.first_name}!</b>\nEnvía <code>/poll Titulo de la encuesta;opción 1;opción 2;...</code> para crear una encuesta pública`
  );
});

bot.command("say", (ctx) => {
  const text = ctx.message.text.substring(5);
  console.log(text.length);
  if (text.length > 0) {
    ctx.replyWithHTML(text);
  } else {
    ctx.replyWithHTML(
      "Escribe algo después del comando y yo lo repetiré\nEjemplo: <code>/say Hola</code>"
    );
  }
});

bot.command("quit", (ctx) => {
  if (ctx.message.from.id.toString() == my_id) {
    ctx
      .reply("Me fui 👋")
      .then(() => ctx.telegram.leaveChat(ctx.message.chat.id));
  }
});

bot.command("poll", async (ctx) => {
  const text = ctx.message.text.substring(6);
  if (text.length > 0) {
    const arr = text.split(";");
    const question = arr[0].length > 255 ? arr[0].substring(0, 255) : arr[0];
    const options = arr
      .slice(1)
      .map((element) =>
        element.length > 100 ? element.substring(0, 100) : element
      );
    const extra = {
      is_anonymous: false,
      //protect_content: true,
      //allows_multiple_answers: true,
      //close_date: new Date(Date.now() + 60 * 60 * 1000),
    };

    const size = options.length;
    const poll_count = Math.ceil(size / 10);
    const part = Math.ceil(options.length / poll_count);
    for (let i = 0; i < poll_count; i++) {
      let option = options.slice(part * i, part * (i + 1));
      await ctx.telegram
        .sendPoll(ctx.chat.id, question, option, extra)
        .then((res) => {
          const poll_chat = res.chat.id;
          const poll_id = res.poll.id;
          encuestas.push({ chat: poll_chat, id: poll_id });
        });
    }
  } else {
    ctx.reply("Añade un título y opciones para la encuesta");
  }
});

bot.on("poll_answer", async (ctx) => {
  const id = ctx.pollAnswer.poll_id;
  const user = ctx.pollAnswer.user.first_name;
  const option = ctx.pollAnswer.option_ids[0];
  const text =
    option === undefined
      ? user + " retractó su voto en la encuesta " + id
      : user + " votó por la opción " + option + " en la encuesta " + id;
  const chat = encuestas.find((element) => element.id === id);
  //console.log(chat);
  bot.telegram.sendMessage(chat?.chat ?? my_id, text);
});

// Iniciar bot
bot.launch();
console.log("BOT INICIADO");

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// calcular el tiempo que tarda el bot en arrancar
const elapsedTime = (inicio) => {
  const ahora = performance.now();
  const activo = ahora - inicio;
  // dar el resultado en dependencia del tiempo
  if (activo > 60 * 60 * 1000) {
    const valor = roundToAny(activo / 3600000, 2);
    const horas = Math.floor(valor);
    const minutos = roundToAny((valor - horas) * 60, 0);
    return `${horas} h ${minutos} min`;
  } else if (activo > 60000) {
    const valor = roundToAny(activo / 60000, 2);
    const minutos = Math.floor(valor);
    const segundos = roundToAny((valor - minutos) * 60, 0);
    return `${minutos} min ${segundos} s`;
  } else {
    return `${roundToAny(activo / 1000, 1)} s`;
  }
};

function roundToAny(num, n = 2) {
  return +(Math.round(num + `e+${n}`) + `e-${n}`);
}
