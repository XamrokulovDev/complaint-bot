const { createClient } = require('@supabase/supabase-js');
const dotenv = require("dotenv");
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const sendAdminMessage = (bot, adminId) => {
  const startAnnouncementProcess = () => {
    bot.sendMessage(adminId, "📝 E'lonning sarlavhasini kiriting!");

    bot.once('message', (titleMsg) => {
      const title = titleMsg.text;
      bot.sendMessage(adminId, "📖 E'lonning ma'lumotlarini kiriting!");

      bot.once('message', (descriptionMsg) => {
        const description = descriptionMsg.text;
        bot.sendMessage(adminId, "📷 E'lon uchun rasm yuboring!");

        bot.once('photo', (photoMsg) => {
          const photo = photoMsg.photo[photoMsg.photo.length - 1].file_id;

          bot.sendMessage(adminId, "✅ Tasdiqlaysizmi?", {
            reply_markup: {
              inline_keyboard: [
                [{ text: "✅ Tasdiqlayman", callback_data: "confirm" }],
                [{ text: "❌ Bekor qilish", callback_data: "cancell" }]
              ]
            }
          });

          bot.once('callback_query', (callbackQuery) => {
            const action = callbackQuery.data;

            if (action === "confirm") {
              supabase
                .from('users')
                .select('chat_id')
                .then(({ data, error }) => {
                  if (error) {
                    console.error('Supabase xatolik:', error);
                    return;
                  }

                  data.forEach(user => {
                    bot.sendPhoto(user.chat_id, photo, {
                      caption: `${title}\n\n${description}`
                    });
                  });

                  bot.sendMessage(adminId, "✅ E'lon barcha foydalanuvchilarga yuborildi.", {
                    reply_markup: {
                      keyboard: [
                        [{ text: "📣 E'lon berish" }],
                      ],
                      resize_keyboard: true,
                      one_time_keyboard: true,
                    },
                  });
                });
            } else if (action === "cancell") {
              bot.sendMessage(adminId, "↩️ E'lon bekor qilindi.", {
                reply_markup: {
                  keyboard: [
                    [{ text: "📣 E'lon berish" }],
                  ],
                  resize_keyboard: true,
                  one_time_keyboard: true,
                },
              });
            }

            bot.answerCallbackQuery(callbackQuery.id);
          });
        });
      });
    });
  };

  bot.sendMessage(adminId, "👋 Assalomu alaykum. Admin botiga xush kelibsiz!", {
    reply_markup: {
      keyboard: [
        [{ text: "📣 E'lon berish" }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });

  bot.on('message', (msg) => {
    if (msg.text === "📣 E'lon berish") {
      startAnnouncementProcess();
    }
  });
};

module.exports = sendAdminMessage;