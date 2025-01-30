const TelegramBot = require("node-telegram-bot-api");
const dotenv = require("dotenv");
const path = require("path");
const { createClient } = require('@supabase/supabase-js');
const sendAdminMessage = require("./admin");

dotenv.config();

const token = process.env.TOKEN;
const groupChatId = `${process.env.GROUP}`;
const adminId = process.env.ADMIN_CHAT_ID;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const menu1Path = path.join(__dirname, "photo", "menu_1.jpg");
const menu2Path = path.join(__dirname, "photo", "menu_2.jpg");

const bot = new TelegramBot(token, { polling: true });


let userFeedback = {};

const getUserFullName = (msg) => {
  return {
    firstName: msg.from.first_name || "No name",
    lastName: msg.from.last_name || "",
  };
};

const saveUserChatIdToSupabase = async (chatId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('chat_id', chatId);

    if (error) {
      console.error('Xatolik foydalanuvchini olishda:', error);
      return;
    }

    if (data.length === 0) {
      const { error } = await supabase
        .from('users')
        .insert([{ chat_id: chatId }]);

      if (error) {
        console.error('Foydalanuvchini saqlashda xatolik:', error);
      } else {
        console.log(`Foydalanuvchi ${chatId} Supabase'ga saqlandi.`);
      }
    } else {
      console.log(`Foydalanuvchi ${chatId} allaqachon mavjud.`);
    }
  } catch (error) {
    console.error('Xatolik Supabase bilan ulanishda:', error);
  }
};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  if (chatId.toString() === adminId.toString()) {
    sendAdminMessage(bot, adminId);
    return;
  }

  const { firstName, lastName } = getUserFullName(msg);

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("chat_id", chatId);

    if (error) {
      console.error("Xatolik foydalanuvchini olishda:", error);
      return;
    }

    if (data.length > 0) {
      // Foydalanuvchi mavjud, menyuni ko‘rsatish
      const feedbackOptions = {
        reply_markup: {
          keyboard: [
            [
              { text: "🗣 Shikoyat" },
              { text: "💬 Taklif" },
            ],
            [{ text: "🍱 Menyu" }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      };

      bot.sendMessage(chatId, "⏱️ Tanlang shikoyat yoki taklif!", feedbackOptions);
    } else {
      const options = {
        reply_markup: {
          keyboard: [
            [
              {
                text: "📲 Kontakt yuborish",
                request_contact: true,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      };

      await bot.sendMessage(chatId, "📞 Telefon raqamingizni yuboring!", options);
      console.log("Xabar yuborildi:", chatId);
    }
  } catch (error) {
    console.error("Xatolik Supabase bilan ulanishda:", error);
  }
});

bot.on("contact", (msg) => {
  const userContact = msg.contact;
  const { firstName, lastName } = getUserFullName(msg);

  userFeedback[msg.chat.id] = {
    phone_number: userContact.phone_number,
    first_name: firstName,
    last_name: lastName,
  };

  const feedbackOptions = {
    reply_markup: {
      keyboard: [
        [
          { text: "🗣 Shikoyat" },
          { text: "💬 Taklif" },
        ],
        [
          { text: "🍱 Menyu" }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };

  bot.sendMessage(msg.chat.id, "✅ Telefon raqamingiz qabul qilindi!", feedbackOptions);
});

bot.onText(/Shikoyat|Taklif/, (msg, match) => {
  const category = match[0];
  const { firstName, lastName } = getUserFullName(msg);

  if (!userFeedback[msg.chat.id]) userFeedback[msg.chat.id] = {};
  userFeedback[msg.chat.id].category = category;
  userFeedback[msg.chat.id].first_name = firstName;
  userFeedback[msg.chat.id].last_name = lastName;

  if (category === "Taklif") {
    bot.sendMessage(msg.chat.id, "💬 Taklifingizni kiriting!");
  } else {
    const complaintOptions = {
      reply_markup: {
        keyboard: [
          [
            { text: "💰 Kassir" },
            { text: "🍽 Oshpaz" },
          ],
          [
            { text: "🧹 Tozalik" },
            { text: "🔙 Orqaga" },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };

    bot.sendMessage(msg.chat.id, "📝 Shikoyat kimning ustidan?", complaintOptions);
  }
});

bot.onText(/🔙 Orqaga/, (msg) => {
  const chatId = msg.chat.id;

  if (userFeedback[chatId] && !userFeedback[chatId].text) {
    const feedbackOptions = {
      reply_markup: {
        keyboard: [
          [
            { text: "🗣 Shikoyat" },
            { text: "💬 Taklif" },
          ],
          [
            { text: "🍱 Menyu" }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
    bot.sendMessage(chatId, feedbackOptions);
  } else {
    bot.sendMessage(chatId, "Ma'lumotlaringiz bekor qilindi! qayta /start ni bosing");
    delete userFeedback[chatId];
  }
});

bot.onText(/(Kassir|Oshpaz|Tozalik)/, (msg, match) => {
  const selectedOption = match[0];
  const { firstName, lastName } = getUserFullName(msg);

  userFeedback[msg.chat.id].whats = selectedOption;

  bot.sendMessage(msg.chat.id, `📝 ${selectedOption} ustidan nima shikoyatingiz bor?`);
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const { firstName, lastName } = getUserFullName(msg);

  if (msg.text === "🔙 Orqaga") {
    return;
  }

  if (
    userFeedback[chatId] &&
    userFeedback[chatId].category === "Taklif" &&
    !userFeedback[chatId].text &&
    !msg.text.startsWith("/")
  ) {
    userFeedback[chatId].text = msg.text;

    const confirmOptions = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlash", callback_data: "confirm" },
            { text: "❌ Bekor qilish", callback_data: "cancel" },
          ],
        ],
      },
    };

    bot.sendMessage(chatId, `${msg.text}`, confirmOptions);
  }

  if (
    userFeedback[chatId] &&
    userFeedback[chatId].whats &&
    !userFeedback[chatId].text &&
    !msg.text.startsWith("/") &&
    userFeedback[chatId].category === "Shikoyat"
  ) {
    userFeedback[chatId].text = msg.text;

    const confirmOptions = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlash", callback_data: "confirm" },
            { text: "❌ Bekor qilish", callback_data: "cancel" },
          ],
        ],
      },
    };

    bot.sendMessage(chatId, `${msg.text}`, confirmOptions);
  }
});

bot.on("callback_query", (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const action = callbackQuery.data;

  try {
    if (action === "confirm") {
      const feedback = userFeedback[chatId];
      let message = `<b>📱 Foydalanuvchi:</b> ${feedback.first_name} ${feedback.last_name || ''} \n<b>📋 Kategoriya:</b> ${feedback.category}`;

      if (feedback.category !== "Taklif") {
        message += `\n <b>👤 Kimga:</b> ${feedback.whats} `;
      }

      message += `\n <b>📝 ${feedback.category}:</b> ${feedback.text}`

      bot.sendMessage(groupChatId, message, { parse_mode: "HTML" })
        .then(() => {
          console.log("Guruhga xabar yuborildi!");
        })
        .catch((error) => {
          console.error("Xatolik yuz berdi!", error);
        });

      delete userFeedback[chatId];

      const feedbackOptions = {
        reply_markup: {
          keyboard: [
            [
              { text: "🗣 Shikoyat" },
              { text: "💬 Taklif" },
            ],
            [
              { text: "🍱 Menyu" }
            ]
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      };
      bot.sendMessage(chatId, "✅ Ma'lumotlaringiz yuborildi!",feedbackOptions);

    } else if (action === "cancel") {
      bot.sendMessage(chatId, "❌ Amal bekor qilindi.");

      delete userFeedback[chatId];

      const feedbackOptions = {
        reply_markup: {
          keyboard: [
            [
              { text: "🗣 Shikoyat" },
              { text: "💬 Taklif" },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      };
      bot.sendMessage(chatId, feedbackOptions);
    }
  } catch (error) {
    console.error("Xatolik yuz berdi callback_query-da:", error);
  }

  delete userFeedback[chatId];
});

bot.onText(/🍱 Menyu/, (msg) => {
  const chatId = msg.chat.id;
  const menuOptions = {
    reply_markup: {
      keyboard: [
        [
          { text: "🔙 Orqaga" }
        ]
      ],
      resize_keyboard: true,
    },
  };

  bot.sendPhoto(chatId, menu1Path);
  bot.sendPhoto(chatId, menu2Path);
  bot.sendMessage(chatId, menuOptions);
});