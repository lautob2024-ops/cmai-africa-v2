CREATE TABLE IF NOT EXISTS `articleComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `articleComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `articleReactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `articleReactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `articleReactions_post_user` UNIQUE(`postId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `certificateRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`courseId` int NOT NULL,
	`message` text,
	`status` enum('pending','issued','rejected') NOT NULL DEFAULT 'pending',
	`certificateKey` varchar(420),
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`issuedAt` timestamp,
	CONSTRAINT `certificateRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chapterProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`chapterId` int NOT NULL,
	`secondsWatched` int NOT NULL DEFAULT 0,
	`quizScore` int,
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chapterProgress_id` PRIMARY KEY(`id`),
	CONSTRAINT `chapterProgress_user_chapter` UNIQUE(`userId`,`chapterId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chapterQuizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chapterId` int NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`correctOption` int NOT NULL,
	`position` int NOT NULL DEFAULT 1,
	CONSTRAINT `chapterQuizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `connectionRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`recipientId` int NOT NULL,
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `connectionRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `conversationMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	CONSTRAINT `conversationMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `courseChapters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text,
	`content` text NOT NULL,
	`position` int NOT NULL DEFAULT 1,
	`requiredSeconds` int NOT NULL DEFAULT 300,
	`attachmentKey` varchar(420),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `courseChapters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `courseFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`chapterId` int,
	`fileKey` varchar(420) NOT NULL,
	`fileName` varchar(220) NOT NULL,
	`mimeType` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `courseFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `courseProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`courseId` int NOT NULL,
	`secondsWatched` int NOT NULL DEFAULT 0,
	`quizScore` int DEFAULT 0,
	`requiredSeconds` int NOT NULL DEFAULT 1800,
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courseProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(140) NOT NULL,
	`title` varchar(220) NOT NULL,
	`level` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`content` text,
	`priceCents` int NOT NULL DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'USD',
	`requiredSeconds` int NOT NULL DEFAULT 1800,
	`passingScore` int NOT NULL DEFAULT 70,
	`coverImageKey` varchar(420),
	`isPublished` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `courses_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `discussionComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`discussionId` int NOT NULL,
	`userId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discussionComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `discussions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discussions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `institutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(240) NOT NULL,
	`type` varchar(80) NOT NULL,
	`city` varchar(120),
	`website` varchar(320),
	`source` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `institutions_id` PRIMARY KEY(`id`),
	CONSTRAINT `institutions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(80) NOT NULL,
	`lastName` varchar(80) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(40),
	`country` varchar(100) NOT NULL,
	`city` varchar(100),
	`organization` varchar(180),
	`profileType` varchar(80) NOT NULL,
	`educationLevel` varchar(120),
	`interests` text NOT NULL,
	`motivation` text,
	`participationMode` varchar(40) NOT NULL,
	`consent` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `members_id` PRIMARY KEY(`id`),
	CONSTRAINT `members_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`senderId` int NOT NULL,
	`body` text NOT NULL,
	`attachmentKey` varchar(420),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `paymentRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`courseId` int NOT NULL,
	`amountCents` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'USD',
	`chargedAmount` int,
	`chargedCurrency` varchar(8),
	`method` enum('mtn','moov','celtiis','card','fedapay','kkiapay','cinetpay') NOT NULL,
	`payerPhone` varchar(40) NOT NULL,
	`providerTransactionId` varchar(180),
	`transactionReference` varchar(180),
	`paymentUrl` varchar(600),
	`proofKey` varchar(420),
	`smsStatus` enum('pending','sent','unavailable') NOT NULL DEFAULT 'pending',
	`status` enum('pending','confirmed','rejected','expired') NOT NULL DEFAULT 'pending',
	`receiptKey` varchar(420),
	`receiptSentAt` timestamp,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `paymentRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `postAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`fileKey` varchar(420) NOT NULL,
	`fileName` varchar(220) NOT NULL,
	`mimeType` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `postAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `postComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`postId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `postComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `postReactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`postId` int NOT NULL,
	`reaction` varchar(30) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `postReactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`title` varchar(220) NOT NULL,
	`excerpt` varchar(500) NOT NULL,
	`body` text NOT NULL,
	`type` enum('article','challenge','scholarship','university_news') NOT NULL,
	`isPublished` int NOT NULL DEFAULT 1,
	`isPremium` int NOT NULL DEFAULT 0,
	`priceCents` int NOT NULL DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'USD',
	`authorId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `posts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `studentApplications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`firstName` varchar(80) NOT NULL,
	`lastName` varchar(80) NOT NULL,
	`country` varchar(100) NOT NULL,
	`schoolName` varchar(220) NOT NULL,
	`schoolType` varchar(80) NOT NULL,
	`schoolWebsite` varchar(320),
	`fieldOfStudy` varchar(180) NOT NULL,
	`educationLevel` varchar(120) NOT NULL,
	`motivation` text NOT NULL,
	`studentProofKey` varchar(420) NOT NULL,
	`identityProofKey` varchar(420) NOT NULL,
	`additionalProofKey` varchar(420),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studentApplications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `userPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`body` text NOT NULL,
	`attachmentKey` varchar(420),
	`attachmentName` varchar(220),
	`attachmentMime` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userPosts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`firstName` varchar(80),
	`lastName` varchar(80),
	`email` varchar(320),
	`gender` varchar(30),
	`phone` varchar(40),
	`country` varchar(100),
	`city` varchar(100),
	`address` varchar(240),
	`profession` varchar(140),
	`educationLevel` varchar(120),
	`university` varchar(240),
	`passwordHash` varchar(220),
	`emailVerified` int NOT NULL DEFAULT 0,
	`verificationCode` varchar(6),
	`verificationExpiresAt` timestamp,
	`resetCode` varchar(6),
	`resetExpiresAt` timestamp,
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`isActive` int NOT NULL DEFAULT 1,
	`studentAccessGranted` int NOT NULL DEFAULT 0,
	`studentAccessGrantedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
-- CREATE INDEX `articleComments_post` ON `articleComments` (`postId`);--> statement-breakpoint
-- CREATE INDEX `courseFiles_course` ON `courseFiles` (`courseId`);--> statement-breakpoint
-- CREATE INDEX `payments_provider_tx` ON `paymentRequests` (`providerTransactionId`);