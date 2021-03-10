const Discord = require("discord.js");
const fs = require("fs");
const client = new Discord.Client();

const express = require("express");
const app = express();

app.use(express.static("public"));

let quotes = JSON.parse(fs.readFileSync("./data/quotes.json", "utf8"));
let messages = JSON.parse(fs.readFileSync("./data/messages.json", "utf8"));
let users = JSON.parse(fs.readFileSync("./data/users.json", "utf8"));
let guilds = JSON.parse(fs.readFileSync("./data/guilds.json", "utf8"));

let defaultEmoji = "⏺️";

let emojis = {
	success: ":white_check_mark:",
	error: ":x:",
};

client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", (msg) => {
	if (msg.author.bot) return;
	initData(msg.author.id, msg.guild.id);
});

client.on("messageReactionAdd", (r, user) => {
	if (user.bot) return;
	initData(user.id, r.message.guild.id);
	let emoji = getEmoji(user.id, r.message.guild.id);

	// todo: add whitelist/blacklist channel check
	if (r.emoji.name == emoji || r.emoji.id == emoji) {
		// if it's the right emoji
		if (!messages[r.message.id]) {
			saveQuote(r.message, user.id, r.message.guild.id);
			user.send(`${emojis.success} Quote saved.`);
			if (users[user.id].clearReaction) {
				r.remove();
			}
		} else {
			//let quote = quotes[messages[r.message.id]]
			r.users.remove(user);
			// message already quoted
		}
	}
});

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/views/index.html");
});

app.get("/api", (req, res) => {
	res.redirect("/");
});

app.get("/api/users/*/quotes", (req, res) => {
	let userID = req.url.split("users/")[1].split("/quotes")[0]; // the worst possible way to do this
	let data = {
		successful: false,
		error: "User not found",
	};
	if (users[userID]) {
		data = {
			successful: true,
			list: {},
		};
		for (var i = 0; i < users[userID].quotes.list.length; i++) {
			data.list[users[userID].quotes.list[i]] = quotes[users[userID].quotes.list[i]];
		}
	}
	res.send(data);
});

app.get("/api/guilds/*/quotes", (req, res) => {
	let guildID = req.url.split("guilds/")[1].split("/quotes")[0]; // the worst possible way to do this
	let data = {
		successful: false,
		error: "Guild not found",
	};
	if (guilds[guildID]) {
		data = {
			successful: true,
			list: {},
		};
		for (var i = 0; i < guilds[guildID].quotes.length; i++) {
			data.list[guilds[guildID].quotes[i]] = quotes[guilds[guildID].quotes[i]];
		}
	}
	res.send(data);
});

app.get("/api/quotes/*", (req, res) => {
	let quoteID = req.url.split("quotes/")[1].split("/")[0]; // the worst possible way to do this
	let data = {
		successful: false,
		error: "Quote not found",
	};
	if (quotes[quoteID]) {
		data = {
			successful: true,
			data: quotes[quoteID],
		};
	}
	res.send(data);
});

function initData(userID, guildID) {
	if (!users[userID]) {
		users[userID] = {
			created: new Date(),
			quotes: {
				list: [], // list of quote IDs by user
				saved: [], // list of quote IDs save by user
			},
			saveEmoji: "", // reaction emoji to use for saving quotes (blank = guild default)
			clearReaction: true, // whether to clear the quote emoji
		};
		fs.writeFile("./data/users.json", JSON.stringify(users, null, 1), (err) => console.error);
	}
	if (!guilds[guildID]) {
		guilds[guildID] = {
			created: new Date(),
			saveEmoji: "", // reaction emoji to use for saving quotes (blank = default)
			blackWhite: true, // blacklist mode or whitelist mode
			disabledChannels: [], // blacklisted channel IDs
			enabledChannels: [], // whitelisted channel IDs
			quotes: [], // list of quote IDs from this guild
		};
		fs.writeFile("./data/guilds.json", JSON.stringify(guilds, null, 1), (err) => console.error);
	}
}
function getEmoji(userID, guildID) {
	if (users[userID].saveEmoji.length >= 1) {
		return users[userID].saveEmoji;
	} else if (guilds[guildID].saveEmoji.length >= 1) {
		return guilds[guildID].saveEmoji;
	} else {
		return defaultEmoji;
	}
}
function saveQuote(msg, userID, guildID) {
	let user = users[userID];
	let guild = guilds[guildID];
	let key = genKey();

	initData(msg.author.id, guildID);

	user.quotes.saved.push(key);
	guild.quotes.push(key);
	users[msg.author.id].quotes.list.push(key);
	messages[msg.id] = key;
	quotes[key] = {
		msg: {
			content: msg.content,
			author: {
				id: msg.author.id,
				username: msg.author.username,
				avatarURL: msg.author.avatarURL({ format: "png" }),
				displayName: msg.member.displayName,
			},
			guild: {
				id: guildID,
				name: msg.guild.name,
			},
		},
		savedBy: userID,
		savedAt: new Date(),
		guild: guildID,
	};

	saveAll();
}

function genKey(l = 5, obj = quotes) {
	let a = "";
	while (1) {
		a = "";
		for (var i = 0; i < l; i++) {
			a += "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")[Math.floor(Math.random() * 26)];
		}
		if (!obj[a]) {
			break;
		}
	}
	return a;
}

function saveAll() {
	fs.writeFile("./data/users.json", JSON.stringify(users, null, 1), (err) => console.error);
	fs.writeFile("./data/guilds.json", JSON.stringify(guilds, null, 1), (err) => console.error);
	fs.writeFile("./data/quotes.json", JSON.stringify(quotes, null, 1), (err) => console.error);
	fs.writeFile("./data/messages.json", JSON.stringify(messages, null, 1), (err) => console.error);
}

client.login("");

const listener = app.listen(3131, () => {
	console.log("App listening on port " + listener.address().port);
});
