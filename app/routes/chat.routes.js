const chat = require("../controllers/chat.controller");
const authorization = require("../middleware/authorization.middleware");

module.exports = (route) => {
	route.post("/chat/get-or-create-room", authorization, chat.getOrCreateRoom);
	route.get("/chat/conversations", authorization, chat.getConversations);
	route.get("/chat/messages/:roomId", authorization, chat.getMessages);
	route.post("/chat/send-message", authorization, chat.sendMessage);
	route.put("/chat/mark-read/:roomId", authorization, chat.markAsRead);
};
