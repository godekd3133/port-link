/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `Profile` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Profession" AS ENUM ('DEVELOPER', 'DESIGNER', 'PM', 'MARKETER', 'DATA_ANALYST', 'CONTENT_CREATOR', 'WRITER', 'PHOTOGRAPHER', 'VIDEO_CREATOR', 'MUSICIAN', 'PLANNER', 'RESEARCHER', 'CONSULTANT', 'EDUCATOR', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectCategory" AS ENUM ('WEB_APP', 'MOBILE_APP', 'DESIGN', 'BRANDING', 'MARKETING', 'VIDEO', 'PHOTOGRAPHY', 'MUSIC', 'WRITING', 'RESEARCH', 'DATA_ANALYSIS', 'CASE_STUDY', 'PRESENTATION', 'GAME', 'HARDWARE', 'OTHER');

-- CreateEnum
CREATE TYPE "CollaborationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "behanceUrl" TEXT,
ADD COLUMN     "category" "ProjectCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "figmaUrl" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTeamProject" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "media" TEXT[],
ADD COLUMN     "projectEndDate" TIMESTAMP(3),
ADD COLUMN     "projectStartDate" TIMESTAMP(3),
ADD COLUMN     "skills" TEXT[],
ADD COLUMN     "youtubeUrl" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "behanceUrl" TEXT,
ADD COLUMN     "dribbbleUrl" TEXT,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "isOpenToCollaborate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isOpenToWork" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notionUrl" TEXT,
ADD COLUMN     "profession" "Profession" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "secondaryProfession" "Profession",
ADD COLUMN     "skills" TEXT[],
ADD COLUMN     "twitterUrl" TEXT,
ADD COLUMN     "username" TEXT NOT NULL,
ADD COLUMN     "yearsOfExperience" INTEGER,
ADD COLUMN     "youtubeUrl" TEXT;

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mention" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectContributor" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "profession" "Profession" NOT NULL,
    "contribution" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectContributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillSuggestion" (
    "id" TEXT NOT NULL,
    "profession" "Profession" NOT NULL,
    "skillName" TEXT NOT NULL,
    "category" TEXT,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollaborationRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "postId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "proposedRole" TEXT,
    "status" "CollaborationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollaborationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "Mention_authorId_idx" ON "Mention"("authorId");

-- CreateIndex
CREATE INDEX "Mention_mentionedUserId_idx" ON "Mention"("mentionedUserId");

-- CreateIndex
CREATE INDEX "Mention_postId_idx" ON "Mention"("postId");

-- CreateIndex
CREATE INDEX "Mention_commentId_idx" ON "Mention"("commentId");

-- CreateIndex
CREATE INDEX "ProjectContributor_postId_idx" ON "ProjectContributor"("postId");

-- CreateIndex
CREATE INDEX "ProjectContributor_profileId_idx" ON "ProjectContributor"("profileId");

-- CreateIndex
CREATE INDEX "ProjectContributor_profession_idx" ON "ProjectContributor"("profession");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectContributor_postId_profileId_key" ON "ProjectContributor"("postId", "profileId");

-- CreateIndex
CREATE INDEX "SkillSuggestion_profession_idx" ON "SkillSuggestion"("profession");

-- CreateIndex
CREATE INDEX "SkillSuggestion_isPopular_idx" ON "SkillSuggestion"("isPopular");

-- CreateIndex
CREATE UNIQUE INDEX "SkillSuggestion_profession_skillName_key" ON "SkillSuggestion"("profession", "skillName");

-- CreateIndex
CREATE INDEX "CollaborationRequest_senderId_idx" ON "CollaborationRequest"("senderId");

-- CreateIndex
CREATE INDEX "CollaborationRequest_receiverId_idx" ON "CollaborationRequest"("receiverId");

-- CreateIndex
CREATE INDEX "CollaborationRequest_status_idx" ON "CollaborationRequest"("status");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Post_category_idx" ON "Post"("category");

-- CreateIndex
CREATE INDEX "Post_isFeatured_idx" ON "Post"("isFeatured");

-- CreateIndex
CREATE INDEX "Post_skills_idx" ON "Post"("skills");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_username_key" ON "Profile"("username");

-- CreateIndex
CREATE INDEX "Profile_username_idx" ON "Profile"("username");

-- CreateIndex
CREATE INDEX "Profile_profession_idx" ON "Profile"("profession");

-- CreateIndex
CREATE INDEX "Profile_isOpenToWork_idx" ON "Profile"("isOpenToWork");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContributor" ADD CONSTRAINT "ProjectContributor_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContributor" ADD CONSTRAINT "ProjectContributor_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
