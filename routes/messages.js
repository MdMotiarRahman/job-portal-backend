const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);
router.use(requireRole('employer', 'seeker'));

// Get total unread count
router.get('/unread-count', messageController.getUnreadCount);

// Get all conversations for current user
router.get('/conversations', messageController.getConversations);

// Start a new conversation or get existing
router.post('/conversations', messageController.createConversation);

// Get messages in a conversation
router.get(
  '/conversations/:id',
  messageController.getConversationMessages
);

// Send a message
router.post(
  '/conversations/:id/messages',
  messageController.sendMessage
);

// Mark conversation as read
router.put(
  '/conversations/:id/read',
  messageController.markAsRead
);

module.exports = router;
