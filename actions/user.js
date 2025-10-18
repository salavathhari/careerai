"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";

export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    // Start a transaction to handle both operations
    const result = await db.$transaction(
      async (tx) => {
        // First check if industry exists
        let industryInsight = await tx.industryInsight.findUnique({
          where: {
            industry: data.industry,
          },
        });

        // If industry doesn't exist, create it with default values
        if (!industryInsight) {
          const insights = await generateAIInsights(data.industry);

          industryInsight = await tx.industryInsight.create({
            data: {
              industry: data.industry,
              salaryRanges:[],
              growthRate:0,
              demandLevel:"Medium",
              topSkills:[],
              marketOutlook:"Neutral",
              keyTrends:[],
              recommendedSkills:[],
              
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
            },
          });
        }

        // Now update the user → save `industryId` not `industry`
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industryId: industryInsight.id,
            experience: data.experience,
            bio: data.bio,
            skills: data.skills,
          },
        });

        return { updatedUser, industryInsight };
      },
      {
        timeout: 10000, // default: 5000
      }
    );

    revalidatePath("/");
    return result.updatedUser; // return updated user
  } catch (error) {
    console.error("Error updating user and industry:", error.message);
    throw new Error("Failed to update profile");
  }
}

export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industryId: true,
      industryInsight: {
        select: { industry: true },
      },
    },
  });

  if (!user) throw new Error("User not found");

  return {
    isOnboarded: !!user.industryId,
    industry: user.industryInsight?.industry || null,
  };
}
