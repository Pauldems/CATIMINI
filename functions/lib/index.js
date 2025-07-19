"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNotificationCreated = exports.testNotification = exports.sendVerificationEmail = void 0;
const app_1 = require("firebase-admin/app");
// Initialiser Firebase Admin
(0, app_1.initializeApp)();
// Importer et exporter les fonctions
var emailService_1 = require("./emailService");
Object.defineProperty(exports, "sendVerificationEmail", { enumerable: true, get: function () { return emailService_1.sendVerificationEmail; } });
var notificationService_1 = require("./notificationService");
Object.defineProperty(exports, "testNotification", { enumerable: true, get: function () { return notificationService_1.testNotification; } });
Object.defineProperty(exports, "onNotificationCreated", { enumerable: true, get: function () { return notificationService_1.onNotificationCreated; } });
//# sourceMappingURL=index.js.map