const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const EmployerProfile = require('../models/EmployerProfile');
const SeekerProfile = require('../models/SeekerProfile');

// @desc    Get all conversations for current user
// @route   GET /api/messages/conversations
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'name email role')
      .populate('job', 'title companyName')
      .sort({ updatedAt: -1 });

    // Attach profile info for the other participant
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const other = conv.participants.find(
          (p) => p._id.toString() !== userId
        );

        let profile = null;
        if (other.role === 'employer') {
          profile = await EmployerProfile.findOne({ user: other._id });
        } else if (other.role === 'seeker') {
          profile = await SeekerProfile.findOne({ user: other._id });
        }

        const userRole = req.user.role;
        const unread =
          userRole === 'employer'
            ? conv.unreadCount.employer
            : conv.unreadCount.seeker;

        return {
          _id: conv._id,
          otherUser: {
            _id: other._id,
            name: other.name,
            email: other.email,
            role: other.role,
            profile,
          },
          job: conv.job,
          lastMessage: conv.lastMessage,
          unreadCount: unread,
          updatedAt: conv.updatedAt,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Start or get existing conversation
// @route   POST /api/messages/conversations
const createConversation = async (req, res) => {
  try {
    const { participantId, jobId } = req.body;
    const userId = req.user.id;

    if (!participantId) {
      return res
        .status(400)
        .json({ message: 'Participant ID is required' });
    }

    // Check if conversation already exists between these two users
    const existing = await Conversation.findOne({
      participants: { $all: [userId, participantId] },
    }).populate('participants', 'name email role');

    if (existing) {
      return res.json(existing);
    }

    // Verify the other user exists
    const otherUser = await User.findById(participantId);
    if (!otherUser) {
      return res
        .status(404)
        .json({ message: 'User not found' });
    }

    // Validate role pairing (employer <-> seeker only)
    if (
      (req.user.role === 'employer' &&
        otherUser.role !== 'seeker') ||
      (req.user.role === 'seeker' &&
        otherUser.role !== 'employer')
    ) {
      return res.status(400).json({
        message:
          'Conversations can only be started between employers and seekers',
      });
    }

    const conversation = await Conversation.create({
      participants: [userId, participantId],
      job: jobId || null,
    });

    const populated = await conversation.populate(
      'participants',
      'name email role'
    );

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get conversation messages
// @route   GET /api/messages/conversations/:id
const getConversationMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res
        .status(404)
        .json({ message: 'Conversation not found' });
    }

    // Verify user is a participant
    if (
      !conversation.participants
        .map((p) => p.toString())
        .includes(userId)
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      conversation: id,
    })
      .populate('sender', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({
      conversation: id,
    });

    res.json({
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send a message
// @route   POST /api/messages/conversations/:id/messages
const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res
        .status(400)
        .json({ message: 'Message content is required' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res
        .status(404)
        .json({ message: 'Conversation not found' });
    }

    // Verify user is a participant
    if (
      !conversation.participants
        .map((p) => p.toString())
        .includes(userId)
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create message
    const message = await Message.create({
      conversation: id,
      sender: userId,
      content: content.trim(),
    });

    const populated = await message.populate(
      'sender',
      'name role'
    );

    // Update conversation
    conversation.lastMessage = {
      content: content.trim(),
      sender: userId,
      createdAt: new Date(),
    };

    // Increment unread for the OTHER participant
    const sender = await User.findById(userId);
    if (sender.role === 'employer') {
      conversation.unreadCount.seeker += 1;
    } else {
      conversation.unreadCount.employer += 1;
    }

    await conversation.save();

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark conversation as read
// @route   PUT /api/messages/conversations/:id/read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res
        .status(404)
        .json({ message: 'Conversation not found' });
    }

    if (
      !conversation.participants
        .map((p) => p.toString())
        .includes(userId)
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Reset unread count for current user
    const user = await User.findById(userId);
    if (user.role === 'employer') {
      conversation.unreadCount.employer = 0;
    } else {
      conversation.unreadCount.seeker = 0;
    }

    await conversation.save();

    // Mark all messages in this conversation from OTHER users as read
    await Message.updateMany(
      {
        conversation: id,
        sender: { $ne: userId },
        read: false,
      },
      { read: true }
    );

    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get unread count across all conversations
// @route   GET /api/messages/unread-count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    const conversations = await Conversation.find({
      participants: userId,
    });

    let total = 0;
    conversations.forEach((conv) => {
      if (user.role === 'employer') {
        total += conv.unreadCount.employer;
      } else {
        total += conv.unreadCount.seeker;
      }
    });

    res.json({ unreadCount: total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getConversations,
  createConversation,
  getConversationMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
};
