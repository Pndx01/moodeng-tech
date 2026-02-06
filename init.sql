-- MySQL initialization script for Moodeng Tech
-- This runs when the Docker MySQL container is first created

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS moodeng_tech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant privileges
GRANT ALL PRIVILEGES ON moodeng_tech.* TO 'moodeng'@'%';
FLUSH PRIVILEGES;

USE moodeng_tech;

-- The actual schema will be created by Prisma migrations
-- This file is just for initial database setup
