-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COORDINATOR', 'GUARDIAN', 'COACH');

-- CreateEnum
CREATE TYPE "ClubRole" AS ENUM ('MANAGER', 'COORDINATOR', 'COACH', 'FINANCE');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('CLUB', 'SCHOOL', 'PROJECT', 'ACADEMY', 'PERSONAL_TRAINING');

-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('FOOTBALL', 'FUTSAL', 'BOTH');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CallUpStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'INFORMED');

-- CreateEnum
CREATE TYPE "CallUpMode" AS ENUM ('CONFIRMATION_REQUIRED', 'INFORMATION_ONLY');

-- CreateEnum
CREATE TYPE "MatchArrivalAttire" AS ENUM ('GAME_UNIFORM', 'TRAINING_UNIFORM');

-- CreateEnum
CREATE TYPE "MatchFootwearType" AS ENUM ('FIELD_CLEATS', 'SOCIETY_CLEATS', 'FUTSAL_SHOES');

-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('MONTHLY_FEE', 'REFEREE_FEE', 'TOURNAMENT', 'UNIFORM', 'TRAVEL', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('DISCONNECTED', 'PENDING', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('STARTER', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentProduct" AS ENUM ('PLAYER_PREMIUM_MONTHLY', 'PLAYER_FEATURED_ANNUAL', 'CLUB_ESSENTIAL_MONTHLY', 'CLUB_ESSENTIAL_ANNUAL', 'CLUB_PRO_MONTHLY', 'CLUB_PRO_ANNUAL', 'CLUB_ELITE_MONTHLY', 'CLUB_ELITE_ANNUAL');

-- CreateEnum
CREATE TYPE "AthleteEvaluationStatus" AS ENUM ('DRAFT', 'FINALIZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PerformanceArea" AS ENUM ('TECHNICAL', 'TACTICAL', 'PHYSICAL', 'COGNITIVE', 'EMOTIONAL', 'BEHAVIORAL', 'COMPETITIVE');

-- CreateEnum
CREATE TYPE "PerformanceAthleteRole" AS ENUM ('LINE_PLAYER', 'GOALKEEPER');

-- CreateEnum
CREATE TYPE "MatchSheetStatus" AS ENUM ('DRAFT', 'FINALIZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MatchParticipationStatus" AS ENUM ('CALLED_UP', 'RELATED', 'PRESENT', 'ABSENT', 'NOT_RELATED', 'INJURED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MatchLineupRole" AS ENUM ('STARTER', 'SUBSTITUTE', 'DID_NOT_PLAY');

-- CreateEnum
CREATE TYPE "MatchEventType" AS ENUM ('GOAL', 'ASSIST', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'INJURY', 'PENALTY', 'OWN_GOAL', 'OTHER');

-- CreateEnum
CREATE TYPE "MatchEventTeam" AS ENUM ('OURS', 'OPPONENT');

-- CreateEnum
CREATE TYPE "TrainingSessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrainingAttendanceStatus" AS ENUM ('PENDING', 'PRESENT', 'ABSENT', 'JUSTIFIED_ABSENCE', 'INJURED', 'EXCUSED', 'LATE', 'PARTIAL');

-- CreateEnum
CREATE TYPE "WellbeingEntrySource" AS ENUM ('CLUB', 'FAMILY', 'ATHLETE');

-- CreateEnum
CREATE TYPE "TrainingIntensity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "ExternalTrainingStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PerformanceGoalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'REVIEW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClubPermissionCode" AS ENUM ('DOCUMENTS_VIEW', 'DOCUMENTS_MANAGE', 'PERFORMANCE_VIEW', 'PERFORMANCE_MANAGE', 'PERFORMANCE_REPORT_GENERATE');

-- CreateEnum
CREATE TYPE "AthleteGuardianType" AS ENUM ('FATHER', 'MOTHER', 'LEGAL_GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "AthleteRegistrationRequestStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AthleteDocumentCategory" AS ENUM ('IDENTITY', 'MEDICAL_EXAM', 'MEDICAL_CLEARANCE', 'AUTHORIZATION', 'SPORTS_REGISTRATION', 'SCHOOL', 'OTHER');

-- CreateEnum
CREATE TYPE "AthleteDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AthleteDataAuditAction" AS ENUM ('VIEWED', 'CREATED', 'UPDATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'DOWNLOADED', 'DELETED', 'LINK_CREATED', 'LINK_REVOKED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicName" TEXT,
    "type" "OrganizationType" NOT NULL,
    "sport" "SportType" NOT NULL DEFAULT 'BOTH',
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "accentColor" TEXT DEFAULT '#9DDB16',
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "instagram" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "showAthletesPublicly" BOOLEAN NOT NULL DEFAULT true,
    "showStaffPublicly" BOOLEAN NOT NULL DEFAULT true,
    "showTrainingsPublicly" BOOLEAN NOT NULL DEFAULT true,
    "showMatchesPublicly" BOOLEAN NOT NULL DEFAULT true,
    "customDomain" TEXT,
    "domainVerified" BOOLEAN NOT NULL DEFAULT false,
    "whatsappStatus" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "whatsappPhone" TEXT,
    "paymentStatus" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "paymentProvider" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "panelTheme" TEXT NOT NULL DEFAULT 'DARK',
    "pixKey" TEXT,
    "publicBackground" TEXT DEFAULT '#080B0C',
    "publicTheme" TEXT NOT NULL DEFAULT 'DARK',
    "secondaryColor" TEXT DEFAULT '#FFFFFF',
    "taxId" TEXT,
    "coverOverlay" INTEGER NOT NULL DEFAULT 68,
    "coverPosition" TEXT NOT NULL DEFAULT 'CENTER',
    "accessStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "complimentaryReason" TEXT,
    "complimentaryUntil" TIMESTAMP(3),
    "documentStorageLimitBytes" BIGINT NOT NULL DEFAULT 1073741824,
    "documentStorageUsedBytes" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'COORDINATOR',
    "clubRole" "ClubRole",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubUserInvite" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubUserInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthYear" INTEGER,
    "description" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#9DDB16',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "photoUrl" TEXT,
    "bio" TEXT,
    "phone" TEXT,
    "professionalRegistration" TEXT,
    "education" TEXT,
    "specialties" TEXT,
    "joinedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "canManageCallUps" BOOLEAN NOT NULL DEFAULT false,
    "coachEmail" TEXT,
    "sport" "SportType" NOT NULL DEFAULT 'BOTH',

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "jerseyNumber" INTEGER,
    "position" TEXT,
    "dominantFoot" TEXT,
    "birthYear" INTEGER,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "guardianEmail" TEXT,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "guardianRelation" TEXT,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubUserPermissionOverride" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "ClubPermissionCode" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubUserPermissionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthletePrivateData" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "rgEncrypted" TEXT,
    "rgIssuerEncrypted" TEXT,
    "cpfEncrypted" TEXT,
    "nationality" TEXT,
    "naturality" TEXT,
    "email" TEXT,
    "instagram" TEXT,
    "bloodTypeEncrypted" TEXT,
    "allergiesEncrypted" TEXT,
    "medicationsEncrypted" TEXT,
    "healthConditionsEncrypted" TEXT,
    "medicalRestrictionsEncrypted" TEXT,
    "healthPlanEncrypted" TEXT,
    "healthPlanNumberEncrypted" TEXT,
    "emergencyContactNameEncrypted" TEXT,
    "emergencyContactPhoneEncrypted" TEXT,
    "emergencyContactRelationEncrypted" TEXT,
    "medicalNotesEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthletePrivateData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteGuardian" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "relation" "AthleteGuardianType" NOT NULL,
    "name" TEXT NOT NULL,
    "rgEncrypted" TEXT,
    "rgIssuerEncrypted" TEXT,
    "cpfEncrypted" TEXT,
    "nationality" TEXT,
    "naturality" TEXT,
    "maritalStatus" TEXT,
    "profession" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "neighborhood" TEXT,
    "postalCode" TEXT,
    "instagram" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "authorizedForPickup" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteRegistrationRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "reviewedByUserId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "AthleteRegistrationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "payloadEncrypted" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "guardianId" TEXT,
    "registrationRequestId" TEXT,
    "uploadedByUserId" TEXT,
    "reviewedByUserId" TEXT,
    "category" "AthleteDocumentCategory" NOT NULL,
    "requestItemKey" TEXT,
    "status" "AthleteDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'VERCEL_BLOB_PRIVATE',
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteDataAuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AthleteDataAuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadataJson" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteDataAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSchedule" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "recordedByUserId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "status" "TrainingSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAttendance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "recordedByUserId" TEXT,
    "status" "TrainingAttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "arrivedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "minutesPresent" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteEvaluation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "categoryId" TEXT,
    "evaluatorUserId" TEXT,
    "templateId" TEXT,
    "title" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "season" TEXT,
    "sport" "SportType" NOT NULL DEFAULT 'BOTH',
    "athleteRole" "PerformanceAthleteRole" NOT NULL DEFAULT 'LINE_PLAYER',
    "positionSnapshot" TEXT,
    "status" "AthleteEvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "strengths" TEXT,
    "developmentPoints" TEXT,
    "nextGoals" TEXT,
    "internalNotes" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteEvaluationScore" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "criterionId" TEXT,
    "area" "PerformanceArea" NOT NULL,
    "metricCode" TEXT NOT NULL,
    "metricLabel" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "ratingLabel" TEXT,
    "ratingDescription" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteEvaluationScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "athleteRole" "PerformanceAthleteRole" NOT NULL,
    "sport" "SportType" NOT NULL DEFAULT 'BOTH',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "systemDefault" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceCriterion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "area" "PerformanceArea" NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceCriterionLevel" (
    "id" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceCriterionLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthletePerformanceGoal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdByUserId" TEXT,
    "area" "PerformanceArea" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PerformanceGoalStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthletePerformanceGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteBodyMeasurement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "recordedByUserId" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heightCm" DECIMAL(6,2),
    "weightKg" DECIMAL(6,2),
    "bmi" DECIMAL(5,2),
    "wingspanCm" DECIMAL(6,2),
    "bodyFatPercent" DECIMAL(5,2),
    "muscleMassKg" DECIMAL(6,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteBodyMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteWellbeingEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "recordedByUserId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sleepHours" DECIMAL(4,2),
    "sleepQuality" INTEGER,
    "fatigueLevel" INTEGER,
    "energyLevel" INTEGER,
    "hasPain" BOOLEAN NOT NULL DEFAULT false,
    "painLevel" INTEGER,
    "painLocation" TEXT,
    "notes" TEXT,
    "source" "WellbeingEntrySource" NOT NULL DEFAULT 'CLUB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteWellbeingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteExternalTraining" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "recordedByUserId" TEXT,
    "activity" TEXT NOT NULL,
    "modality" TEXT,
    "providerName" TEXT,
    "weekdays" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "durationMinutes" INTEGER,
    "intensity" "TrainingIntensity",
    "objective" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" "ExternalTrainingStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteExternalTraining_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "evaluationId" TEXT,
    "generatedByUserId" TEXT,
    "title" TEXT NOT NULL,
    "includeScores" BOOLEAN NOT NULL DEFAULT true,
    "includeInternalNotes" BOOLEAN NOT NULL DEFAULT false,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "sport" "SportType" NOT NULL DEFAULT 'FOOTBALL',
    "callUpLimit" INTEGER NOT NULL DEFAULT 18,
    "callUpMode" "CallUpMode" NOT NULL DEFAULT 'CONFIRMATION_REQUIRED',
    "competition" TEXT,
    "round" TEXT,
    "opponent" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "homeAway" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "goalsFor" INTEGER,
    "goalsAgainst" INTEGER,
    "notes" TEXT,
    "presentationTime" TEXT,
    "uniform" TEXT,
    "arrivalAttire" "MatchArrivalAttire" NOT NULL DEFAULT 'GAME_UNIFORM',
    "sockRequirement" TEXT,
    "shinGuardsRequired" BOOLEAN NOT NULL DEFAULT true,
    "footwearType" "MatchFootwearType",
    "equipmentNotes" TEXT,
    "referee" TEXT,
    "assistantReferee" TEXT,
    "matchSheetNotes" TEXT,
    "formation" TEXT,
    "matchSheetStatus" "MatchSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchStaffAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchStaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "athleteId" TEXT,
    "type" "MatchEventType" NOT NULL,
    "team" "MatchEventTeam" NOT NULL DEFAULT 'OURS',
    "minute" INTEGER,
    "period" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchAthleteStat" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "recordedByUserId" TEXT,
    "participation" "MatchParticipationStatus" NOT NULL DEFAULT 'RELATED',
    "lineupRole" "MatchLineupRole",
    "enteredAtMinute" INTEGER,
    "leftAtMinute" INTEGER,
    "minutesPlayed" INTEGER,
    "positionPlayed" TEXT,
    "jerseyNumber" INTEGER,
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "lineupOrder" INTEGER,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCards" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchAthleteStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallUp" (
    "id" TEXT NOT NULL,
    "status" "CallUpStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "responseToken" TEXT,
    "responseSource" TEXT,
    "responseByName" TEXT,
    "responseHistory" JSONB,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Charge" (
    "id" TEXT NOT NULL,
    "type" "ChargeType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amountCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "externalId" TEXT,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "matchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "plan" "PlanCode" NOT NULL DEFAULT 'STARTER',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trialEnds" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billingCycle" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "provider" TEXT,
    "providerSubscriptionId" TEXT,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "referredByCoachId" TEXT,

    CONSTRAINT "GuardianProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerProfile" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "birthYear" INTEGER,
    "position" TEXT,
    "dominantFoot" TEXT,
    "height" TEXT,
    "currentClub" TEXT,
    "photoUrl" TEXT,
    "bio" TEXT,
    "instagram" TEXT,
    "videos" TEXT,
    "gallery" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "guardianId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "achievements" TEXT,
    "assists" INTEGER,
    "careerHistory" TEXT,
    "coverUrl" TEXT,
    "goals" INTEGER,
    "matches" INTEGER,
    "nationality" TEXT,
    "secondaryPosition" TEXT,
    "template" TEXT NOT NULL DEFAULT 'FREE_CLEAN',
    "titles" INTEGER,
    "weight" TEXT,
    "categoryLabel" TEXT,
    "complimentaryReason" TEXT,
    "complimentaryUntil" TIMESTAMP(3),
    "directoryVisible" BOOLEAN NOT NULL DEFAULT false,
    "isComplimentary" BOOLEAN NOT NULL DEFAULT false,
    "jerseyNumber" INTEGER,
    "modality" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "planStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "premiumUntil" TIMESTAMP(3),
    "websiteUrl" TEXT,
    "featuredUntil" TIMESTAMP(3),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAthleteLink" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAthleteLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qtr" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "dataJson" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qtr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "professionalName" TEXT,
    "photoUrl" TEXT,
    "coverUrl" TEXT,
    "roleTitle" TEXT,
    "currentClub" TEXT,
    "categories" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "nationality" TEXT,
    "bio" TEXT,
    "experience" TEXT,
    "clubsHistory" TEXT,
    "licenses" TEXT,
    "education" TEXT,
    "languages" TEXT,
    "achievements" TEXT,
    "methodology" TEXT,
    "youtubeUrl" TEXT,
    "instagramUrl" TEXT,
    "linkedinUrl" TEXT,
    "contactEmail" TEXT,
    "directoryVisible" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "featuredUntil" TIMESTAMP(3),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "managedOrganizationType" "OrganizationType",
    "managesOrganization" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteMembership" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "sport" "SportType" NOT NULL DEFAULT 'BOTH',
    "teamLabel" TEXT,
    "competitionType" TEXT,
    "season" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachOrganizationAccess" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "sport" "SportType" NOT NULL DEFAULT 'BOTH',
    "roleTitle" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "canViewRoster" BOOLEAN NOT NULL DEFAULT true,
    "canViewSchedule" BOOLEAN NOT NULL DEFAULT true,
    "canViewCallUps" BOOLEAN NOT NULL DEFAULT true,
    "canManageCallUps" BOOLEAN NOT NULL DEFAULT false,
    "canViewPerformance" BOOLEAN NOT NULL DEFAULT false,
    "canManagePerformance" BOOLEAN NOT NULL DEFAULT false,
    "canGeneratePerformanceReports" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestedBy" TEXT NOT NULL DEFAULT 'CLUB',

    CONSTRAINT "CoachOrganizationAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT,
    "product" "PaymentProduct" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT NOT NULL DEFAULT 'PIX',
    "amountCents" INTEGER NOT NULL,
    "pixTxid" TEXT NOT NULL,
    "pixPayload" TEXT,
    "pixKeySnapshot" TEXT,
    "note" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubUserInvite_tokenHash_key" ON "ClubUserInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "ClubUserInvite_userId_idx" ON "ClubUserInvite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Category_organizationId_idx" ON "Category"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_organizationId_name_key" ON "Category"("organizationId", "name");

-- CreateIndex
CREATE INDEX "StaffMember_organizationId_idx" ON "StaffMember"("organizationId");

-- CreateIndex
CREATE INDEX "StaffMember_categoryId_idx" ON "StaffMember"("categoryId");

-- CreateIndex
CREATE INDEX "Athlete_organizationId_idx" ON "Athlete"("organizationId");

-- CreateIndex
CREATE INDEX "Athlete_categoryId_idx" ON "Athlete"("categoryId");

-- CreateIndex
CREATE INDEX "Athlete_name_idx" ON "Athlete"("name");

-- CreateIndex
CREATE INDEX "ClubUserPermissionOverride_organizationId_permission_idx" ON "ClubUserPermissionOverride"("organizationId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "ClubUserPermissionOverride_userId_permission_key" ON "ClubUserPermissionOverride"("userId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "AthletePrivateData_athleteId_key" ON "AthletePrivateData"("athleteId");

-- CreateIndex
CREATE INDEX "AthleteGuardian_athleteId_relation_idx" ON "AthleteGuardian"("athleteId", "relation");

-- CreateIndex
CREATE INDEX "AthleteGuardian_athleteId_isPrimary_idx" ON "AthleteGuardian"("athleteId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteRegistrationRequest_tokenHash_key" ON "AthleteRegistrationRequest"("tokenHash");

-- CreateIndex
CREATE INDEX "AthleteRegistrationRequest_organizationId_status_createdAt_idx" ON "AthleteRegistrationRequest"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AthleteRegistrationRequest_athleteId_status_idx" ON "AthleteRegistrationRequest"("athleteId", "status");

-- CreateIndex
CREATE INDEX "AthleteRegistrationRequest_expiresAt_idx" ON "AthleteRegistrationRequest"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteDocument_storageKey_key" ON "AthleteDocument"("storageKey");

-- CreateIndex
CREATE INDEX "AthleteDocument_organizationId_athleteId_category_idx" ON "AthleteDocument"("organizationId", "athleteId", "category");

-- CreateIndex
CREATE INDEX "AthleteDocument_guardianId_category_idx" ON "AthleteDocument"("guardianId", "category");

-- CreateIndex
CREATE INDEX "AthleteDocument_athleteId_status_idx" ON "AthleteDocument"("athleteId", "status");

-- CreateIndex
CREATE INDEX "AthleteDocument_expiresAt_idx" ON "AthleteDocument"("expiresAt");

-- CreateIndex
CREATE INDEX "AthleteDocument_registrationRequestId_idx" ON "AthleteDocument"("registrationRequestId");

-- CreateIndex
CREATE INDEX "AthleteDocument_registrationRequestId_requestItemKey_idx" ON "AthleteDocument"("registrationRequestId", "requestItemKey");

-- CreateIndex
CREATE INDEX "AthleteDataAuditLog_organizationId_createdAt_idx" ON "AthleteDataAuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AthleteDataAuditLog_athleteId_createdAt_idx" ON "AthleteDataAuditLog"("athleteId", "createdAt");

-- CreateIndex
CREATE INDEX "AthleteDataAuditLog_actorUserId_createdAt_idx" ON "AthleteDataAuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "TrainingSchedule_organizationId_idx" ON "TrainingSchedule"("organizationId");

-- CreateIndex
CREATE INDEX "TrainingSchedule_categoryId_idx" ON "TrainingSchedule"("categoryId");

-- CreateIndex
CREATE INDEX "TrainingSchedule_organizationId_date_idx" ON "TrainingSchedule"("organizationId", "date");

-- CreateIndex
CREATE INDEX "TrainingSession_organizationId_startsAt_idx" ON "TrainingSession"("organizationId", "startsAt");

-- CreateIndex
CREATE INDEX "TrainingSession_categoryId_startsAt_idx" ON "TrainingSession"("categoryId", "startsAt");

-- CreateIndex
CREATE INDEX "TrainingSession_scheduleId_idx" ON "TrainingSession"("scheduleId");

-- CreateIndex
CREATE INDEX "TrainingSession_recordedByUserId_idx" ON "TrainingSession"("recordedByUserId");

-- CreateIndex
CREATE INDEX "TrainingAttendance_organizationId_athleteId_idx" ON "TrainingAttendance"("organizationId", "athleteId");

-- CreateIndex
CREATE INDEX "TrainingAttendance_athleteId_status_idx" ON "TrainingAttendance"("athleteId", "status");

-- CreateIndex
CREATE INDEX "TrainingAttendance_recordedByUserId_idx" ON "TrainingAttendance"("recordedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingAttendance_sessionId_athleteId_key" ON "TrainingAttendance"("sessionId", "athleteId");

-- CreateIndex
CREATE INDEX "AthleteEvaluation_organizationId_athleteId_evaluatedAt_idx" ON "AthleteEvaluation"("organizationId", "athleteId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "AthleteEvaluation_categoryId_evaluatedAt_idx" ON "AthleteEvaluation"("categoryId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "AthleteEvaluation_evaluatorUserId_idx" ON "AthleteEvaluation"("evaluatorUserId");

-- CreateIndex
CREATE INDEX "AthleteEvaluation_templateId_idx" ON "AthleteEvaluation"("templateId");

-- CreateIndex
CREATE INDEX "AthleteEvaluation_status_idx" ON "AthleteEvaluation"("status");

-- CreateIndex
CREATE INDEX "AthleteEvaluationScore_evaluationId_area_idx" ON "AthleteEvaluationScore"("evaluationId", "area");

-- CreateIndex
CREATE INDEX "AthleteEvaluationScore_criterionId_idx" ON "AthleteEvaluationScore"("criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteEvaluationScore_evaluationId_metricCode_key" ON "AthleteEvaluationScore"("evaluationId", "metricCode");

-- CreateIndex
CREATE INDEX "PerformanceTemplate_organizationId_active_idx" ON "PerformanceTemplate"("organizationId", "active");

-- CreateIndex
CREATE INDEX "PerformanceTemplate_athleteRole_sport_active_idx" ON "PerformanceTemplate"("athleteRole", "sport", "active");

-- CreateIndex
CREATE INDEX "PerformanceCriterion_templateId_area_sortOrder_idx" ON "PerformanceCriterion"("templateId", "area", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceCriterion_templateId_code_key" ON "PerformanceCriterion"("templateId", "code");

-- CreateIndex
CREATE INDEX "PerformanceCriterionLevel_criterionId_idx" ON "PerformanceCriterionLevel"("criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceCriterionLevel_criterionId_score_key" ON "PerformanceCriterionLevel"("criterionId", "score");

-- CreateIndex
CREATE INDEX "AthletePerformanceGoal_organizationId_athleteId_status_idx" ON "AthletePerformanceGoal"("organizationId", "athleteId", "status");

-- CreateIndex
CREATE INDEX "AthletePerformanceGoal_categoryId_idx" ON "AthletePerformanceGoal"("categoryId");

-- CreateIndex
CREATE INDEX "AthletePerformanceGoal_createdByUserId_idx" ON "AthletePerformanceGoal"("createdByUserId");

-- CreateIndex
CREATE INDEX "AthleteBodyMeasurement_organizationId_athleteId_measuredAt_idx" ON "AthleteBodyMeasurement"("organizationId", "athleteId", "measuredAt");

-- CreateIndex
CREATE INDEX "AthleteBodyMeasurement_athleteId_measuredAt_idx" ON "AthleteBodyMeasurement"("athleteId", "measuredAt");

-- CreateIndex
CREATE INDEX "AthleteBodyMeasurement_recordedByUserId_idx" ON "AthleteBodyMeasurement"("recordedByUserId");

-- CreateIndex
CREATE INDEX "AthleteWellbeingEntry_organizationId_athleteId_recordedAt_idx" ON "AthleteWellbeingEntry"("organizationId", "athleteId", "recordedAt");

-- CreateIndex
CREATE INDEX "AthleteWellbeingEntry_athleteId_recordedAt_idx" ON "AthleteWellbeingEntry"("athleteId", "recordedAt");

-- CreateIndex
CREATE INDEX "AthleteWellbeingEntry_recordedByUserId_idx" ON "AthleteWellbeingEntry"("recordedByUserId");

-- CreateIndex
CREATE INDEX "AthleteExternalTraining_organizationId_athleteId_status_idx" ON "AthleteExternalTraining"("organizationId", "athleteId", "status");

-- CreateIndex
CREATE INDEX "AthleteExternalTraining_athleteId_startsAt_idx" ON "AthleteExternalTraining"("athleteId", "startsAt");

-- CreateIndex
CREATE INDEX "AthleteExternalTraining_recordedByUserId_idx" ON "AthleteExternalTraining"("recordedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceReport_tokenHash_key" ON "PerformanceReport"("tokenHash");

-- CreateIndex
CREATE INDEX "PerformanceReport_organizationId_athleteId_createdAt_idx" ON "PerformanceReport"("organizationId", "athleteId", "createdAt");

-- CreateIndex
CREATE INDEX "PerformanceReport_evaluationId_idx" ON "PerformanceReport"("evaluationId");

-- CreateIndex
CREATE INDEX "PerformanceReport_generatedByUserId_idx" ON "PerformanceReport"("generatedByUserId");

-- CreateIndex
CREATE INDEX "PerformanceReport_expiresAt_idx" ON "PerformanceReport"("expiresAt");

-- CreateIndex
CREATE INDEX "Match_organizationId_startsAt_idx" ON "Match"("organizationId", "startsAt");

-- CreateIndex
CREATE INDEX "Match_categoryId_startsAt_idx" ON "Match"("categoryId", "startsAt");

-- CreateIndex
CREATE INDEX "MatchStaffAssignment_organizationId_matchId_idx" ON "MatchStaffAssignment"("organizationId", "matchId");

-- CreateIndex
CREATE INDEX "MatchStaffAssignment_staffMemberId_idx" ON "MatchStaffAssignment"("staffMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchStaffAssignment_matchId_staffMemberId_key" ON "MatchStaffAssignment"("matchId", "staffMemberId");

-- CreateIndex
CREATE INDEX "MatchEvent_organizationId_matchId_createdAt_idx" ON "MatchEvent"("organizationId", "matchId", "createdAt");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_minute_idx" ON "MatchEvent"("matchId", "minute");

-- CreateIndex
CREATE INDEX "MatchEvent_athleteId_idx" ON "MatchEvent"("athleteId");

-- CreateIndex
CREATE INDEX "MatchAthleteStat_organizationId_athleteId_idx" ON "MatchAthleteStat"("organizationId", "athleteId");

-- CreateIndex
CREATE INDEX "MatchAthleteStat_athleteId_participation_idx" ON "MatchAthleteStat"("athleteId", "participation");

-- CreateIndex
CREATE INDEX "MatchAthleteStat_recordedByUserId_idx" ON "MatchAthleteStat"("recordedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchAthleteStat_matchId_athleteId_key" ON "MatchAthleteStat"("matchId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "CallUp_responseToken_key" ON "CallUp"("responseToken");

-- CreateIndex
CREATE INDEX "CallUp_organizationId_idx" ON "CallUp"("organizationId");

-- CreateIndex
CREATE INDEX "CallUp_matchId_idx" ON "CallUp"("matchId");

-- CreateIndex
CREATE INDEX "CallUp_athleteId_idx" ON "CallUp"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "CallUp_matchId_athleteId_key" ON "CallUp"("matchId", "athleteId");

-- CreateIndex
CREATE INDEX "Charge_organizationId_idx" ON "Charge"("organizationId");

-- CreateIndex
CREATE INDEX "Charge_athleteId_idx" ON "Charge"("athleteId");

-- CreateIndex
CREATE INDEX "Charge_matchId_idx" ON "Charge"("matchId");

-- CreateIndex
CREATE INDEX "Charge_status_idx" ON "Charge"("status");

-- CreateIndex
CREATE INDEX "Charge_dueDate_idx" ON "Charge"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianProfile_userId_key" ON "GuardianProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_slug_key" ON "PlayerProfile"("slug");

-- CreateIndex
CREATE INDEX "PlayerProfile_guardianId_idx" ON "PlayerProfile"("guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAthleteLink_playerId_athleteId_key" ON "PlayerAthleteLink"("playerId", "athleteId");

-- CreateIndex
CREATE INDEX "Qtr_organizationId_weekStart_idx" ON "Qtr"("organizationId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "Qtr_organizationId_weekStart_key" ON "Qtr"("organizationId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_ownerUserId_key" ON "CoachProfile"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_slug_key" ON "CoachProfile"("slug");

-- CreateIndex
CREATE INDEX "CoachProfile_directoryVisible_isPublic_idx" ON "CoachProfile"("directoryVisible", "isPublic");

-- CreateIndex
CREATE INDEX "CoachProfile_roleTitle_idx" ON "CoachProfile"("roleTitle");

-- CreateIndex
CREATE INDEX "CoachProfile_currentClub_idx" ON "CoachProfile"("currentClub");

-- CreateIndex
CREATE INDEX "AthleteMembership_athleteId_idx" ON "AthleteMembership"("athleteId");

-- CreateIndex
CREATE INDEX "AthleteMembership_organizationId_categoryId_idx" ON "AthleteMembership"("organizationId", "categoryId");

-- CreateIndex
CREATE INDEX "AthleteMembership_status_idx" ON "AthleteMembership"("status");

-- CreateIndex
CREATE INDEX "CoachOrganizationAccess_coachId_active_idx" ON "CoachOrganizationAccess"("coachId", "active");

-- CreateIndex
CREATE INDEX "CoachOrganizationAccess_organizationId_categoryId_idx" ON "CoachOrganizationAccess"("organizationId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachOrganizationAccess_coachId_organizationId_categoryId_s_key" ON "CoachOrganizationAccess"("coachId", "organizationId", "categoryId", "sport");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_pixTxid_key" ON "Payment"("pixTxid");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_idx" ON "Payment"("organizationId");

-- CreateIndex
CREATE INDEX "Payment_playerId_idx" ON "Payment"("playerId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubUserInvite" ADD CONSTRAINT "ClubUserInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubUserPermissionOverride" ADD CONSTRAINT "ClubUserPermissionOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubUserPermissionOverride" ADD CONSTRAINT "ClubUserPermissionOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePrivateData" ADD CONSTRAINT "AthletePrivateData_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteGuardian" ADD CONSTRAINT "AthleteGuardian_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteRegistrationRequest" ADD CONSTRAINT "AthleteRegistrationRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteRegistrationRequest" ADD CONSTRAINT "AthleteRegistrationRequest_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteRegistrationRequest" ADD CONSTRAINT "AthleteRegistrationRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteRegistrationRequest" ADD CONSTRAINT "AthleteRegistrationRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteDocument" ADD CONSTRAINT "AthleteDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteDocument" ADD CONSTRAINT "AthleteDocument_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteDocument" ADD CONSTRAINT "AthleteDocument_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "AthleteGuardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteDocument" ADD CONSTRAINT "AthleteDocument_registrationRequestId_fkey" FOREIGN KEY ("registrationRequestId") REFERENCES "AthleteRegistrationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteDocument" ADD CONSTRAINT "AthleteDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteDocument" ADD CONSTRAINT "AthleteDocument_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteDataAuditLog" ADD CONSTRAINT "AthleteDataAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteDataAuditLog" ADD CONSTRAINT "AthleteDataAuditLog_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteDataAuditLog" ADD CONSTRAINT "AthleteDataAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSchedule" ADD CONSTRAINT "TrainingSchedule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSchedule" ADD CONSTRAINT "TrainingSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TrainingSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAttendance" ADD CONSTRAINT "TrainingAttendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAttendance" ADD CONSTRAINT "TrainingAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAttendance" ADD CONSTRAINT "TrainingAttendance_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAttendance" ADD CONSTRAINT "TrainingAttendance_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEvaluation" ADD CONSTRAINT "AthleteEvaluation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEvaluation" ADD CONSTRAINT "AthleteEvaluation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEvaluation" ADD CONSTRAINT "AthleteEvaluation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEvaluation" ADD CONSTRAINT "AthleteEvaluation_evaluatorUserId_fkey" FOREIGN KEY ("evaluatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEvaluation" ADD CONSTRAINT "AthleteEvaluation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PerformanceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEvaluationScore" ADD CONSTRAINT "AthleteEvaluationScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "AthleteEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEvaluationScore" ADD CONSTRAINT "AthleteEvaluationScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "PerformanceCriterion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceTemplate" ADD CONSTRAINT "PerformanceTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceCriterion" ADD CONSTRAINT "PerformanceCriterion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PerformanceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceCriterionLevel" ADD CONSTRAINT "PerformanceCriterionLevel_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "PerformanceCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePerformanceGoal" ADD CONSTRAINT "AthletePerformanceGoal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePerformanceGoal" ADD CONSTRAINT "AthletePerformanceGoal_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePerformanceGoal" ADD CONSTRAINT "AthletePerformanceGoal_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePerformanceGoal" ADD CONSTRAINT "AthletePerformanceGoal_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteBodyMeasurement" ADD CONSTRAINT "AthleteBodyMeasurement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteBodyMeasurement" ADD CONSTRAINT "AthleteBodyMeasurement_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteBodyMeasurement" ADD CONSTRAINT "AthleteBodyMeasurement_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteWellbeingEntry" ADD CONSTRAINT "AthleteWellbeingEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteWellbeingEntry" ADD CONSTRAINT "AthleteWellbeingEntry_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteWellbeingEntry" ADD CONSTRAINT "AthleteWellbeingEntry_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteExternalTraining" ADD CONSTRAINT "AthleteExternalTraining_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteExternalTraining" ADD CONSTRAINT "AthleteExternalTraining_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteExternalTraining" ADD CONSTRAINT "AthleteExternalTraining_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReport" ADD CONSTRAINT "PerformanceReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReport" ADD CONSTRAINT "PerformanceReport_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReport" ADD CONSTRAINT "PerformanceReport_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "AthleteEvaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReport" ADD CONSTRAINT "PerformanceReport_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchStaffAssignment" ADD CONSTRAINT "MatchStaffAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchStaffAssignment" ADD CONSTRAINT "MatchStaffAssignment_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchStaffAssignment" ADD CONSTRAINT "MatchStaffAssignment_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAthleteStat" ADD CONSTRAINT "MatchAthleteStat_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAthleteStat" ADD CONSTRAINT "MatchAthleteStat_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAthleteStat" ADD CONSTRAINT "MatchAthleteStat_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAthleteStat" ADD CONSTRAINT "MatchAthleteStat_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallUp" ADD CONSTRAINT "CallUp_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallUp" ADD CONSTRAINT "CallUp_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallUp" ADD CONSTRAINT "CallUp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianProfile" ADD CONSTRAINT "GuardianProfile_referredByCoachId_fkey" FOREIGN KEY ("referredByCoachId") REFERENCES "CoachProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianProfile" ADD CONSTRAINT "GuardianProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "GuardianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAthleteLink" ADD CONSTRAINT "PlayerAthleteLink_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAthleteLink" ADD CONSTRAINT "PlayerAthleteLink_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qtr" ADD CONSTRAINT "Qtr_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteMembership" ADD CONSTRAINT "AthleteMembership_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteMembership" ADD CONSTRAINT "AthleteMembership_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteMembership" ADD CONSTRAINT "AthleteMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachOrganizationAccess" ADD CONSTRAINT "CoachOrganizationAccess_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachOrganizationAccess" ADD CONSTRAINT "CoachOrganizationAccess_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachOrganizationAccess" ADD CONSTRAINT "CoachOrganizationAccess_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
