import { body, param, query, validationResult } from "express-validator";

// Helper: Error handler chung cho tất cả validations
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array().map((err) => ({ field: err.path, msg: err.msg })),
    });
  }
  next();
};

// Auth: Register (unique username/email, min password 8)
export const validateRegister = [
  body("username")
    .isLength({ min: 3, max: 20 })
    .withMessage("Username phải từ 3-20 ký tự")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username chỉ chứa chữ, số, underscore"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password phải ít nhất 8 ký tự")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password phải có chữ hoa, thường và số"),
  body("fullName")
    .isLength({ min: 2, max: 50 })
    .withMessage("Tên đầy đủ phải từ 2-50 ký tự")
    .trim()
    .escape(),
  body("email").isEmail().withMessage("Email không hợp lệ").normalizeEmail(),
  body("phone")
    .optional()
    .isMobilePhone("vi-VN")
    .withMessage("Số điện thoại không hợp lệ (VN)"),
  body("dob")
    .optional()
    .isISO8601()
    .withMessage("Ngày sinh phải định dạng YYYY-MM-DD"),
  handleValidationErrors,
];

// Auth: Login (simple, reuse some from register)
export const validateLogin = [
  body("username").notEmpty().withMessage("Username không được để trống"),
  body("password").notEmpty().withMessage("Password không được để trống"),
  handleValidationErrors,
];

// Users: Profile Update (optional fields)
export const validateProfileUpdate = [
  body("fullName")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Tên đầy đủ phải từ 2-50 ký tự")
    .trim()
    .escape(),
  body("phone")
    .optional()
    .isMobilePhone("vi-VN")
    .withMessage("Số điện thoại không hợp lệ"),
  body("dob").optional().isISO8601().withMessage("Ngày sinh phải YYYY-MM-DD"),
  handleValidationErrors,
];

// Users: Search (query param)
export const validateUserSearch = [
  query("query")
    .isLength({ min: 1, max: 50 })
    .withMessage("Query tìm kiếm phải từ 1-50 ký tự"),
  handleValidationErrors,
];

// Friends: Send Request (ObjectId receiver)
export const validateFriendRequest = [
  body("receiverId")
    .isMongoId()
    .withMessage("Receiver ID phải là ObjectId hợp lệ"),
  handleValidationErrors,
];

// Friends: Accept/Decline (param requestId)
export const validateFriendAction = [
  param("requestId").isMongoId().withMessage("Request ID không hợp lệ"),
  handleValidationErrors,
];

// Chats: Create (type enum, participants array)
export const validateChatCreate = [
  body("type")
    .isIn(["direct", "group"])
    .withMessage("Type phải là direct hoặc group"),
  body("participants")
    .isArray({ min: 1 })
    .withMessage("Phải có ít nhất 1 participant")
    .custom((value) => value.every((id) => mongoose.Types.ObjectId.isValid(id)))
    .withMessage("Tất cả participants phải là ObjectId hợp lệ"),
  body("name")
    .if(body("type").equals("group"))
    .isLength({ min: 1, max: 100 })
    .withMessage("Tên group phải từ 1-100 ký tự")
    .trim()
    .escape(),
  handleValidationErrors,
];

// Chats: Invite (userIds array)
export const validateChatInvite = [
  body("userIds")
    .isArray({ min: 1 })
    .withMessage("Phải mời ít nhất 1 user")
    .custom((value) => value.every((id) => mongoose.Types.ObjectId.isValid(id)))
    .withMessage("Tất cả userIds phải là ObjectId hợp lệ"),
  param("chatId").isMongoId().withMessage("Chat ID không hợp lệ"),
  handleValidationErrors,
];

// Chats: List (pagination query)
export const validateChatList = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit phải từ 1-100"),
  query("offset").optional().isInt({ min: 0 }).withMessage("Offset phải >= 0"),
  handleValidationErrors,
];

// Messages: Load (pagination)
export const validateMessageLoad = [
  param("chatId").isMongoId().withMessage("Chat ID không hợp lệ"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit phải từ 1-100"),
  query("offset").optional().isInt({ min: 0 }).withMessage("Offset phải >= 0"),
  handleValidationErrors,
];

// Messages: Send (content/type, file optional)
export const validateMessageSend = [
  body("chatId").isMongoId().withMessage("Chat ID không hợp lệ"),
  body("content")
    .if(body("type").not().equals("media"))
    .notEmpty()
    .withMessage("Nội dung không được để trống cho text"),
  body("type")
    .optional()
    .isIn(["text", "media"])
    .withMessage("Type phải là text hoặc media"),
  handleValidationErrors,
];

// Messages: Edit/Delete/Reaction/Seen (param messageId, optional content/reactionType)
export const validateMessageAction = [
  param("messageId").isMongoId().withMessage("Message ID không hợp lệ"),
  body("content")
    .optional()
    .notEmpty()
    .withMessage("Nội dung không được để trống"),
  body("reactionType")
    .optional()
    .isLength({ min: 1, max: 10 })
    .withMessage("Reaction type phải từ 1-10 ký tự (e.g., heart)"),
  handleValidationErrors,
];

export default {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validateUserSearch,
  validateFriendRequest,
  validateFriendAction,
  validateChatCreate,
  validateChatInvite,
  validateChatList,
  validateMessageLoad,
  validateMessageSend,
  validateMessageAction,
};
